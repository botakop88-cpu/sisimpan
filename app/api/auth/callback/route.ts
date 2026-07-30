import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Dipanggil Supabase setelah user selesai login lewat Google OAuth.
// Ini OAuth untuk LOGIN ke SISIMPAN — beda dengan OAuth "Connect Drive"
// yang punya callback sendiri di /api/storage/accounts/google/callback (M2).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
