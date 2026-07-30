

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface ProviderUsage {
  provider: string;
  used: number;
  colorClass: string;
}

export function AdminStatCards({
  totalUsers,
  userGrowthPct,
  cloudUsed,
  cloudTotal,
  providerBreakdown,
  logsToday,
  busiestHourLabel,
  onAddUser,
}: {
  totalUsers: number;
  userGrowthPct: number;
  cloudUsed: number;
  cloudTotal: number;
  providerBreakdown: ProviderUsage[];
  logsToday: number;
  busiestHourLabel: string;
  onAddUser?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[20px]">group</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Users</span>
        </div>
        <div className="font-display text-3xl font-bold text-on-surface">{totalUsers.toLocaleString("id-ID")}</div>
        <div className="mt-2 flex items-center text-xs font-medium text-primary">
          <span className="material-symbols-outlined mr-1 text-[14px]">trending_up</span> +{userGrowthPct}% this month
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[20px]">hard_drive</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Cloud Capacity</span>
        </div>
        <div className="mt-2 flex h-6 overflow-hidden rounded-lg border border-outline-variant">
          {providerBreakdown.map((p) => {
            const pct = cloudTotal > 0 ? (p.used / cloudTotal) * 100 : 0;
            if (pct <= 0) return null;
            return <div key={p.provider} title={p.provider} className={p.colorClass} style={{ width: `${pct}%` }} />;
          })}
          <div className="flex-1" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(220,227,224,0.5) 10px, rgba(220,227,224,0.5) 20px)" }} />
        </div>
        <div className="mt-3 flex justify-between text-xs text-on-surface-variant">
          <span>Used: {formatBytes(cloudUsed)}</span>
          <span>Total: {formatBytes(cloudTotal)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[20px]">clipboard_list</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Logs Today</span>
        </div>
        <div className="font-display text-3xl font-bold text-on-surface">{logsToday.toLocaleString("id-ID")}</div>
        <div className="mt-2 text-xs text-on-surface-variant">Peak at {busiestHourLabel}</div>
      </div>

      <button
        onClick={onAddUser}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-5 text-outline transition-all hover:border-primary hover:text-primary hover:bg-primary-container/5"
      >
        <span className="material-symbols-outlined text-[32px]">person_add</span>
        <span className="text-xs font-semibold tracking-wide uppercase">Add User</span>
      </button>
    </div>
  );
}
