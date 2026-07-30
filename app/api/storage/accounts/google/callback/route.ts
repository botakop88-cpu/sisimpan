import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  getDriveQuota,
  DRIVE_SCOPES,
} from "@/lib/cloud/google-drive";
import { encryptToken } from "@/lib/crypto";

/**
 * GET /api/storage/accounts/google/callback
 * Google redirect ke sini setelah user approve/tolak consent screen.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gdrive_oauth_state")?.value;

  const failRedirect = (reason: string) =>
    NextResponse.redirect(`${origin}/storage?error=${encodeURIComponent(reason)}`);

  if (error) {
    // User klik "Cancel" di consent screen -- bukan error sistem
    return failRedirect(error === "access_denied" ? "connection_cancelled" : error);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect("invalid_oauth_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failRedirect("not_logged_in");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      // Ini kejadian kalau user sudah pernah connect sebelumnya dan Google
      // tidak reissue refresh_token. Solusinya prompt=consent di connect
      // route sudah dipaksa selalu muncul -- ini jarang terjadi, tapi jaga-jaga.
      return failRedirect("no_refresh_token_try_disconnect_first");
    }

    const { email } = await getGoogleUserInfo(tokens.access_token);
    const quota = await getDriveQuota(tokens.access_token);

    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Upsert: kalau user connect ulang akun Google yang sama, update token-nya
    // daripada bikin baris duplikat.
    const { error: dbError } = await supabase
      .from("cloud_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "google_drive",
          provider_email: email,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          oauth_scope: DRIVE_SCOPES,
          token_expires_at: tokenExpiresAt,
          storage_used: quota.usage,
          storage_limit: quota.limit,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider_email" }
      );

    if (dbError) {
      console.error("Gagal simpan cloud_accounts:", dbError);
      return failRedirect("db_error");
    }

    const response = NextResponse.redirect(`${origin}/storage?connected=1`);
    response.cookies.delete("gdrive_oauth_state");
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return failRedirect("token_exchange_failed");
  }
}
