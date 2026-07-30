import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/cloud/google-drive";

/**
 * GET /api/storage/accounts/google/connect
 * Dipanggil saat user klik tombol "Connect Google Drive" di halaman /storage.
 * Redirect browser ke consent screen Google.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  // State random buat proteksi CSRF -- diverifikasi lagi di callback
  // lewat cookie httpOnly, BUKAN dipercaya dari query param begitu saja.
  const state = randomBytes(16).toString("hex");

  const authUrl = buildGoogleAuthUrl(state);
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("gdrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 menit cukup buat proses consent
    path: "/",
  });

  return response;
}
