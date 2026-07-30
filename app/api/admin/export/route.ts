import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvEscape).join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(","));
  return [header, ...body].join("\n");
}

const EXPORTS = {
  users: {
    columns: ["id", "name", "role", "email", "created_at"],
    query: async (admin: ReturnType<typeof createAdminClient>) => {
      const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
      const emailMap: Record<string, string> = {};
      for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? "-";
      return (profiles ?? []).map((p) => ({
        id: p.id,
        name: p.name ?? "-",
        role: p.role ?? "user",
        email: emailMap[p.id] ?? "-",
        created_at: p.created_at ?? "-",
      }));
    },
  },
  storage: {
    columns: ["id", "user_id", "provider", "provider_email", "storage_used", "storage_limit", "status", "created_at"],
    query: async (admin: ReturnType<typeof createAdminClient>) => {
      const { data } = await admin.from("cloud_accounts").select("*").order("created_at", { ascending: false });
      return (data ?? []).map((a) => ({
        id: a.id,
        user_id: a.user_id,
        provider: a.provider,
        provider_email: a.provider_email ?? "-",
        storage_used: a.storage_used ?? 0,
        storage_limit: a.storage_limit ?? 0,
        status: a.status,
        created_at: a.created_at ?? "-",
      }));
    },
  },
  "activity-logs": {
    columns: ["id", "user_id", "action", "file_id", "metadata", "created_at"],
    query: async (admin: ReturnType<typeof createAdminClient>) => {
      const { data } = await admin.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(1000);
      return (data ?? []).map((l) => ({
        id: l.id,
        user_id: l.user_id ?? "-",
        action: l.action,
        file_id: l.file_id ?? "-",
        metadata: JSON.stringify(l.metadata ?? {}),
        created_at: l.created_at ?? "-",
      }));
    },
  },
  files: {
    columns: ["id", "user_id", "name", "mime_type", "original_size", "checksum_sha256", "chunk_count", "status", "created_at"],
    query: async (admin: ReturnType<typeof createAdminClient>) => {
      const { data } = await admin.from("files").select("*").order("created_at", { ascending: false }).limit(1000);
      return (data ?? []).map((f) => ({
        id: f.id,
        user_id: f.user_id,
        name: f.name,
        mime_type: f.mime_type ?? "-",
        original_size: f.original_size ?? 0,
        checksum_sha256: f.checksum_sha256 ?? "-",
        chunk_count: f.chunk_count ?? 0,
        status: f.status,
        created_at: f.created_at ?? "-",
      }));
    },
  },
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") ?? "users";
  const exportDef = EXPORTS[type as keyof typeof EXPORTS];
  if (!exportDef) return NextResponse.json({ error: "Invalid export type" }, { status: 400 });

  const admin = createAdminClient();
  const rows = await exportDef.query(admin);

  const csv = toCsv(rows, exportDef.columns);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sisimpan-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
