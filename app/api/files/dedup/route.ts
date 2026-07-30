import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { checksumSha256, fileName } = await req.json();
  if (!checksumSha256) return NextResponse.json({ error: "checksumSha256 required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("files")
    .select("id, name, original_size, created_at")
    .eq("checksum_sha256", checksumSha256)
    .neq("status", "deleted")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      isDuplicate: true,
      file: existing[0],
      message: fileName
        ? `File "${fileName}" sudah pernah diupload sebagai "${existing[0].name}"`
        : "File sudah pernah diupload",
    });
  }

  return NextResponse.json({ isDuplicate: false });
}
