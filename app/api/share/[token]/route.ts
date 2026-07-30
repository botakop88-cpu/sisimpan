import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/share/[token]
 * Info dasar file (TANPA login). Sengaja pakai admin client (service role,
 * bypass RLS) dan filter EKSPLISIT berdasar token yang diminta -- lihat
 * catatan keamanan di supabase/migrations/0003_m4_share.sql soal kenapa
 * ini tidak boleh diserahkan ke RLS anon-key biasa.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: file, error } = await admin
    .from("files")
    .select("id, name, original_size, mime_type, status, share_expires_at, share_password_hash")
    .eq("share_token", token)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (file.status !== "ready") {
    return NextResponse.json({ error: "not_ready" }, { status: 409 });
  }

  if (file.share_expires_at && new Date(file.share_expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // PENTING: jangan pernah kembalikan share_password_hash mentah ke client --
  // cukup info boolean-nya saja.
  return NextResponse.json({
    name: file.name,
    size: file.original_size,
    mimeType: file.mime_type,
    requiresPassword: Boolean(file.share_password_hash),
  });
}
