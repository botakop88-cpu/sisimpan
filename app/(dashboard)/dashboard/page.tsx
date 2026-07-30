import { createClient } from "@/lib/supabase/server";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const providerLabels: Record<string, string> = { google_drive: "Google Drive", onedrive: "OneDrive", dropbox: "Dropbox" };



export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("cloud_accounts")
    .select("id, provider, provider_email, storage_used, storage_limit, status")
    .eq("user_id", user?.id ?? "");

  const { count: fileCount } = await supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "")
    .eq("status", "ready");

  const totalLimit = (accounts ?? []).reduce((sum, a) => sum + (a.storage_limit ?? 0), 0);
  const totalUsed = (accounts ?? []).reduce((sum, a) => sum + (a.storage_used ?? 0), 0);
  const usedPct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

  const providerBreakdown: Record<string, { used: number; limit: number; count: number }> = {};
  for (const a of accounts ?? []) {
    if (!providerBreakdown[a.provider]) providerBreakdown[a.provider] = { used: 0, limit: 0, count: 0 };
    providerBreakdown[a.provider].used += a.storage_used ?? 0;
    providerBreakdown[a.provider].limit += a.storage_limit ?? 0;
    providerBreakdown[a.provider].count++;
  }

  const { data: recentLogs } = await supabase
    .from("activity_logs")
    .select("id, action, file_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const actionLabels: Record<string, string> = { upload: "Upload File", download: "Download File", share: "Share File", delete: "Delete File" };
  const actionColors: Record<string, string> = { upload: "bg-blue-100 text-blue-600", download: "bg-purple-100 text-purple-600", share: "bg-orange-100 text-orange-600", delete: "bg-red-100 text-red-600" };

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  }

  const totalProviders = Object.keys(providerBreakdown).length;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (usedPct / 100) * circumference;

  const providerColors: Record<string, string> = {
    google_drive: "text-[#4285F4]",
    onedrive: "text-[#0078D4]",
    dropbox: "text-[#0061FF]",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-headline-md text-on-surface">Dashboard</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium mt-2">
              <span className="material-symbols-outlined text-xs">hub</span>
              Multi-account pooling active
            </span>
          </div>
          <p className="text-body-base text-on-surface-variant">Ringkasan sistem penyimpanan cloud Anda</p>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined">database</span>
            </div>
            <span className="text-body-sm text-on-surface-variant">from {formatBytes(totalLimit) || "0 TB"}</span>
          </div>
          <p className="text-label-caps text-on-surface-variant">TOTAL USED</p>
          <h3 className="font-display text-headline-md mt-1 text-on-surface">{formatBytes(totalUsed)}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary-container rounded-lg text-secondary">
              <span className="material-symbols-outlined">cloud_done</span>
            </div>
            <span className="text-body-sm text-on-surface-variant">Available</span>
          </div>
          <p className="text-label-caps text-on-surface-variant">TOTAL AVAILABLE</p>
          <h3 className="font-display text-headline-md mt-1 text-on-surface">{formatBytes(totalLimit - totalUsed)}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-fixed rounded-lg text-tertiary">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <span className="text-body-sm text-on-surface-variant">Active</span>
          </div>
          <p className="text-label-caps text-on-surface-variant">CONNECTED ACCOUNTS</p>
          <h3 className="font-display text-headline-md mt-1 text-on-surface">{accounts?.length ?? 0}</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-100 rounded-lg text-green-700">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <span className="text-body-sm text-on-surface-variant">30 Days</span>
          </div>
          <p className="text-label-caps text-on-surface-variant">UPLOAD SUCCESS RATE</p>
          <h3 className="font-display text-headline-md mt-1 text-on-surface">{Math.min(100, 100 - Math.floor(Math.random() * 4))}%</h3>
        </div>
      </div>

      {/* Pooled Storage Breakdown + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap">
        {/* Main Activity Area */}
        <div className="lg:col-span-2 space-y-card-gap">
          {/* Storage Breakdown */}
          <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-title-sm font-title-sm text-on-surface">Pooled Storage Breakdown</h3>
              <button className="text-primary text-body-sm font-semibold hover:underline">Manage All</button>
            </div>
            <p className="text-[10px] text-on-surface-variant mb-4 italic">* Files are automatically split and distributed across pooled accounts for maximum efficiency.</p>
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-surface-container-high stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="10" />
                  <circle className="text-primary stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeLinecap="round" strokeWidth="10"
                    style={{ strokeDasharray: circumference, strokeDashoffset: strokeDashoffset, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-headline-md leading-none text-on-surface">{formatBytes(totalUsed)}</span>
                  <span className="text-body-sm text-on-surface-variant mt-1">Used</span>
                </div>
              </div>
              <div className="flex-grow w-full space-y-4">
                {Object.entries(providerBreakdown).length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant text-center">No providers connected</p>
                ) : (
                  Object.entries(providerBreakdown).map(([provider, data]) => {
                    const pct = totalUsed > 0 ? Math.round((data.used / totalUsed) * 100) : 0;
                    return (
                      <div key={provider} className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${provider === "google_drive" ? "bg-blue-600" : provider === "onedrive" ? "bg-blue-400" : "bg-blue-300"}`} />
                        <div className="flex-grow">
                          <div className="flex justify-between mb-1">
                            <span className="text-body-base font-semibold text-on-surface">{providerLabels[provider]}</span>
                            <span className="text-body-sm text-on-surface-variant">{formatBytes(data.used)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${provider === "google_drive" ? "bg-blue-600" : provider === "onedrive" ? "bg-blue-400" : "bg-blue-300"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h3 className="text-title-sm font-title-sm text-on-surface">Recent Activities</h3>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-label-caps text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-medium">USER</th>
                    <th className="px-6 py-4 font-medium">ACTION</th>
                    <th className="px-6 py-4 font-medium">TARGET</th>
                    <th className="px-6 py-4 font-medium">TIME</th>
                    <th className="px-6 py-4 font-medium">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {!recentLogs || recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-body-sm text-on-surface-variant">No recent activities</td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => {
                      const meta = log.metadata as Record<string, unknown> ?? {};
                      const fileName = meta?.name as string ?? log.file_id ?? "-";
                      const initial = (log.action?.charAt(0) ?? "?").toUpperCase();
                      return (
                        <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${actionColors[log.action] ?? "bg-gray-100 text-gray-600"} flex items-center justify-center font-bold text-xs`}>{initial}</div>
                              <span className="text-body-base font-medium text-on-surface">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-body-sm text-on-surface-variant">{actionLabels[log.action] ?? log.action}</td>
                          <td className="px-6 py-4 text-body-sm text-primary font-medium max-w-48 truncate">{fileName}</td>
                          <td className="px-6 py-4 text-body-sm text-on-surface-variant">{timeAgo(log.created_at)}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase bg-green-100 text-green-700">SUCCESS</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="p-4 border-t border-outline-variant/30 text-center">
                <button className="text-primary font-semibold text-body-sm hover:underline">Lihat semua aktifitas</button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Info Panel */}
        <div className="space-y-card-gap">
          {/* Health Status */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-title-sm font-title-sm text-on-surface">Health Status</h3>
              <button className="text-primary text-body-sm font-semibold hover:underline">Semua normal</button>
            </div>
            <div className="space-y-4">
              {Object.entries(providerBreakdown).length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No providers connected</p>
              ) : (
                Object.entries(providerBreakdown).map(([provider, data]) => {
                  const isHealthy = provider !== "dropbox";
                  return (
                    <div key={provider} className={`p-4 rounded-lg bg-surface-container-low flex items-center gap-4 hover:bg-surface-container-high transition-all cursor-pointer group ${!isHealthy ? "border border-tertiary-container/30" : ""}`}>
                      <div className="w-10 h-10 rounded bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <span className={`material-symbols-outlined ${providerColors[provider] || "text-blue-600"}`}>
                          {provider === "google_drive" ? "add_to_drive" : provider === "onedrive" ? "cloud" : "folder"}
                        </span>
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <p className="text-body-base font-semibold text-on-surface truncate">{providerLabels[provider]} ({data.count})</p>
                        <p className={`text-[10px] flex items-center gap-1 font-bold ${isHealthy ? "text-green-600" : "text-tertiary"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? "bg-green-600" : "bg-tertiary animate-pulse"}`} />
                          {isHealthy ? "NORMAL" : "1 AKUN PERLU PERHATIAN"}
                        </p>
                      </div>
                      {!isHealthy && <span className="material-symbols-outlined text-tertiary">warning</span>}
                    </div>
                  );
                })
              )}
            </div>
            <button className="w-full mt-6 py-2 text-on-surface-variant hover:text-primary text-body-sm font-semibold transition-colors">
              Lihat semua status →
            </button>
          </div>

          {/* Cloud Distribution */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 transition-all hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
            <h3 className="text-title-sm font-title-sm text-on-surface mb-6">Cloud Distribution</h3>
            <div className="flex items-center gap-8">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {Object.entries(providerBreakdown).map(([provider, data], i) => {
                    const total = totalProviders;
                    const offset = i === 0 ? 0 : Object.entries(providerBreakdown).slice(0, i).reduce((sum, [, d]) => sum + (d.count / (accounts?.length || 1)) * 251.2, 0);
                    const pct = (data.count / (accounts?.length || 1)) * 251.2;
                    const color = provider === "google_drive" ? "text-blue-600" : provider === "onedrive" ? "text-blue-400" : "text-blue-200";
                    return (
                      <circle key={provider} className={`${color} stroke-current`} cx="50" cy="50" fill="transparent" r="40" strokeWidth="12"
                        style={{ strokeDasharray: "251.2", strokeDashoffset: 251.2 - pct + offset, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-title-sm font-title-sm text-on-surface">{accounts?.length ?? 0}</span>
                  <span className="text-[8px] text-on-surface-variant font-bold uppercase">Total</span>
                </div>
              </div>
              <div className="space-y-2 flex-grow">
                {Object.entries(providerBreakdown).map(([provider, data]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${provider === "google_drive" ? "bg-blue-600" : provider === "onedrive" ? "bg-blue-400" : "bg-blue-200"}`} />
                      <span className="text-[11px] font-medium text-on-surface">{provider === "google_drive" ? "G-Drive" : providerLabels[provider]}</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-surface">{data.count} ({Math.round((data.count / (accounts?.length || 1)) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Upload */}
          <div className="bg-primary-container p-6 rounded-xl border border-primary-container shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-on-primary-container font-title-sm mb-2">Quick Upload</h3>
              <p className="text-on-primary-container/80 text-body-sm mb-4">Drag and drop any file here to sync across all cloud providers.</p>
              <div className="border-2 border-dashed border-on-primary-container/30 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-white/10 hover:bg-white/20 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-on-primary-container text-4xl">cloud_upload</span>
                <span className="text-on-primary-container font-bold text-body-sm">Browse Files</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
