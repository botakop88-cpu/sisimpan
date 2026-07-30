import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildDropboxAuthUrl } from "@/lib/cloud/dropbox";

/**
 * GET /api/storage/accounts/dropbox/connect
 * Redirect browser ke consent screen Dropbox.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const state = randomBytes(16).toString("hex");

  const authUrl = buildDropboxAuthUrl(state);
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("dropbox_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
