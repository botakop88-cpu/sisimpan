import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * POST /api/share/[token]/download
 * Body: { password?: string }
 * Balikan manifest bagian file (sama seperti /api/files/[id]/download,
 * tapi untuk akses publik lewat share link). Verifikasi password (kalau
 * file di-share dengan password) dan expiry di sini.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: file, error } = await admin
    .from("files")
    .select(
      "id, name, mime_type, original_size, checksum_sha256, status, share_expires_at, share_password_hash"
    )
    .eq("share_token", token)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (file.status !== "ready") {
    return NextResponse.json({ error: "not_ready" }, { status: 409 });
  }

  if (file.share_expires_at && new Date(file.share_expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (file.share_password_hash) {
    const body = await request.json().catch(() => ({}));
    const password = body?.password ?? "";
    if (hashPassword(password) !== file.share_password_hash) {
      return NextResponse.json({ error: "wrong_password" }, { status: 403 });
    }
  }

  const { data: chunks, error: chunksError } = await admin
    .from("file_chunks")
    .select("chunk_index, chunk_size, cloud_account_id, remote_file_id")
    .eq("file_id", file.id)
    .eq("status", "ok")
    .order("chunk_index", { ascending: true });

  if (chunksError || !chunks || chunks.length === 0) {
    return NextResponse.json({ error: "chunks_not_found" }, { status: 404 });
  }

  const parts = await Promise.all(
    chunks.map(async (c) => ({
      chunkIndex: c.chunk_index,
      size: c.chunk_size,
      remoteFileId: c.remote_file_id,
      accessToken: await ensureValidAccessToken(c.cloud_account_id),
    }))
  );

  return NextResponse.json({
    name: file.name,
    mimeType: file.mime_type,
    originalSize: file.original_size,
    checksumSha256: file.checksum_sha256,
    parts,
  });
}
