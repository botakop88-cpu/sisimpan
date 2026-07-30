import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/files/[id]/chunks
 * Body: { chunkIndex, chunkSize, checksumSha256, cloudAccountId, remoteFileId, status? }
 *
 * Dipanggil client SETELAH satu bagian file selesai diupload langsung ke
 * Google Drive (browser -> Drive). Endpoint ini cuma simpan metadata --
 * TIDAK pernah menerima bytes file (sesuai prinsip file tidak lewat server).
 *
 * Efek samping:
 * - Update cloud_accounts.storage_used (+chunkSize) supaya kapasitas
 *   yang tercatat selalu up to date tanpa perlu sync-quota manual tiap saat.
 * - Kalau status='failed' dikirim: langsung tandai file 'partial_failed'
 *   (lihat 04_Analisis_Risiko_Teknis.md poin 7).
 * - Kalau semua chunk sudah lengkap (jumlah baris = files.chunk_count)
 *   dan tidak ada yang gagal: tandai file 'ready'.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const {
    chunkIndex,
    chunkSize,
    checksumSha256,
    cloudAccountId,
    remoteFileId,
    status = "ok",
  } = body ?? {};

  if (
    typeof chunkIndex !== "number" ||
    typeof chunkSize !== "number" ||
    !checksumSha256 ||
    !cloudAccountId ||
    !remoteFileId
  ) {
    return NextResponse.json({ error: "Data chunk tidak lengkap" }, { status: 400 });
  }

  // Pastikan file ini memang milik user yang login (RLS juga menjaga ini,
  // tapi kita perlu chunk_count-nya sekalian untuk cek kelengkapan di bawah).
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id, chunk_count, status")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (status === "failed") {
    await supabase.from("files").update({ status: "partial_failed" }).eq("id", fileId);
    return NextResponse.json({ success: true, fileStatus: "partial_failed" });
  }

  const { error: chunkError } = await supabase.from("file_chunks").insert({
    file_id: fileId,
    chunk_index: chunkIndex,
    chunk_size: chunkSize,
    checksum_sha256: checksumSha256,
    cloud_account_id: cloudAccountId,
    remote_file_id: remoteFileId,
    status: "ok",
  });

  if (chunkError) {
    // Kemungkinan besar client retry kirim chunk yang sama 2x -- anggap
    // bukan error fatal, lanjut cek kelengkapan seperti biasa.
    console.warn("Insert file_chunks warning:", chunkError.message);
  }

  // Update kapasitas terpakai akun ini. RLS cloud_accounts_owner_all sudah
  // mengizinkan user update baris miliknya sendiri, jadi tidak perlu admin client.
  const { data: account } = await supabase
    .from("cloud_accounts")
    .select("storage_used")
    .eq("id", cloudAccountId)
    .single();

  if (account) {
    await supabase
      .from("cloud_accounts")
      .update({ storage_used: account.storage_used + chunkSize, updated_at: new Date().toISOString() })
      .eq("id", cloudAccountId);
  }

  // Cek kelengkapan: sudah berapa chunk 'ok' yang tercatat untuk file ini?
  const { count: okCount } = await supabase
    .from("file_chunks")
    .select("id", { count: "exact", head: true })
    .eq("file_id", fileId)
    .eq("status", "ok");

  let fileStatus = file.status;
  if (okCount !== null && okCount >= file.chunk_count && file.status === "uploading") {
    fileStatus = "ready";
    await supabase.from("files").update({ status: "ready" }).eq("id", fileId);
  }

  return NextResponse.json({ success: true, fileStatus, chunksRecorded: okCount });
}
