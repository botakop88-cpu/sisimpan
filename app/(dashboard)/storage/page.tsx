import { createClient } from "@/lib/supabase/server";
import { AccountList } from "@/components/storage/account-list";

const ERROR_MESSAGES: Record<string, string> = {
  connection_cancelled: "Kamu membatalkan proses koneksi.",
  invalid_oauth_state: "Sesi koneksi tidak valid atau kedaluwarsa, coba lagi.",
  not_logged_in: "Sesi login berakhir, silakan login ulang lalu coba lagi.",
  no_refresh_token_try_disconnect_first:
    "Provider tidak mengirim izin baru. Putuskan dulu akun ini (kalau sudah pernah connect), lalu connect ulang.",
  token_exchange_failed: "Gagal menghubungkan, coba lagi.",
  db_error: "Gagal menyimpan data akun, coba lagi.",
};

const PROVIDER_LABELS: Record<string, string> = {
  google_drive: "Google Drive",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
};

const PROVIDER_CONNECT_URLS: Record<string, string> = {
  google_drive: "/api/storage/accounts/google/connect",
  onedrive: "/api/storage/accounts/onedrive/connect",
  dropbox: "/api/storage/accounts/dropbox/connect",
};

const PROVIDER_ICONS: Record<string, string> = {
  google_drive: "add_to_drive",
  onedrive: "cloud",
  dropbox: "box",
};

const PROVIDER_COLORS: Record<string, string> = {
  google_drive: "text-[#4285F4]",
  onedrive: "text-[#0078D4]",
  dropbox: "text-[#0061FF]",
};

const PROVIDERS = ["google_drive", "onedrive", "dropbox"] as const;

export default async function StoragePage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("cloud_accounts")
    .select("id, provider, provider_email, account_owner_type, storage_used, storage_limit, status")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-display-lg text-on-surface">Storage Accounts</h1>
          <p className="text-sm text-on-surface-variant">
            Connect and manage your cloud storage accounts in one pool
          </p>
        </div>
      </div>

      {connected && (
        <p className="rounded-lg border border-primary/20 bg-primary-fixed px-4 py-3 text-sm font-medium text-on-primary-fixed-variant">
          Account connected successfully.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {ERROR_MESSAGES[error] ?? "Terjadi kesalahan saat menghubungkan akun."}
        </p>
      )}

      {/* Provider Cards — always show connect, with count of connected accounts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const providerAccounts = accounts?.filter((a) => a.provider === provider) ?? [];
          const activeCount = providerAccounts.filter((a) => a.status === "active").length;
          const totalStr = providerAccounts.length === 0
            ? "Not connected"
            : `${activeCount}/${providerAccounts.length} active`;

          return (
            <div key={provider} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: provider === "google_drive" ? "#E8F0FE" : provider === "onedrive" ? "#E6F3FF" : "#E8F4FD" }}>
                  <span className={`material-symbols-outlined text-[24px] ${PROVIDER_COLORS[provider]}`}>
                    {PROVIDER_ICONS[provider]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{PROVIDER_LABELS[provider]}</p>
                  <p className={`text-xs ${providerAccounts.length > 0 ? "text-primary" : "text-outline"}`}>
                    {totalStr}
                    {providerAccounts.length > 0 && ` — ${providerAccounts.reduce((s, a) => s + (a.storage_limit || 0), 0) / (1024**3)} GB pooled`}
                  </p>
                </div>
                <a
                  href={PROVIDER_CONNECT_URLS[provider]}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition-all hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Add
                </a>
              </div>
              {providerAccounts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {providerAccounts.map((a) => (
                    <span key={a.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.status === "active"
                        ? "bg-primary-fixed text-on-primary-fixed-variant"
                        : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.status === "active" ? "bg-primary" : "bg-tertiary"}`} />
                      {a.provider_email}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AccountList initialAccounts={accounts ?? []} />
    </div>
  );
}
