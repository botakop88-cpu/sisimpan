import { withBackoff, HttpError } from "./backoff";

/**
 * Download bytes 1 bagian file langsung dari Google Drive (browser -> Drive,
 * bukan lewat server kita -- sama seperti prinsip upload di M3).
 *
 * Dokumentasi: https://developers.google.com/drive/api/guides/manage-downloads
 */
export async function downloadPart(remoteFileId: string, accessToken: string): Promise<Blob> {
  return withBackoff(async () => {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${remoteFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new HttpError(res.status, await res.text());
    return res.blob();
  });
}

/**
 * Gabungkan hasil download tiap bagian jadi 1 file utuh, lalu picu
 * "Save As" di browser lewat elemen <a download> sementara.
 */
export function saveMergedFile(parts: Blob[], fileName: string, mimeType: string) {
  const merged = new Blob(parts, { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(merged);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Kasih sedikit delay sebelum revoke supaya browser sempat mulai proses save
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
