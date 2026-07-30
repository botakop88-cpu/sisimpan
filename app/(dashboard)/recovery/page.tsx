"use client";

import { useEffect, useState } from "react";

type RecoveryFile = {
  id: string;
  name: string;
  totalChunks: number;
  missingChunks: number[];
};

export default function RecoveryPage() {
  const [files, setFiles] = useState<RecoveryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files/recovery");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFiles(json.files ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recovery list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markFailed(fileId: string) {
    if (!confirm("Mark this file as failed? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/files/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-lg text-on-surface">Recovery</h1>
          <p className="text-sm text-on-surface-variant">Files with missing cloud chunks</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-all disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>refresh</span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-error/30 bg-error-container p-4 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-on-surface-variant">Loading...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-outline text-3xl">hard_drive</span>
          </div>
          <p className="text-sm text-on-surface-variant">No files need recovery.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((f) => (
            <div key={f.id} className="rounded-xl border border-tertiary-fixed-dim bg-surface-container-lowest p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary-fixed text-tertiary">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">{f.name}</h3>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      {f.missingChunks.length} of {f.totalChunks} chunks missing
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markFailed(f.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-1.5 text-sm text-error hover:bg-error-container transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Mark Failed
                </button>
              </div>
              {f.missingChunks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {f.missingChunks.map((ci) => (
                    <span key={ci} className="rounded-md bg-error-container px-2 py-0.5 text-xs font-mono text-error">
                      chunk #{ci + 1}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
