"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


type CloudAccount = {
  id: string;
  provider: string;
  provider_email: string;
  account_owner_type: string;
  storage_used: number;
  storage_limit: number;
  status: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const PROVIDER_LABEL: Record<string, string> = {
  google_drive: "Google Drive",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  expired: "Token Expired",
  revoked: "Revoked",
};

const PROVIDER_ICONS: Record<string, string> = {
  google_drive: "G",
  onedrive: "O",
  dropbox: "D",
};

export function AccountList({ initialAccounts }: { initialAccounts: CloudAccount[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSync(id: string) {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/storage/accounts/${id}/sync-quota`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Sync failed");
        return;
      }
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, storage_used: json.quota.usage, storage_limit: json.quota.limit }
            : a
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Disconnect this account?")) return;
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/storage/accounts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.message ?? json.error ?? "Delete failed");
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
          <span className="material-symbols-outlined text-[28px] text-outline">hard_drive</span>
        </div>
        <p className="text-sm text-on-surface-variant">
          No cloud accounts connected yet. Click a provider above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <p className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {errorMsg}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {accounts.map((a) => {
          const isInstitution = a.account_owner_type === "institution";
          const isActive = a.status === "active";
          const pct =
            a.storage_limit > 0 ? Math.min(100, Math.round((a.storage_used / a.storage_limit) * 100)) : 0;

          return (
            <div key={a.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                    a.provider === "google_drive" ? "bg-primary-fixed text-primary" :
                    a.provider === "onedrive" ? "bg-secondary-container text-secondary" :
                    "bg-tertiary-fixed text-tertiary"
                  }`}>
                    {PROVIDER_ICONS[a.provider] || "C"}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-on-surface">{a.provider_email}</h4>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        {PROVIDER_LABEL[a.provider] ?? a.provider}
                      </span>
                      <span className="rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        {isInstitution ? "Institution" : "Personal"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isActive
                          ? "bg-primary-fixed text-on-primary-fixed-variant"
                          : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                      }`}>
                        {!isActive && <span className="material-symbols-outlined text-[11px]">warning</span>}
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between text-sm">
                  <span className="text-on-surface-variant">Storage</span>
                  <span className="font-semibold text-on-surface">
                    {formatBytes(a.storage_used)} / {formatBytes(a.storage_limit)}
                  </span>
                </div>
                <div className="relative h-8 w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-700 ${
                      isActive ? "bg-primary" : "bg-secondary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white mix-blend-difference">
                      {pct}% Used
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {isActive ? (
                  <button
                    onClick={() => handleSync(a.id)}
                    disabled={busyId === a.id}
                    className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-surface-container-low disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${busyId === a.id ? "animate-spin" : ""}`}>refresh</span>
                    Sync Quota
                  </button>
                ) : (
                  <a
                    href={`/api/storage/accounts/${a.provider}/connect`}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-all hover:brightness-110"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    Re-authenticate
                  </a>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={busyId === a.id}
                  className="flex items-center gap-2 rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-all hover:bg-error-container disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">link_off</span>
                  Disconnect
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
