/**
 * Helper untuk Google Drive OAuth + API calls.
 *
 * Scope yang dipakai: drive.file (bukan `drive` full-access) — lihat
 * 04_Analisis_Risiko_Teknis.md poin keamanan token. Ini membatasi app
 * hanya bisa akses file yang dibuat lewat SISIMPAN sendiri.
 */

const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_ABOUT_URL = "https://www.googleapis.com/drive/v3/about";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env var ${name} belum di-set`);
  return value;
}

/**
 * Bangun URL consent screen Google. `state` dipakai untuk verifikasi CSRF
 * dan bawa info user_id yang sedang connect (di-encode, bukan sensitive data).
 */
export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: DRIVE_SCOPES,
    access_type: "offline", // wajib supaya dapat refresh_token
    prompt: "consent", // paksa selalu munculkan consent screen -> refresh_token konsisten didapat
    state,
  });
  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal tukar code dengan token Google: ${res.status} ${body}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal refresh access token Google: ${res.status} ${body}`);
  }

  // Catatan: response refresh TIDAK selalu menyertakan refresh_token baru —
  // refresh_token lama tetap dipakai kalau tidak ada yang baru dikirim.
  return res.json();
}

export async function getGoogleUserInfo(accessToken: string): Promise<{ email: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gagal ambil userinfo Google: ${res.status}`);
  return res.json();
}

export async function getDriveQuota(
  accessToken: string
): Promise<{ usage: number; limit: number }> {
  const url = `${GOOGLE_ABOUT_URL}?fields=storageQuota`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gagal ambil kuota Drive: ${res.status}`);

  const data = await res.json();
  return {
    usage: Number(data.storageQuota?.usage ?? 0),
    // storageQuota.limit tidak ada di response kalau akun Google Workspace
    // dengan storage unlimited -- fallback ke 15GB (default akun personal)
    limit: Number(data.storageQuota?.limit ?? 15 * 1024 * 1024 * 1024),
  };
}

/**
 * Hapus 1 file remote di Google Drive. Dipakai saat user hapus file dari
 * SISIMPAN (FILE-008) -- supaya bytes-nya beneran hilang dari Drive, bukan
 * cuma hilang dari daftar di SISIMPAN.
 */
export async function deleteRemoteFile(accessToken: string, remoteFileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${remoteFileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 404 dianggap sukses juga -- kemungkinan file itu memang sudah tidak ada
  // di Drive (misal user hapus manual dari drive.google.com duluan).
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal hapus file di Drive: ${res.status}`);
  }
}
