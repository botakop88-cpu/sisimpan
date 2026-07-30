import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

/**
 * POST /api/files
 * Body: { name, mimeType, originalSize, checksumSha256, chunkCount }
 * Dipanggil client SETELAH selesai hash file (client sudah tahu checksum
 * whole-file dan berapa bagian file bakal displit) tapi SEBELUM upload
 * bytes-nya ke Drive dimulai.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, mimeType, originalSize, checksumSha256, chunkCount } = body ?? {};

  if (!name || !originalSize || !checksumSha256 || !chunkCount) {
    return NextResponse.json({ error: "Data file tidak lengkap" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("files")
    .insert({
      user_id: user.id,
      name,
      mime_type: mimeType ?? "application/octet-stream",
      original_size: originalSize,
      checksum_sha256: checksumSha256,
      chunk_count: chunkCount,
      status: "uploading",
      upload_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, user.id, "upload", data.id, { name, size: originalSize, mimeType });

  return NextResponse.json({ fileId: data.id });
}

/**
 * GET /api/files
 * List file milik user yang login, terbaru dulu.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("files")
    .select("id, name, mime_type, original_size, chunk_count, status, created_at")
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: data });
}
