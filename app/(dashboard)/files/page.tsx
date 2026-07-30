import { createClient } from "@/lib/supabase/server";
import { FileUploader } from "@/components/upload/file-uploader";
import { FileRowActions } from "@/components/files/file-row-actions";
import { FileSearchBar } from "@/components/files/file-search-bar";
import { searchFiles, type FileCategory, type SortField, type SortDir } from "@/lib/files/search";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-primary-fixed text-on-primary-fixed-variant",
  uploading: "bg-surface-container-high text-on-surface-variant",
  partial_failed: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  failed: "bg-error-container text-on-error-container",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  uploading: "Uploading",
  partial_failed: "Partial Failed",
  failed: "Failed",
};

const FILE_TYPE_ICONS: Record<string, string> = {
  image: "image",
  video: "movie",
  audio: "audio_file",
  document: "description",
  pdf: "picture_as_pdf",
  other: "insert_drive_file",
};

const FILE_TYPE_COLORS: Record<string, string> = {
  image: "bg-green-50 text-green-600",
  video: "bg-primary-fixed text-primary",
  audio: "text-tertiary bg-tertiary-fixed",
  document: "bg-secondary-container text-secondary",
  pdf: "bg-red-50 text-error",
  other: "text-on-surface-variant bg-surface-container-high",
};

const FOLDER_COLORS = ["text-orange-500", "text-blue-500", "text-green-600", "text-purple-500"];

const FILE_ICON_MAP: Record<string, string> = {
  pdf: "picture_as_pdf",
  video: "movie",
  archive: "folder_zip",
  image: "image",
  document: "description",
  presentation: "present_to_all",
};

const FILE_ICON_COLORS: Record<string, string> = {
  pdf: "text-error",
  video: "text-primary",
  archive: "text-tertiary",
  image: "text-green-600",
  document: "text-secondary",
  presentation: "text-orange-500",
};

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sortBy?: string; sortDir?: string }>;
}) {
  const { q, category, sortBy, sortDir } = await searchParams;
  const supabase = await createClient();

  const { data: files } = await searchFiles(supabase, {
    query: q,
    category: (category as FileCategory) ?? "all",
    sortBy: (sortBy as SortField) ?? "created_at",
    sortDir: (sortDir as SortDir) ?? "desc",
  });

  const isFiltered = Boolean(q || (category && category !== "all"));

  const folderDateRanges = ["2025", "2024", "2023", "2022"];
  const folders = (folderDateRanges.map((year, i) => {
    const yearFiles = (files ?? []).filter((f) => new Date(f.created_at).getFullYear().toString() === year);
    if (yearFiles.length === 0) return null;
    const totalSize = yearFiles.reduce((sum, f) => sum + f.original_size, 0);
    return { name: `Archive ${year}`, count: yearFiles.length, size: formatBytes(totalSize), color: FOLDER_COLORS[i % FOLDER_COLORS.length] };
  }).filter(Boolean)) as { name: string; count: number; size: string; color: string }[];

  const fileTypes = ["pdf", "image", "video", "document"].map((type) => {
    const typeFiles = (files ?? []).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (type === "pdf") return ext === "pdf";
      if (type === "image") return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
      if (type === "video") return ["mp4", "webm", "avi", "mov"].includes(ext);
      if (type === "document") return ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext);
      return false;
    });
    if (typeFiles.length === 0) return null;
    const totalSize = typeFiles.reduce((sum, f) => sum + f.original_size, 0);
    return { name: type.charAt(0).toUpperCase() + type.slice(1), count: typeFiles.length, size: formatBytes(totalSize), color: FOLDER_COLORS[type === "pdf" ? 0 : type === "image" ? 1 : type === "video" ? 2 : 3] };
  }).filter(Boolean) as { name: string; count: number; size: string; color: string }[];

  const displayFolders = folders.length >= 2 ? folders : fileTypes.slice(0, 4);

  const fileExtension = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["mp4", "webm", "avi", "mov"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg"].includes(ext)) return "audio";
    if (["pdf"].includes(ext)) return "pdf";
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)) return "document";
    return "other";
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return FILE_ICON_MAP.image;
    if (["mp4", "webm", "avi", "mov"].includes(ext)) return FILE_ICON_MAP.video;
    if (["mp3", "wav", "ogg"].includes(ext)) return "audio_file";
    if (["pdf"].includes(ext)) return FILE_ICON_MAP.pdf;
    if (["doc", "docx", "xls", "xlsx", "txt"].includes(ext)) return FILE_ICON_MAP.document;
    if (["ppt", "pptx"].includes(ext)) return FILE_ICON_MAP.presentation;
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FILE_ICON_MAP.archive;
    return "insert_drive_file";
  };

  const getFileIconColor = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return FILE_ICON_COLORS.image;
    if (["mp4", "webm", "avi", "mov"].includes(ext)) return FILE_ICON_COLORS.video;
    if (["mp3", "wav", "ogg"].includes(ext)) return "text-tertiary";
    if (["pdf"].includes(ext)) return FILE_ICON_COLORS.pdf;
    if (["doc", "docx", "xls", "xlsx", "txt"].includes(ext)) return FILE_ICON_COLORS.document;
    if (["ppt", "pptx"].includes(ext)) return FILE_ICON_COLORS.presentation;
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FILE_ICON_COLORS.archive;
    return "text-on-surface-variant";
  };

  const getFileBg = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "bg-green-50";
    if (["mp4", "webm", "avi", "mov"].includes(ext)) return "bg-blue-50";
    if (["mp3", "wav", "ogg"].includes(ext)) return "bg-surface-container-high";
    if (["pdf"].includes(ext)) return "bg-red-50";
    if (["doc", "docx", "xls", "xlsx", "txt"].includes(ext)) return "bg-secondary-container";
    if (["ppt", "pptx"].includes(ext)) return "bg-orange-50";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "bg-yellow-50";
    return "bg-surface-container-high";
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
        <div>
          <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-1">
            <span className="hover:text-primary cursor-pointer">Home</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-semibold text-on-surface truncate">Files</span>
          </nav>
          <h2 className="font-display text-headline-md text-on-surface">My Files</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface rounded-lg font-title-sm hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
            New Folder
          </button>
          <FileUploader />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex flex-wrap items-center gap-3 transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-body-base cursor-pointer hover:bg-surface-container-high transition-colors">
          <span className="text-body-base text-on-surface">All Providers</span>
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-body-base cursor-pointer hover:bg-surface-container-high transition-colors">
          <span className="text-body-base text-on-surface">All Types</span>
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-body-base cursor-pointer hover:bg-surface-container-high transition-colors">
          <span className="text-body-base text-on-surface">All Sizes</span>
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </div>
        <div className="h-6 w-px bg-outline-variant mx-1" />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-body-base cursor-pointer hover:bg-surface-container-high transition-colors">
          <span className="text-body-base text-on-surface">Newest First</span>
          <span className="material-symbols-outlined text-sm">sort</span>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant">
          <button className="p-1.5 bg-white text-primary rounded shadow-sm">
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </button>
          <button className="p-1.5 text-on-surface-variant hover:bg-white/50 rounded transition-colors">
            <span className="material-symbols-outlined text-[20px]">list</span>
          </button>
        </div>
      </div>

      {/* Folders Section */}
      {displayFolders.length > 0 && (
      <section>
        <h3 className="text-title-sm font-title-sm text-on-surface mb-4">Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap">
          {displayFolders.map((folder) => (
            <div key={folder.name} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 transition-all cursor-pointer group hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-12 h-12 rounded-lg bg-${folder.color.includes("text-") ? "surface-container-high" : "surface-container-high"} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-3xl ${folder.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                </div>
                <button className="p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
              <h4 className="font-semibold text-body-base text-on-surface truncate">{folder.name}</h4>
              <p className="text-body-sm text-on-surface-variant">{folder.count} files • {folder.size}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* All Files Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title-sm font-title-sm text-on-surface">Recent Files</h3>
          <a className="text-primary text-body-sm font-semibold hover:underline" href="#">View All</a>
        </div>

        {!files || files.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
              <span className="material-symbols-outlined text-outline text-3xl">description</span>
            </div>
            <p className="text-sm text-on-surface-variant">
              {isFiltered ? "No files match your search." : "No files uploaded yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-card-gap">
            {files.map((f) => {
              const iconName = getFileIcon(f.name);
              const iconColor = getFileIconColor(f.name);
              const iconBg = getFileBg(f.name);

              return (
                <div key={f.id} className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 transition-all cursor-pointer group hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-primary/20">
                  <div className="h-32 bg-surface-container-low flex items-center justify-center relative">
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-60">
                      <span className={`material-symbols-outlined text-5xl ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                    </div>
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm">
                      <span className="material-symbols-outlined text-primary text-[16px]">cloud</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-1 overflow-hidden min-w-0 flex-1">
                        <span className={`material-symbols-outlined text-[18px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                        <h5 className="font-semibold text-body-base text-on-surface truncate">{f.name}</h5>
                      </div>
                      <button className="p-1 text-on-surface-variant shrink-0">
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-body-sm text-on-surface-variant mt-1">
                      <span>{formatBytes(f.original_size)}</span>
                      <span>{new Date(f.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-all hover:scale-105 active:scale-95">
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </div>
    </div>
  );
}
