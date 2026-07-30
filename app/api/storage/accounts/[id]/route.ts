import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/storage/accounts/[id]
 * Putuskan koneksi akun cloud. Catatan: ini HANYA hapus baris di DB kita
 * (dan sebaiknya juga revoke token di sisi Google -- lihat TODO di bawah).
 * Chunk file yang sudah terlanjur ada di akun ini TIDAK ikut terhapus di
 * sini -- itu perlu alur migrasi terpisah (lihat 04_Analisis_Risiko_Teknis.md
 * poin 3, soal ketergantungan akun pribadi).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cek dulu chunk apa saja yang masih bergantung ke akun ini, supaya user
  // diberi peringatan -- bukan langsung dihapus diam-diam kalau ada file
  // yang jadi tidak bisa diakses.
  const { count: dependentChunks } = await supabase
    .from("file_chunks")
    .select("id", { count: "exact", head: true })
    .eq("cloud_account_id", id);

  if (dependentChunks && dependentChunks > 0) {
    return NextResponse.json(
      {
        error: "account_has_dependent_chunks",
        message: `Akun ini masih menyimpan ${dependentChunks} bagian file. Migrasikan dulu sebelum diputus.`,
        dependentChunks,
      },
      { status: 409 }
    );
  }

  // RLS memastikan delete ini hanya berhasil kalau baris tsb milik user ini
  const { error } = await supabase.from("cloud_accounts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO (opsional, bukan blocker M2): panggil
  // https://oauth2.googleapis.com/revoke?token=... pakai refresh_token
  // supaya akses juga dicabut di sisi Google, bukan cuma dihapus di DB kita.

  return NextResponse.json({ success: true });
}
