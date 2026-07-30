import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeDropboxCodeForTokens,
  getDropboxUserInfo,
  getDropboxQuota,
  DROPBOX_SCOPES,
} from "@/lib/cloud/dropbox";
import { encryptToken } from "@/lib/crypto";

/**
 * GET /api/storage/accounts/dropbox/callback
 * Dropbox redirect ke sini setelah user approve/tolak consent screen.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("dropbox_oauth_state")?.value;

  const failRedirect = (reason: string) =>
    NextResponse.redirect(`${origin}/storage?error=${encodeURIComponent(reason)}`);

  if (error) {
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
    const tokens = await exchangeDropboxCodeForTokens(code);

    if (!tokens.refresh_token) {
      return failRedirect("no_refresh_token_try_disconnect_first");
    }

    const { email } = await getDropboxUserInfo(tokens.access_token);
    const quota = await getDropboxQuota(tokens.access_token);

    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase
      .from("cloud_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "dropbox",
          provider_email: email,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          oauth_scope: DROPBOX_SCOPES,
          token_expires_at: tokenExpiresAt,
          storage_used: quota.usage,
          storage_limit: quota.limit,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider_email" }
      );

    if (dbError) {
      console.error("Gagal simpan cloud_accounts (dropbox):", dbError);
      return failRedirect("db_error");
    }

    const response = NextResponse.redirect(`${origin}/storage?connected=1`);
    response.cookies.delete("dropbox_oauth_state");
    return response;
  } catch (err) {
    console.error("Dropbox OAuth callback error:", err);
    return failRedirect("token_exchange_failed");
  }
}
