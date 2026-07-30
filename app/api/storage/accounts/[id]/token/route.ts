import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";

/**
 * POST /api/storage/accounts/[id]/token
 * Dipanggil client kalau PUT ke Google Drive tiba-tiba dapat 401 di
 * tengah upload part besar (access token yang dikasih di plan-upload
 * sudah keburu expired sebelum part-nya selesai diupload). Bukan
 * dipanggil rutin -- cuma fallback.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verifikasi kepemilikan lewat RLS dulu sebelum panggil admin client
  // di dalam ensureValidAccessToken.
  const { data: account, error } = await supabase
    .from("cloud_accounts")
    .select("id")
    .eq("id", id)
    .single();

  if (error || !account) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  try {
    const accessToken = await ensureValidAccessToken(id);
    return NextResponse.json({ accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    return NextResponse.json({ error: "Gagal refresh token" }, { status: 500 });
  }
}
