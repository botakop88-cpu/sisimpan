import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

function hashPassword(password: string): string {
  // Bukan buat autentikasi akun (yang perlu bcrypt/argon2 + salt per-user),
  // ini cuma "PIN" sederhana buat share link publik -- cukup SHA-256.
  return createHash("sha256").update(password).digest("hex");
}

/**
 * POST /api/files/[id]/share
 * Body: { expiresInHours?: number, password?: string }
 * Bikin/perbarui share link publik untuk file ini.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { expiresInHours, password } = body ?? {};

  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (file.status !== "ready") {
    return NextResponse.json(
      { error: "File belum selesai diupload, belum bisa dibagikan" },
      { status: 409 }
    );
  }

  const shareToken = randomBytes(24).toString("base64url");
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const { error: updateError } = await supabase
    .from("files")
    .update({
      share_token: shareToken,
      share_expires_at: expiresAt,
      share_password_hash: password ? hashPassword(password) : null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity(supabase, user.id, "share", id, { shareToken, expiresInHours: expiresInHours ?? null });

  return NextResponse.json({ shareToken, expiresAt });
}

/**
 * DELETE /api/files/[id]/share
 * Cabut share link (share_token jadi null -- link lama otomatis mati).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("files")
    .update({ share_token: null, share_expires_at: null, share_password_hash: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
