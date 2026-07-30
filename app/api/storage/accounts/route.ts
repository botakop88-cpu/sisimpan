import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/storage/accounts
 * List akun cloud milik user yang sedang login. RLS di Supabase sudah
 * membatasi query ini otomatis hanya ke baris milik user tsb.
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
    .from("cloud_accounts")
    .select("id, provider, provider_email, account_owner_type, storage_used, storage_limit, status, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ accounts: data });
}
