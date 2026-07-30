"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUpload } from "./use-upload";


function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const STAGE_LABEL: Record<string, string> = {
  planning: "Planning split across accounts...",
  hashing: "Calculating checksum...",
  dedup: "Checking for duplicates...",
  uploading: "Uploading to cloud...",
  done: "Complete",
  failed: "Failed",
};

export function FileUploader() {
  const router = useRouter();
  const { state, upload, reset } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = state.stage !== "idle" && state.stage !== "done" && state.stage !== "failed";
  const progressPct =
    state.totalBytes > 0 ? Math.min(100, (state.progressBytes / state.totalBytes) * 100) : 0;

  async function handleFile(file: File) {
    await upload(file);
    router.refresh();
  }

  return (
    <>
      {state.stage === "idle" ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-all hover:brightness-110 active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
          Upload
        </button>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file && !busy) handleFile(file); }}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging ? "border-primary bg-primary-container/10" : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
          }`}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[24px]">cloud</span>
          </div>
          <p className="text-sm font-semibold text-on-surface">Drop files here or click to browse</p>
          <p className="mt-1 text-xs text-on-surface-variant">Max file size depends on available cloud storage</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
        </div>
      )}

      {busy && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-on-surface">{state.fileName}</span>
            <span className="text-xs text-on-surface-variant">{STAGE_LABEL[state.stage]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-outline">
            <span>{state.progressBytes > 0 ? formatBytes(state.progressBytes) : "..."}</span>
            <span>{STAGE_LABEL[state.stage]}</span>
          </div>
        </div>
      )}

      {state.stage === "done" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary font-medium">Upload complete</span>
          <button onClick={reset} className="text-xs text-on-surface-variant hover:text-on-surface underline">Upload another</button>
        </div>
      )}

      {state.stage === "failed" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-error font-medium">{state.errorMessage || "Upload failed"}</span>
          <button onClick={reset} className="text-xs text-on-surface-variant hover:text-on-surface underline">Try again</button>
        </div>
      )}
    </>
  );
}
