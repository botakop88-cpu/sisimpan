import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";

/**
 * GET /api/files/[id]/download
 * Balikan manifest: nama file, checksum, dan daftar bagian (tiap bagian
 * dengan remote_file_id + access token akun terkait) supaya BROWSER yang
 * download langsung dari Drive dan gabungkan sendiri -- server kita tidak
 * pernah menyentuh bytes file (sama prinsipnya dengan upload di M3).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id, name, mime_type, original_size, checksum_sha256, status")
    .eq("id", id)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (file.status !== "ready") {
    return NextResponse.json(
      { error: "file_not_ready", message: "File belum selesai diupload sepenuhnya" },
      { status: 409 }
    );
  }

  const { data: chunks, error: chunksError } = await supabase
    .from("file_chunks")
    .select("chunk_index, chunk_size, cloud_account_id, remote_file_id")
    .eq("file_id", id)
    .eq("status", "ok")
    .order("chunk_index", { ascending: true });

  if (chunksError || !chunks || chunks.length === 0) {
    return NextResponse.json({ error: "Bagian file tidak ditemukan" }, { status: 404 });
  }

  const parts = await Promise.all(
    chunks.map(async (c) => ({
      chunkIndex: c.chunk_index,
      size: c.chunk_size,
      remoteFileId: c.remote_file_id,
      accessToken: await ensureValidAccessToken(c.cloud_account_id),
    }))
  );

  await logActivity(supabase, user.id, "download", id, { name: file.name, size: file.original_size });

  return NextResponse.json({
    name: file.name,
    mimeType: file.mime_type,
    originalSize: file.original_size,
    checksumSha256: file.checksum_sha256,
    parts,
  });
}
