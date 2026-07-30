"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDownload } from "@/components/download/use-download";


export function FileRowActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const router = useRouter();
  const { state, download, reset } = useDownload();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [expiresInHours, setExpiresInHours] = useState("168");
  const [password, setPassword] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDownload() {
    await download(`/api/files/${fileId}/download`);
  }

  async function handleGenerateShare() {
    setShareBusy(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresInHours: expiresInHours === "0" ? null : Number(expiresInHours),
          password: password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setShareError(json.message ?? json.error ?? "Failed to create link");
        return;
      }
      setShareLink(`${window.location.origin}/share/${json.shareToken}`);
    } finally {
      setShareBusy(false);
    }
  }

  function handleCopy() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${fileName}"? File will also be removed from cloud storage.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message ?? json.error ?? "Failed to delete file");
        return;
      }
      if (json.warning) alert(json.warning);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const busy = state.stage === "fetching_manifest" || state.stage === "downloading";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDownload}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-2.5 py-1 text-xs font-medium text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[12px]">download</span>
        {state.stage === "fetching_manifest" && "Preparing..."}
        {state.stage === "downloading" && `${state.progressParts}/${state.totalParts}`}
        {(state.stage === "idle" || state.stage === "done") && "Download"}
        {state.stage === "failed" && "Retry"}
      </button>

      <button
        onClick={() => setShareOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-2.5 py-1 text-xs font-medium text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
      >
        <span className="material-symbols-outlined text-[12px]">share</span> Share
      </button>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 rounded-md border border-error/30 px-2.5 py-1 text-xs font-medium text-error transition-all hover:bg-error-container disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[12px]">delete</span>
        {deleting ? "..." : "Delete"}
      </button>

      {state.stage === "failed" && (
        <span className="flex items-center gap-1 text-xs text-error">
          <span className="material-symbols-outlined text-[10px]">error</span> {state.errorMessage}
        </span>
      )}

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-surface-container-lowest p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">Share &ldquo;{fileName}&rdquo;</h3>
              <button
                onClick={() => {
                  setShareOpen(false);
                  setShareLink(null);
                  reset();
                }}
                className="text-outline hover:text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {!shareLink ? (
              <>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined text-[12px]">schedule</span> Expiration
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="24">1 day</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                    <option value="0">No expiration</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined text-[12px]">lock</span> Password (optional)
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank if not needed"
                    className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                {shareError && (
                  <p className="flex items-center gap-1 text-xs text-error">
                    <span className="material-symbols-outlined text-[10px]">error</span> {shareError}
                  </p>
                )}
                <button
                  onClick={handleGenerateShare}
                  disabled={shareBusy}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {shareBusy ? "Creating link..." : "Create Share Link"}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2">
                  <span className="material-symbols-outlined shrink-0 text-[14px] text-outline">language</span>
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 truncate bg-transparent text-xs text-on-surface-variant outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-on-primary transition-all hover:brightness-110"
                  >
                    {copied ? <span className="material-symbols-outlined text-[12px]">check</span> : <span className="material-symbols-outlined text-[12px]">content_copy</span>}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Anyone with this link can download the file{password ? " (password required)" : ""}.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
