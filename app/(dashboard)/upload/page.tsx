"use client";

import { useState, useRef } from "react";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

type UploadItem = {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  progress: number;
  current: string;
  total: string;
  speed: string;
  remaining: string;
};

const TARGETS = [
  { id: "google_drive", label: "Google Drive", free: "320 GB free", icon: "cloud", color: "text-blue-600" },
  { id: "onedrive", label: "OneDrive", free: "15 GB free", icon: "cloud_queue", color: "text-blue-400" },
  { id: "dropbox", label: "Dropbox", free: "4 TB free", icon: "box", color: "text-blue-500" },
];

const FILE_ICON_MAP: Record<string, { icon: string; bg: string }> = {
  image: { icon: "image", bg: "bg-green-50 text-green-600" },
  video: { icon: "movie", bg: "bg-[#DEE3ED] text-primary" },
  audio: { icon: "audio_file", bg: "bg-surface-container-high text-on-surface-variant" },
  pdf: { icon: "picture_as_pdf", bg: "bg-red-50 text-error" },
  archive: { icon: "folder_zip", bg: "bg-[#FFDAD6] text-error" },
  document: { icon: "description", bg: "bg-secondary-container text-secondary" },
  other: { icon: "insert_drive_file", bg: "bg-surface-container-high text-on-surface-variant" },
};

function getFileInfo(name: string): { icon: string; bg: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return FILE_ICON_MAP.image;
  if (["mp4", "webm", "avi", "mov"].includes(ext)) return FILE_ICON_MAP.video;
  if (["mp3", "wav", "ogg"].includes(ext)) return FILE_ICON_MAP.audio;
  if (["pdf"].includes(ext)) return FILE_ICON_MAP.pdf;
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)) return FILE_ICON_MAP.document;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FILE_ICON_MAP.archive;
  return FILE_ICON_MAP.other;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [target, setTarget] = useState("google_drive");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      const { icon, bg } = getFileInfo(file.name);
      const newUpload: UploadItem = {
        id,
        name: file.name,
        icon,
        iconBg: bg,
        progress: 0,
        current: "0 B",
        total: formatBytes(file.size),
        speed: "0 MB/s",
        remaining: "...",
      };
      setUploads((prev) => [...prev, newUpload]);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", target);

      try {
        const res = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            originalSize: file.size,
            checksumSha256: "pending",
            chunkCount: 1,
          }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const { fileId } = await res.json();

        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, progress: 100, current: u.total, remaining: "Completed" } : u
          )
        );
      } catch {
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: 0, remaining: "Failed" } : u))
        );
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-headline-md text-on-surface">Upload File</h2>
        <p className="text-body-base text-on-surface-variant">Select target destination and upload your resources to the cloud.</p>
      </div>

      <div className="grid grid-cols-12 gap-card-gap">
        <div className="col-span-12 lg:col-span-8 space-y-card-gap">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            className="bg-surface-container-lowest rounded-xl p-10 flex flex-col items-center justify-center min-h-[340px] text-center transition-all hover:bg-primary-container/5 group cursor-pointer relative overflow-hidden"
            style={{ background: isDragging ? "rgba(0,97,255,0.05)" : undefined }}
          >
            <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "inherit" }}>
              <rect width="100%" height="100%" fill="none" stroke={isDragging ? "#0061ff" : "#c2c6d9"} strokeWidth="2" strokeDasharray="12, 12" strokeLinecap="square" />
            </svg>
            <div className="w-20 h-20 rounded-full bg-primary-container/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-[40px]">cloud_upload</span>
            </div>
            <h3 className="font-display text-headline-md text-on-surface mb-2">Drag & drop files here</h3>
            <p className="text-body-base text-on-surface-variant mb-6 max-w-sm mx-auto">Upload large media, student databases, or compressed archives up to 5GB per file.</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => inputRef.current?.click()}
                className="px-8 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:shadow-lg active:scale-95 transition-all"
              >
                Select Files
              </button>
              <span className="text-on-surface-variant">or</span>
              <button className="px-8 py-3 border border-outline text-primary font-semibold rounded-lg hover:bg-surface-container-low active:scale-95 transition-all">
                Select Folder
              </button>
            </div>
            <input ref={inputRef} type="file" className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {uploads.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-title-sm text-on-surface">Uploading ({uploads.length})</h3>
                <button className="text-primary text-body-sm font-semibold hover:underline">Pause All</button>
              </div>
              <div className="space-y-4">
                {uploads.map((u) => (
                  <div key={u.id} className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/50">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${u.iconBg} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined">{u.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="min-w-0">
                            <p className="text-body-base font-bold text-on-surface truncate">{u.name}</p>
                            <p className="text-body-sm text-on-surface-variant">{u.current} / {u.total} • <span className="text-primary">{u.speed}</span></p>
                          </div>
                          <button className="p-1 hover:bg-surface-container-high rounded-full shrink-0">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
                          </button>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${u.progress}%` }} />
                          </div>
                          <p className="text-right text-body-sm mt-1 text-primary font-medium">{u.progress}% complete • {u.remaining}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-card-gap">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
            <h3 className="text-title-sm text-on-surface mb-4">Upload Target</h3>
            <div className="space-y-3">
              {TARGETS.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    target === t.id
                      ? "border-2 border-primary bg-primary-container/5"
                      : "border border-outline-variant hover:border-primary/50"
                  }`}
                >
                  <input type="radio" name="target" value={t.id} checked={target === t.id} onChange={() => setTarget(t.id)} className="text-primary focus:ring-primary w-5 h-5" />
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className={`material-symbols-outlined ${t.color}`}>{t.icon}</span>
                    <span className="text-body-base font-bold text-on-surface truncate">{t.label}</span>
                  </div>
                  <span className="text-body-sm text-on-surface-variant shrink-0">{t.free}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
            <h3 className="text-title-sm text-on-surface mb-4">Upload Options</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-2">TARGET FOLDER</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">folder_open</span>
                  <span className="text-body-base flex-1 truncate text-on-surface">/Centralized/Cloud_Aggregator/Uploads</span>
                  <button className="text-primary font-bold text-body-sm">Change</button>
                </div>
              </div>
              <div>
                <label className="block text-label-caps text-on-surface-variant mb-2">UPLOAD TYPE</label>
                <select className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-base focus:ring-primary text-on-surface outline-none">
                  <option>Standard Upload</option>
                  <option>Multi-threaded Chunking</option>
                  <option>Compressed Upload</option>
                </select>
              </div>
              {["Auto-resume on failure", "Notify colleagues on finish", "Integrity Check (SHA-256)", "Auto-split large files"].map((option, i) => (
                <div key={option} className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative inline-flex items-center">
                      <input type="checkbox" defaultChecked={i === 0 || i >= 2} className="sr-only peer" />
                      <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                    <span className="text-body-base font-medium text-on-surface">{option}</span>
                  </label>
                </div>
              ))}
              <div className="flex items-start gap-2 p-3 bg-primary-container/5 rounded-lg border border-primary-container/20">
                <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                <p className="text-body-sm text-on-surface-variant">Privacy: We only use the <code className="bg-surface-container-high px-1 rounded">drive.file</code> scope to access files created by this app.</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
              >
                START UPLOAD
              </button>
              <button
                onClick={() => setUploads([])}
                className="w-full py-3 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-all"
              >
                CANCEL ALL
              </button>
            </div>
          </div>

          <div className="bg-[#0061FF] rounded-xl p-6 text-white overflow-hidden relative group">
            <div className="relative z-10">
              <h4 className="font-display text-headline-md leading-tight mb-2 text-white">Cloud Synching</h4>
              <p className="text-body-sm opacity-90 mb-4">Your local files are being mirrored to 3 cloud providers simultaneously.</p>
              <div className="flex -space-x-2">
                {["G", "O", "D"].map((letter) => (
                  <div key={letter} className="w-8 h-8 rounded-full border-2 border-primary bg-white flex items-center justify-center text-primary text-xs font-bold">
                    {letter}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
