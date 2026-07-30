/**
 * Health check sistem — dipanggil oleh Vercel Cron setiap jam.
 *
 * Memeriksa:
 * 1. Koneksi database Supabase (query minimal)
 * 2. Hitung akun cloud dengan status expired/bermasalah
 * 3. Hitung chunk yang ditandai missing
 * 4. Ringkasan kuota per provider
 *
 * Response: JSON dengan status tiap komponen + timestamp.
 * Kalau ada masalah serius, log ke console.error yang bisa dipantau
 * lewat Vercel Dashboard -> Logs.
 *
 * Dipanggil via Vercel Cron: lihat `cron` di vercel.json.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = createAdminClient();
  const report: {
    timestamp: string;
    status: string;
    checks: Record<string, unknown>;
    warning?: string;
    durationMs?: number;
  } = {
    timestamp: new Date().toISOString(),
    status: "ok",
    checks: {},
  };

  // 1. Koneksi database
  try {
    const { count: userCount, error: dbError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (dbError) throw dbError;
    report.checks.database = { status: "ok", userCount };
  } catch (err) {
    report.checks.database = { status: "error", error: String(err) };
    report.status = "degraded";
  }

  // 2. Akun cloud expired
  try {
    const { count: expiredAccounts, error: expError } = await admin
      .from("cloud_accounts")
      .select("id", { count: "exact", head: true })
      .eq("status", "expired");

    if (expError) throw expError;
    report.checks.expiredAccounts = expiredAccounts ?? 0;

    if (expiredAccounts && expiredAccounts > 0) {
      report.warning = `${expiredAccounts} akun cloud dalam status expired`;
    }
  } catch (err) {
    report.checks.expiredAccounts = { status: "error", error: String(err) };
    report.status = "degraded";
  }

  // 3. Chunk missing
  try {
    const { count: missingChunks, error: missError } = await admin
      .from("file_chunks")
      .select("id", { count: "exact", head: true })
      .eq("status", "missing");

    if (missError) throw missError;
    report.checks.missingChunks = missingChunks ?? 0;

    if (missingChunks && missingChunks > 0) {
      report.warning = (report.warning
        ? `${report.warning}; `
        : "") + `${missingChunks} chunk ditandai missing`;
    }
  } catch (err) {
    report.checks.missingChunks = { status: "error", error: String(err) };
    report.status = "degraded";
  }

  // 4. Ringkasan kuota per provider
  try {
    const { data: providerQuota, error: quotaError } = await admin
      .from("cloud_accounts")
      .select("provider, storage_used, storage_limit, status")
      .eq("status", "active");

    if (quotaError) throw quotaError;

    const summary: Record<string, { totalUsed: number; totalLimit: number; count: number }> = {};

    for (const acc of providerQuota ?? []) {
      if (!summary[acc.provider]) {
        summary[acc.provider] = { totalUsed: 0, totalLimit: 0, count: 0 };
      }
      summary[acc.provider].totalUsed += Number(acc.storage_used ?? 0);
      summary[acc.provider].totalLimit += Number(acc.storage_limit ?? 0);
      summary[acc.provider].count++;
    }

    report.checks.providerQuota = summary;
  } catch (err) {
    report.checks.providerQuota = { status: "error", error: String(err) };
    report.status = "degraded";
  }

  report.durationMs = Date.now() - startedAt;

  if (report.status !== "ok") {
    console.error("Health check melaporkan masalah:", JSON.stringify(report, null, 2));
  }

  return NextResponse.json(report);
}
