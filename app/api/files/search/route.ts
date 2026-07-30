import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFiles, type FileCategory, type SortField, type SortDir } from "@/lib/files/search";

/**
 * GET /api/files/search?q=&category=&sortBy=&sortDir=
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const { data, error } = await searchFiles(supabase, {
    query: searchParams.get("q") ?? undefined,
    category: (searchParams.get("category") as FileCategory) ?? "all",
    sortBy: (searchParams.get("sortBy") as SortField) ?? "created_at",
    sortDir: (searchParams.get("sortDir") as SortDir) ?? "desc",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: data });
}
