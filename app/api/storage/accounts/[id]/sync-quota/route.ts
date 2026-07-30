import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";
import { getDriveQuota } from "@/lib/cloud/google-drive";

/**
 * POST /api/storage/accounts/[id]/sync-quota
 * Tarik ulang info kuota terbaru dari Google Drive. Juga jadi contoh
 * pemakaian ensureValidAccessToken (STOR-003 -- refresh otomatis).
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

  // Verifikasi kepemilikan lewat client biasa (kena RLS) sebelum
  // ensureValidAccessToken pakai admin client di baliknya.
  const { data: account, error: ownerError } = await supabase
    .from("cloud_accounts")
    .select("id")
    .eq("id", id)
    .single();

  if (ownerError || !account) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  try {
    const accessToken = await ensureValidAccessToken(id);
    const quota = await getDriveQuota(accessToken);

    const admin = createAdminClient();
    await admin
      .from("cloud_accounts")
      .update({
        storage_used: quota.usage,
        storage_limit: quota.limit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true, quota });
  } catch (err) {
    console.error("Sync quota error:", err);
    return NextResponse.json(
      { error: "Gagal sync kuota, coba connect ulang akun" },
      { status: 500 }
    );
  }
}
