"use client";

import { useEffect, useState } from "react";
import { useDownload } from "@/components/download/use-download";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface ShareInfo {
  name: string;
  size: number;
  mimeType: string;
  requiresPassword: boolean;
}

export function SharePageClient({ token }: { token: string }) {
  const { state, download } = useDownload();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setLoadError(
            json.error === "expired"
              ? "Link ini sudah kedaluwarsa."
              : json.error === "not_ready"
                ? "File belum siap dibagikan."
                : "Link tidak ditemukan atau sudah dicabut."
          );
          return;
        }
        setInfo(json);
      })
      .catch(() => setLoadError("Gagal memuat informasi file."));
  }, [token]);

  async function handleDownload() {
    await download(`/api/share/${token}/download`, info?.requiresPassword ? { password } : {});
  }

  const busy = state.stage === "fetching_manifest" || state.stage === "downloading";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-4">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-outline">SISIMPAN</p>
          <h1 className="mt-1 text-lg font-semibold text-on-surface">File Dibagikan</h1>
        </div>

        {loadError && <p className="text-center text-sm text-error">{loadError}</p>}

        {!loadError && !info && (
          <p className="text-center text-sm text-on-surface-variant">Memuat...</p>
        )}

        {info && (
          <div className="space-y-4">
            <div className="rounded-lg border border-outline-variant p-4 text-center">
              <p className="truncate text-sm font-medium text-on-surface">{info.name}</p>
              <p className="text-xs text-on-surface-variant">{formatBytes(info.size)}</p>
            </div>

            {info.requiresPassword && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm"
                  placeholder="Masukkan password"
                />
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={busy}
              className="w-full rounded-md bg-on-surface py-2 text-sm font-medium text-white hover:bg-on-surface disabled:opacity-50"
            >
              {state.stage === "fetching_manifest" && "Menyiapkan..."}
              {state.stage === "downloading" &&
                `Mengunduh (${state.progressParts}/${state.totalParts})...`}
              {(state.stage === "idle" || state.stage === "done") && "Download File"}
              {state.stage === "failed" && "Coba Lagi"}
            </button>

            {state.stage === "failed" && (
              <p className="text-center text-xs text-error">{state.errorMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
