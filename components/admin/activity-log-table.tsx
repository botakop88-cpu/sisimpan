

export interface ActivityLogRow {
  id: string;
  timestamp: string;
  userName: string;
  action: "upload" | "download" | "share" | "delete";
  fileName: string;
}

const ACTION_META: Record<
  ActivityLogRow["action"],
  { icon: string; label: string; className: string }
> = {
  upload: { icon: "cloud_upload", label: "UPLOAD", className: "text-primary" },
  share: { icon: "share", label: "SHARE", className: "text-secondary" },
  download: { icon: "download", label: "DOWNLOAD", className: "text-tertiary" },
  delete: { icon: "delete", label: "DELETE", className: "text-error" },
};

export function ActivityLogTable({
  logs,
  onExportCsv,
}: {
  logs: ActivityLogRow[];
  onExportCsv?: () => void;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">System Activity Log</h3>
        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary-darker transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">download</span> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">Time</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">User</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">Action</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">File</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {logs.map((log) => {
              const meta = ACTION_META[log.action];
              const iconName = meta.icon;
              return (
                <tr key={log.id} className="border-b border-outline-variant transition-colors hover:bg-surface-container-low">
                  <td className="px-4 py-3.5 font-mono-data text-xs text-on-surface-variant">{log.timestamp}</td>
                  <td className="px-4 py-3.5 font-medium text-on-surface">{log.userName}</td>
                  <td className="px-4 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 ${meta.className}`}>
                      <span className="material-symbols-outlined text-[14px]">{iconName}</span>
                      <span className="text-[10px] font-bold">{meta.label}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 text-on-surface-variant ${log.action === "delete" ? "line-through text-error/60" : ""}`}>
                    {log.fileName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
