/**
 * Helper untuk Dropbox OAuth + API calls.
 *
 * Scope minimal: files.content.write + files.content.read — setara `drive.file`.
 * Hanya akses file yang dibuat app ini, bukan seluruh Dropbox user.
 * Ditambah account_info.read untuk dapat email.
 */

const DROPBOX_AUTHORIZE_URL = "https://www.dropbox.com/oauth2/authorize";
const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

export const DROPBOX_SCOPES = [
  "files.content.write",
  "files.content.read",
  "account_info.read",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env var ${name} belum di-set`);
  return value;
}

/**
 * Bangun URL consent screen Dropbox.
 * `state` dipakai untuk verifikasi CSRF.
 * token_access_type=offline diperlukan untuk mendapat refresh_token.
 */
export function buildDropboxAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("DROPBOX_APP_KEY"),
    redirect_uri: requireEnv("DROPBOX_REDIRECT_URI"),
    response_type: "code",
    scope: DROPBOX_SCOPES,
    token_access_type: "offline",
    state,
  });
  return `${DROPBOX_AUTHORIZE_URL}?${params.toString()}`;
}

interface DropboxTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  account_id: string;
  uid: string;
}

export async function exchangeDropboxCodeForTokens(code: string): Promise<DropboxTokenResponse> {
  const res = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("DROPBOX_APP_KEY"),
      client_secret: requireEnv("DROPBOX_APP_SECRET"),
      redirect_uri: requireEnv("DROPBOX_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal tukar code dengan token Dropbox: ${res.status} ${body}`);
  }

  return res.json();
}

export async function refreshDropboxAccessToken(refreshToken: string): Promise<DropboxTokenResponse> {
  const res = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("DROPBOX_APP_KEY"),
      client_secret: requireEnv("DROPBOX_APP_SECRET"),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal refresh access token Dropbox: ${res.status} ${body}`);
  }

  return res.json();
}

/**
 * Ambil email user dari Dropbox API.
 * POST /2/users/get_current_account (RPC-style, body JSON kosong).
 */
export async function getDropboxUserInfo(accessToken: string): Promise<{ email: string }> {
  const res = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "null",
  });
  if (!res.ok) throw new Error(`Gagal ambil userinfo Dropbox: ${res.status}`);
  const data = await res.json();
  return { email: data.email };
}

/**
 * Hapus 1 file remote di Dropbox. Dipakai saat user hapus file dari SISIMPAN.
 * Dropbox pakai POST /2/files/delete_v2 dengan body { path: remoteFileId }.
 */
export async function deleteDropboxRemoteFile(accessToken: string, remoteFileId: string): Promise<void> {
  const res = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: remoteFileId }),
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.json();
    throw new Error(`Gagal hapus file di Dropbox: ${res.status} ${body?.error_summary ?? ""}`);
  }
}

/**
 * Ambil kuota Dropbox: total dan terpakai.
 * POST /2/users/get_space_usage.
 */
export async function getDropboxQuota(
  accessToken: string
): Promise<{ usage: number; limit: number }> {
  const res = await fetch("https://api.dropboxapi.com/2/users/get_space_usage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "null",
  });
  if (!res.ok) throw new Error(`Gagal ambil kuota Dropbox: ${res.status}`);

  const data = await res.json();
  // allocation.individual.allocated — untuk akun personal
  // allocation.team.allocated — untuk akun team/business
  const allocation = data.allocation ?? {};
  const allocated =
    (allocation[".tag"] === "team" ? allocation.team?.allocated : allocation.individual?.allocated) ??
    2 * 1024 * 1024 * 1024; // fallback 2GB

  return {
    usage: Number(data.used ?? 0),
    limit: Number(allocated),
  };
}
