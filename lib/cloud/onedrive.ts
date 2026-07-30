/**
 * Helper untuk Microsoft OneDrive OAuth + API calls.
 *
 * Scope minimal: Files.ReadWrite.AppFolder — setara dengan `drive.file` Google.
 * Artinya app cuma bisa baca/tulis file di folder khusus AppFolder, bukan seluruh OneDrive.
 * Ditambah User.Read untuk dapat email user.
 */

const ONEDRIVE_AUTHORIZE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const ONEDRIVE_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export const ONEDRIVE_SCOPES = [
  "Files.ReadWrite.AppFolder",
  "User.Read",
  "offline_access",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env var ${name} belum di-set`);
  return value;
}

/**
 * Bangun URL consent screen Microsoft.
 * `state` dipakai untuk verifikasi CSRF.
 */
export function buildOneDriveAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("MICROSOFT_CLIENT_ID"),
    redirect_uri: requireEnv("MICROSOFT_REDIRECT_URI"),
    response_type: "code",
    scope: ONEDRIVE_SCOPES,
    response_mode: "query",
    prompt: "consent", // paksa consent screen -> refresh_token konsisten
    state,
  });
  return `${ONEDRIVE_AUTHORIZE_URL}?${params.toString()}`;
}

interface OneDriveTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeOneDriveCodeForTokens(code: string): Promise<OneDriveTokenResponse> {
  const res = await fetch(ONEDRIVE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("MICROSOFT_CLIENT_ID"),
      client_secret: requireEnv("MICROSOFT_CLIENT_SECRET"),
      redirect_uri: requireEnv("MICROSOFT_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal tukar code dengan token Microsoft: ${res.status} ${body}`);
  }

  return res.json();
}

export async function refreshOneDriveAccessToken(refreshToken: string): Promise<OneDriveTokenResponse> {
  const res = await fetch(ONEDRIVE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("MICROSOFT_CLIENT_ID"),
      client_secret: requireEnv("MICROSOFT_CLIENT_SECRET"),
      redirect_uri: requireEnv("MICROSOFT_REDIRECT_URI"),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal refresh access token Microsoft: ${res.status} ${body}`);
  }

  return res.json();
}

/**
 * Ambil email user dari Microsoft Graph API.
 */
export async function getOneDriveUserInfo(accessToken: string): Promise<{ email: string }> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gagal ambil userinfo Microsoft: ${res.status}`);
  const data = await res.json();
  return { email: data.mail ?? data.userPrincipalName ?? data.displayName };
}

/**
 * Hapus 1 file remote di OneDrive. Dipakai saat user hapus file dari SISIMPAN.
 */
export async function deleteOneDriveRemoteFile(accessToken: string, remoteFileId: string): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${remoteFileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal hapus file di OneDrive: ${res.status}`);
  }
}

/**
 * Ambil kuota OneDrive: total dan terpakai.
 * Microsoft Graph: /me/drive -> quota.total, quota.used (dalam bytes).
 */
export async function getOneDriveQuota(
  accessToken: string
): Promise<{ usage: number; limit: number }> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/drive", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gagal ambil kuota OneDrive: ${res.status}`);

  const data = await res.json();
  const quota = data.quota ?? {};
  return {
    usage: Number(quota.used ?? 0),
    limit: Number(quota.total ?? 5 * 1024 * 1024 * 1024), // fallback 5GB
  };
}
