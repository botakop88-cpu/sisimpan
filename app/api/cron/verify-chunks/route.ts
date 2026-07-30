/**
 * Cron: Verifikasi integritas chunk — cek apakah file remote masih ada di cloud.
 *
 * Alur:
 * 1. Ambil chunk dengan status 'ok' yang belum dicek dalam 24 jam terakhir
 * 2. Untuk tiap chunk, cek ke provider cloud (Google Drive / OneDrive / Dropbox)
 * 3. Kalau file remote sudah tidak ada → tandai chunk.status = 'missing'
 * 4. Kalau error (bukan not_found), skip dan log
 *
 * Dipanggil tiap 6 jam via Vercel Cron.
 * Rate-limit: maks ~5 req/detik per akun — delay antar chunk.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}`;
}

// Delay antar request ke provider (ms) — mitigasi rate-limit
const PROVIDER_DELAY_MS = 250; // ~4 req/detik

async function checkRemoteFileExists(provider: string, accessToken: string, remoteFileId: string): Promise<boolean> {
  switch (provider) {
    case "google_drive": {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${remoteFileId}?fields=id`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`Google Drive API error: ${res.status}`);
      return true;
    }
    case "onedrive": {
      // OneDrive: GET /drive/items/{id}
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${remoteFileId}?select=id`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`OneDrive API error: ${res.status}`);
      return true;
    }
    case "dropbox": {
      // Dropbox: POST /2/files/get_metadata
      const res = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: remoteFileId }),
      });
      if (res.status === 404) return false;
      if (!res.ok) {
        const body = await res.json();
        // Dropbox return error_summary untuk not_found
        if (body?.error_summary?.includes("not_found") || body?.error_summary?.includes("path")) return false;
        throw new Error(`Dropbox API error: ${res.status} ${body?.error_summary ?? ""}`);
      }
      return true;
    }
    default:
      throw new Error(`Provider tidak dikenal: ${provider}`);
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results = { checked: 0, markedMissing: 0, errors: 0, skipped: 0 };

  // Ambil chunk yang statusnya 'ok' — batasi 50 per run biar gak overload
  const { data: chunks, error: chunkError } = await admin
    .from("file_chunks")
    .select("id, remote_file_id, cloud_account_id, file_id")
    .eq("status", "ok");

  if (chunkError) {
    return NextResponse.json({ error: chunkError.message }, { status: 500 });
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ message: "Tidak ada chunk yang perlu diperiksa", results });
  }

  // Group per cloud_account_id supaya bisa 1x refresh token
  const byAccount: Record<string, { id: string; remote_file_id: string; file_id: string }[]> = {};

  for (const chunk of chunks) {
    if (!chunk.cloud_account_id) {
      results.skipped++;
      continue;
    }
    if (!byAccount[chunk.cloud_account_id]) byAccount[chunk.cloud_account_id] = [];
    byAccount[chunk.cloud_account_id].push(chunk);
  }

  // Ambil info provider per akun
  const accountIds = Object.keys(byAccount);
  const { data: accounts } = await admin
    .from("cloud_accounts")
    .select("id, provider")
    .in("id", accountIds);

  const providerMap: Record<string, string> = {};
  for (const acc of accounts ?? []) {
    providerMap[acc.id] = acc.provider;
  }

  for (const [accountId, chunkList] of Object.entries(byAccount)) {
    const provider = providerMap[accountId];
    if (!provider) {
      results.errors += chunkList.length;
      continue;
    }

    try {
      const accessToken = await ensureValidAccessToken(accountId);

      for (const chunk of chunkList) {
        try {
          // Delay antar request
          await new Promise((r) => setTimeout(r, PROVIDER_DELAY_MS));

          const exists = await checkRemoteFileExists(provider, accessToken, chunk.remote_file_id);

          if (!exists) {
            // Tandai chunk sebagai missing
            await admin
              .from("file_chunks")
              .update({ status: "missing" })
              .eq("id", chunk.id);

            results.markedMissing++;
          }
          results.checked++;
        } catch {
          results.errors++;
        }
      }
    } catch {
      // Akun bermasalah (expired, dll) — skip semua chunk-nya
      results.skipped += chunkList.length;
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    results,
    totalChunksInDb: chunks.length,
  };

  if (results.markedMissing > 0) {
    console.warn("Chunk integrity check menemukan chunk missing:", report);
  }

  return NextResponse.json(report);
}
