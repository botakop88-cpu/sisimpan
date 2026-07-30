"use client";

import { useEffect, useState } from "react";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

type SearchResult = {
  id: string;
  name: string;
  mime_type: string;
  original_size: number;
  chunk_count: number;
  status: string;
  created_at: string;
};

const FILE_ICON: Record<string, string> = {
  pdf: "picture_as_pdf",
  video: "movie",
  archive: "folder_zip",
  image: "image",
  document: "description",
  presentation: "present_to_all",
};

const FILE_COLOR: Record<string, string> = {
  pdf: "bg-red-50 text-red-600",
  video: "bg-blue-50 text-blue-600",
  archive: "bg-yellow-50 text-yellow-600",
  image: "bg-green-50 text-green-600",
  document: "bg-emerald-50 text-emerald-600",
  presentation: "bg-orange-50 text-orange-600",
};

function getFileMeta(name: string): { icon: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return { icon: FILE_ICON.image, color: FILE_COLOR.image };
  if (["mp4", "webm", "avi", "mov"].includes(ext)) return { icon: FILE_ICON.video, color: FILE_COLOR.video };
  if (["mp3", "wav", "ogg"].includes(ext)) return { icon: "audio_file", color: "bg-surface-container-high text-on-surface-variant" };
  if (["pdf"].includes(ext)) return { icon: FILE_ICON.pdf, color: FILE_COLOR.pdf };
  if (["doc", "docx", "xls", "xlsx", "txt"].includes(ext)) return { icon: FILE_ICON.document, color: FILE_COLOR.document };
  if (["ppt", "pptx"].includes(ext)) return { icon: FILE_ICON.presentation, color: FILE_COLOR.presentation };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return { icon: FILE_ICON.archive, color: FILE_COLOR.archive };
  return { icon: "insert_drive_file", color: "bg-surface-container-high text-on-surface-variant" };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  async function doSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.files ?? []);
      setTotal(json.files?.length ?? 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-on-surface-variant mb-2">
          <span className="text-body-sm hover:text-primary cursor-pointer">Home</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-body-sm font-semibold text-primary">Search Results</span>
        </nav>
        <h2 className="font-display text-display-lg text-on-surface tracking-tight">Search Results</h2>
        {query && (
          <p className="text-body-base text-on-surface-variant">
            Ditemukan <span className="font-bold text-on-surface">{total} hasil</span> untuk &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-surface-container-low rounded-full px-4 py-1.5 w-full md:w-[400px] border border-outline-variant/30 focus-within:border-primary transition-all">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-body-base w-full ml-2 text-on-surface outline-none placeholder:text-outline"
            placeholder="Search files..."
          />
        </div>
        <div className="relative">
          <select className="appearance-none bg-surface-container-lowest border border-outline-variant pl-4 pr-10 py-2 rounded-lg text-body-base focus:ring-primary focus:border-primary cursor-pointer text-on-surface outline-none">
            <option>Newest First</option>
            <option>Oldest First</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Searching...</p>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-outline text-3xl">search</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {query ? "No files match your search." : "Type a query to search files."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-outline-variant bg-surface-container-low text-label-caps text-on-surface-variant">
            <div className="col-span-6 font-medium">FILE NAME</div>
            <div className="col-span-2 font-medium">SIZE</div>
            <div className="col-span-2 font-medium">STATUS</div>
            <div className="col-span-2 font-medium text-right">MODIFIED</div>
          </div>

          {results.map((file) => {
            const { icon, color } = getFileMeta(file.name);
            return (
              <div key={file.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-surface-container transition-all cursor-pointer items-center border-b border-outline-variant last:border-0 group">
                <div className="col-span-6 flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-base font-bold group-hover:text-primary transition-colors truncate">{file.name}</p>
                    <p className="text-body-sm text-on-surface-variant truncate">{file.mime_type || "Unknown type"}</p>
                  </div>
                </div>
                <div className="col-span-2 text-body-base text-on-surface-variant">{formatBytes(file.original_size)}</div>
                <div className="col-span-2">
                  <span className={`text-xs font-medium ${
                    file.status === "ready" ? "text-primary" :
                    file.status === "uploading" ? "text-on-surface-variant" :
                    file.status === "failed" ? "text-error" : "text-tertiary"
                  }`}>{file.status}</span>
                </div>
                <div className="col-span-2 text-right text-body-base text-on-surface-variant">
                  {new Date(file.created_at).toLocaleDateString("id-ID")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
