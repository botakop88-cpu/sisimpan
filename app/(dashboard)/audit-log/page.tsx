"use client";

import { useEffect, useState } from "react";

type LogEntry = {
  id: string;
  userName: string;
  action: string;
  fileName: string;
  time: string;
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  upload: "bg-primary-fixed text-on-primary-fixed-variant",
  download: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  share: "bg-surface-container-high text-on-surface-variant",
  delete: "bg-error-container text-on-error-container",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      const json = await res.json();
      if (json.files) {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { data } = await supabase
          .from("activity_logs")
          .select("id, action, file_id, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        const entries: LogEntry[] = (data ?? []).map((l: any) => ({
          id: l.id,
          userName: l.action,
          action: l.action,
          fileName: (l.metadata as Record<string, unknown>)?.name as string ?? l.file_id ?? "-",
          time: new Date(l.created_at).toLocaleString("id-ID", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
          }),
          status: l.action,
        }));
        setLogs(entries);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(
    (log) =>
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-on-surface">Audit Log</h1>
        <p className="text-sm text-on-surface-variant">Track all activities across the system</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-4 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading...</p>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-xs text-on-surface-variant">
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-on-surface-variant">No logs found</td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <tr key={log.id || i} className="border-b border-outline-variant/60 last:border-0 transition-colors hover:bg-surface-container-low">
                    <td className="px-6 py-4 font-medium text-on-surface capitalize">{log.action}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{log.fileName}</td>
                    <td className="px-6 py-4 text-sm text-outline">{log.time}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[log.status] || "bg-surface-container-high text-on-surface-variant"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          log.status === "upload" || log.status === "download" ? "bg-primary" :
                          log.status === "share" ? "bg-on-surface-variant" : "bg-error"
                        }`} />
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
