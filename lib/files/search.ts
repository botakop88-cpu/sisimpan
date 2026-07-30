import type { SupabaseClient } from "@supabase/supabase-js";

export type FileCategory = "all" | "image" | "video" | "audio" | "document" | "other";
export type SortField = "created_at" | "name" | "original_size";
export type SortDir = "asc" | "desc";

export interface SearchFilesParams {
  query?: string;
  category?: FileCategory;
  sortBy?: SortField;
  sortDir?: SortDir;
}

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

/**
 * Search file milik user yang login (RLS di Supabase otomatis membatasi
 * ini). Dipakai bareng oleh GET /api/files/search DAN halaman /files
 * (server component) supaya logic query-nya tidak duplikat di 2 tempat.
 */
export async function searchFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  { query, category = "all", sortBy = "created_at", sortDir = "desc" }: SearchFilesParams
) {
  let q = supabase
    .from("files")
    .select("id, name, mime_type, original_size, chunk_count, status, created_at")
    .neq("status", "deleted");

  if (query && query.trim()) {
    q = q.ilike("name", `%${query.trim()}%`);
  }

  if (category === "image") q = q.ilike("mime_type", "image/%");
  else if (category === "video") q = q.ilike("mime_type", "video/%");
  else if (category === "audio") q = q.ilike("mime_type", "audio/%");
  else if (category === "document") q = q.in("mime_type", DOCUMENT_MIME_TYPES);
  else if (category === "other") {
    q = q
      .not("mime_type", "ilike", "image/%")
      .not("mime_type", "ilike", "video/%")
      .not("mime_type", "ilike", "audio/%")
      .not("mime_type", "in", `(${DOCUMENT_MIME_TYPES.map((m) => `"${m}"`).join(",")})`);
  }

  q = q.order(sortBy, { ascending: sortDir === "asc" });

  const { data, error } = await q;
  return { data, error };
}
