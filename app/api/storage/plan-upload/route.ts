import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planAllocation, InsufficientCapacityError } from "@/lib/cloud/allocation";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";

/**
 * POST /api/storage/plan-upload
 * Body: { fileSize: number }
 *
 * Dipanggil client SEBELUM mulai split & hash file, supaya tahu file ini
 * mau dipecah ke akun mana saja dan dapat access_token buat tiap akun
 * yang terlibat. Endpoint ini tidak ada di endpoint list awal -- ini
 * penambahan yang diperlukan karena OAuth/upload langsung dari browser
 * butuh langkah "tanya server dulu akun mana + token apa" (lihat catatan
 * di SETUP_M3.md).
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
  const fileSize = body?.fileSize;

  if (typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json({ error: "fileSize tidak valid" }, { status: 400 });
  }

  const { data: accounts, error } = await supabase
    .from("cloud_accounts")
    .select("id, provider_email, account_owner_type, storage_used, storage_limit")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json(
      { error: "no_connected_accounts", message: "Belum ada akun Google Drive yang terkoneksi" },
      { status: 400 }
    );
  }

  try {
    const plan = planAllocation(
      accounts.map((a) => ({
        id: a.id,
        providerEmail: a.provider_email,
        accountOwnerType: a.account_owner_type,
        storageUsed: a.storage_used,
        storageLimit: a.storage_limit,
      })),
      fileSize
    );

    // Ambil access token (auto-refresh kalau perlu) untuk tiap akun yang
    // terlibat di rencana split ini.
    const parts = await Promise.all(
      plan.map(async (p) => ({
        ...p,
        accessToken: await ensureValidAccessToken(p.cloudAccountId),
      }))
    );

    return NextResponse.json({ parts });
  } catch (err) {
    if (err instanceof InsufficientCapacityError) {
      return NextResponse.json(
        { error: "insufficient_capacity", message: err.message },
        { status: 400 }
      );
    }
    console.error("plan-upload error:", err);
    return NextResponse.json({ error: "Gagal menyusun rencana upload" }, { status: 500 });
  }
}
