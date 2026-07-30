import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/cloud/google-drive";
import { refreshOneDriveAccessToken } from "@/lib/cloud/onedrive";
import { refreshDropboxAccessToken } from "@/lib/cloud/dropbox";
import { encryptToken, decryptToken } from "@/lib/crypto";

type TokenRefresher = (refreshToken: string) => Promise<{ access_token: string; expires_in: number }>;

const REFRESHERS: Record<string, TokenRefresher> = {
  google_drive: refreshAccessToken,
  onedrive: refreshOneDriveAccessToken,
  dropbox: refreshDropboxAccessToken,
};

/**
 * Pastikan access_token akun cloud masih valid. Kalau sudah expired
 * (atau akan expired dalam 5 menit ke depan), refresh dulu pakai
 * refresh_token dari provider masing-masing dan update DB.
 *
 * Dipakai server-side sebelum operasi apa pun ke API cloud.
 */
export async function ensureValidAccessToken(cloudAccountId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: account, error } = await admin
    .from("cloud_accounts")
    .select("provider, access_token, refresh_token, token_expires_at, status")
    .eq("id", cloudAccountId)
    .single();

  if (error || !account) {
    throw new Error("Akun cloud tidak ditemukan");
  }

  if (account.status !== "active") {
    throw new Error(`Akun cloud berstatus '${account.status}', tidak bisa dipakai`);
  }

  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) {
    return decryptToken(account.access_token);
  }

  // Token expired atau hampir expired -> refresh
  const refreshToken = decryptToken(account.refresh_token);
  const refresher = REFRESHERS[account.provider];

  if (!refresher) {
    throw new Error(`Tidak ada refresh handler untuk provider '${account.provider}'`);
  }

  try {
    const newTokens = await refresher(refreshToken);

    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
    await admin
      .from("cloud_accounts")
      .update({
        access_token: encryptToken(newTokens.access_token),
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cloudAccountId);

    return newTokens.access_token;
  } catch (err) {
    // Refresh gagal — tandai akun sebagai expired supaya UI kasih tahu user connect ulang
    await admin
      .from("cloud_accounts")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", cloudAccountId);
    throw err;
  }
}

/**
 * Ambil refresher function untuk provider tertentu.
 * Dipakai untuk operasi yang butuh refresh manual (misal upload).
 */
export function getRefresher(provider: string): TokenRefresher | null {
  return REFRESHERS[provider] ?? null;
}
