import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const admin = createAdminClient();

  const { data: filesWithIssues, error } = await admin
    .from("files")
    .select("id, name, chunk_count, status")
    .neq("status", "deleted")
    .in("id", (
      await admin.from("file_chunks").select("file_id").eq("status", "missing")
    ).data?.map(c => c.file_id) ?? []);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = [];
  for (const f of filesWithIssues ?? []) {
    const { data: missing } = await admin
      .from("file_chunks")
      .select("chunk_index")
      .eq("file_id", f.id)
      .eq("status", "missing");
    if (!isAdmin) {
      const { data: owner } = await admin
        .from("files")
        .select("user_id")
        .eq("id", f.id)
        .single();
      if (owner?.user_id !== user.id) continue;
    }
    result.push({
      id: f.id,
      name: f.name,
      totalChunks: f.chunk_count,
      missingChunks: (missing ?? []).map(c => c.chunk_index),
    });
  }

  return NextResponse.json({ files: result });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { fileId } = await req.json();
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const admin = createAdminClient();

  if (!isAdmin) {
    const { data: file } = await admin
      .from("files")
      .select("user_id")
      .eq("id", fileId)
      .single();
    if (!file || file.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("files")
    .update({ status: "failed" })
    .eq("id", fileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
