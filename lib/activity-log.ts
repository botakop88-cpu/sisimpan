/**
 * Layanan audit log — catat aktivitas user ke tabel activity_logs.
 *
 * Dipanggil dari route handler setelah operasi sukses:
 *   await logActivity(supabase, user.id, "upload", file.id, { name: file.name });
 *
 * RLS di Supabase mengizinkan INSERT hanya untuk user sendiri.
 */
type ActionType = "upload" | "download" | "share" | "delete";

export async function logActivity(
  supabase: any,
  userId: string,
  action: ActionType,
  fileId: string | null,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    file_id: fileId,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Gagal catat activity_log:", error);
  }
}
