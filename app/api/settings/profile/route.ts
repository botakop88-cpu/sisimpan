import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/settings/profile
 * Ambil data profile user yang sedang login.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("name, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Gagal ambil profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    email: user.email,
    name: profile?.name ?? "",
    role: profile?.role ?? "user",
    joinedAt: profile?.created_at,
  });
}

/**
 * PATCH /api/settings/profile
 * Update nama user di tabel profiles.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nama tidak valid" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Gagal update profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, name: name.trim() });
}
