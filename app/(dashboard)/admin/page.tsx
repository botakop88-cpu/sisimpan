
import { createClient } from "@/lib/supabase/server";
import { AdminStatCards } from "@/components/admin/admin-stat-cards";
import { AdminTabs } from "@/components/admin/admin-tabs";
import type { AdminUserRow } from "@/components/admin/user-management-table";
import type { ActivityLogRow } from "@/components/admin/activity-log-table";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (!currentProfile || currentProfile.role !== "admin") {
    return (
      <div className="p-6">
        <p className="text-error">Access denied. Admin only.</p>
      </div>
    );
  }

  let totalUsers = 0;
  let userGrowthPct = 0;
  let cloudUsed = 0;
  let cloudTotal = 0;
  let logsToday = 0;
  let busiestHourLabel = "-";
  const providerBreakdown: { provider: string; used: number; colorClass: string }[] = [];

  const { count: userCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (userCount !== null) totalUsers = userCount;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfLastMonth = new Date(startOfMonth);
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

  const { count: thisMonthUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString());

  const { count: lastMonthUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfLastMonth.toISOString())
    .lt("created_at", startOfMonth.toISOString());

  if (lastMonthUsers && lastMonthUsers > 0) {
    userGrowthPct = Math.round(
      ((thisMonthUsers ?? 0) - lastMonthUsers) / lastMonthUsers * 100
    );
  }

  const { data: accounts } = await supabase
    .from("cloud_accounts")
    .select("provider, storage_used, storage_limit");

  const providerMap: Record<string, { used: number; limit: number }> = {};
  for (const acc of accounts ?? []) {
    if (!providerMap[acc.provider]) providerMap[acc.provider] = { used: 0, limit: 0 };
    providerMap[acc.provider].used += Number(acc.storage_used ?? 0);
    providerMap[acc.provider].limit += Number(acc.storage_limit ?? 0);
    cloudUsed += Number(acc.storage_used ?? 0);
    cloudTotal += Number(acc.storage_limit ?? 0);
  }

  const colorClasses = ["bg-primary", "bg-secondary-container", "bg-tertiary-fixed-dim"];
  let ci = 0;
  for (const [provider, data] of Object.entries(providerMap)) {
    const label =
      provider === "google_drive" ? "Google Drive"
        : provider === "onedrive" ? "OneDrive"
          : provider === "dropbox" ? "Dropbox" : provider;
    providerBreakdown.push({ provider: label, used: data.used, colorClass: colorClasses[ci % colorClasses.length] });
    ci++;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayLogs } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());
  if (todayLogs !== null) logsToday = todayLogs;

  const { data: logsTodayData } = await supabase
    .from("activity_logs")
    .select("created_at")
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false });
  if (logsTodayData && logsTodayData.length > 0) {
    const hours: Record<number, number> = {};
    for (const l of logsTodayData) {
      const h = new Date(l.created_at).getHours();
      hours[h] = (hours[h] ?? 0) + 1;
    }
    const busiest = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    if (busiest) busiestHourLabel = `${busiest[0].padStart(2, "0")}:00`;
  }

  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const users: AdminUserRow[] = (recentUsers ?? []).map((u) => ({
    id: u.id,
    name: u.name ?? "-",
    email: u.id,
    role: u.role ?? "user",
    joinedAt: u.created_at
      ? new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : "-",
  }));

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailMap: Record<string, string> = {};
  if (authUsers) {
    for (const au of authUsers.users) {
      emailMap[au.id] = au.email ?? "-";
    }
  }
  for (const u of users) {
    u.email = emailMap[u.id] ?? u.email;
  }

  const { data: recentLogs } = await supabase
    .from("activity_logs")
    .select("id, user_id, action, file_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const logs: ActivityLogRow[] = (recentLogs ?? []).map((l) => ({
    id: l.id,
    timestamp: l.created_at
      ? new Date(l.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "-",
    userName: emailMap[l.user_id ?? ""] ?? l.user_id ?? "-",
    action: l.action,
    fileName: (l.metadata as Record<string, unknown>)?.name as string ?? l.file_id ?? "-",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-lg text-on-surface">Admin</h1>
          <p className="text-sm text-on-surface-variant">System administration and monitoring</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-on-primary-fixed-variant">
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
          Admin Access
        </span>
      </div>

      <AdminStatCards
        totalUsers={totalUsers}
        userGrowthPct={userGrowthPct}
        cloudUsed={cloudUsed}
        cloudTotal={cloudTotal}
        providerBreakdown={providerBreakdown}
        logsToday={logsToday}
        busiestHourLabel={busiestHourLabel}
      />

      <AdminTabs users={users} logs={logs} totalUsersCount={totalUsers} />

      {/* Export */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Export Reports</h3>
            <p className="text-sm text-on-surface-variant">Download data as CSV</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { type: "users", label: "Users" },
              { type: "storage", label: "Storage" },
              { type: "files", label: "Files" },
              { type: "activity-logs", label: "Activity Logs" },
            ].map(({ type, label }) => (
              <a
                key={type}
                href={`/api/admin/export?type=${type}`}
                className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="rounded-xl border border-tertiary-fixed-dim bg-tertiary-fixed/20 p-6">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0 text-tertiary">info</span>
          <div>
            <h4 className="text-sm font-semibold text-on-surface">
              Data Retention Policy
            </h4>
            <p className="mt-1 text-sm text-on-surface-variant">
              Activity logs are stored for 90 days per institutional policy. Inactive viewer accounts
              are reviewed at the end of each academic year.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
