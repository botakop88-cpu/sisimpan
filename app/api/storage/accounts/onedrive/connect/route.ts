import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildOneDriveAuthUrl } from "@/lib/cloud/onedrive";

/**
 * GET /api/storage/accounts/onedrive/connect
 * Redirect browser ke consent screen Microsoft.
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

  const authUrl = buildOneDriveAuthUrl(state);
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("onedrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
