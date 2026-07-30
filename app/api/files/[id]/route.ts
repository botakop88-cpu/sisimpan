import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { ensureValidAccessToken } from "@/lib/cloud/token-manager";
import { deleteRemoteFile as deleteGoogleDriveFile } from "@/lib/cloud/google-drive";
import { deleteOneDriveRemoteFile } from "@/lib/cloud/onedrive";
import { deleteDropboxRemoteFile } from "@/lib/cloud/dropbox";

const DELETERS: Record<string, (token: string, fileId: string) => Promise<void>> = {
  google_drive: deleteGoogleDriveFile,
  onedrive: deleteOneDriveRemoteFile,
  dropbox: deleteDropboxRemoteFile,
};

/**
 * DELETE /api/files/[id]
 * Hapus file: bersihkan semua bagian (chunk) di cloud provider, hapus baris
 * file_chunks, lalu tandai baris files sebagai 'deleted' (soft delete --
 * bukan hard delete, supaya jejaknya masih ada untuk audit log nanti di
 * epic Admin/Monitoring).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id, status")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (file.status === "deleted") {
    return NextResponse.json({ success: true }); // sudah terhapus, tidak masalah
  }

  const { data: chunks } = await supabase
    .from("file_chunks")
    .select("id, cloud_account_id, remote_file_id, chunk_size")
    .eq("file_id", fileId);

  // Kumpulkan cloud_account_ids untuk cari provider tiap akun
  const accountIds = [...new Set((chunks ?? []).map((c) => c.cloud_account_id).filter(Boolean))];
  const { data: accounts } = await supabase
    .from("cloud_accounts")
    .select("id, provider")
    .in("id", accountIds);

  const providerMap: Record<string, string> = {};
  for (const acc of accounts ?? []) {
    providerMap[acc.id] = acc.provider;
  }

  // Hapus tiap chunk di cloud provider-nya masing-masing. Kalau salah satu gagal
  // (misal akun cloud-nya sudah revoked), tetap lanjutkan yang lain --
  // jangan sampai 1 akun bermasalah bikin seluruh proses hapus gagal total.
  const failedAccounts: string[] = [];

  for (const chunk of chunks ?? []) {
    try {
      const provider = providerMap[chunk.cloud_account_id];
      const deleter = provider ? DELETERS[provider] : null;
      if (!deleter) {
        throw new Error(`Tidak ada delete handler untuk provider '${provider}'`);
      }

      const accessToken = await ensureValidAccessToken(chunk.cloud_account_id);
      await deleter(accessToken, chunk.remote_file_id);

      const { data: account } = await supabase
        .from("cloud_accounts")
        .select("storage_used")
        .eq("id", chunk.cloud_account_id)
        .single();
      if (account) {
        await supabase
          .from("cloud_accounts")
          .update({
            storage_used: Math.max(0, account.storage_used - chunk.chunk_size),
            updated_at: new Date().toISOString(),
          })
          .eq("id", chunk.cloud_account_id);
      }
    } catch (err) {
      console.error(`Gagal hapus chunk di akun ${chunk.cloud_account_id}:`, err);
      failedAccounts.push(chunk.cloud_account_id);
    }
  }

  await supabase.from("file_chunks").delete().eq("file_id", fileId);
  await supabase.from("files").update({ status: "deleted" }).eq("id", fileId);

  await logActivity(supabase, user.id, "delete", fileId, { name: file.id });

  if (failedAccounts.length > 0) {
    return NextResponse.json({
      success: true,
      warning: `File dihapus dari SISIMPAN, tapi ${failedAccounts.length} bagian gagal dihapus dari Drive (kemungkinan akun sudah tidak aktif). Bytes-nya mungkin masih ada di Drive akun tsb.`,
    });
  }

  return NextResponse.json({ success: true });
}
