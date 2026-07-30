import { withBackoff, HttpError } from "./backoff";

/**
 * Resumable Upload API Google Drive -- dipakai LANGSUNG dari browser
 * (bukan lewat server kita), sesuai prinsip "file tidak pernah lewat
 * server". Server cuma kasih access_token short-lived (scope drive.file)
 * dan lokasi part yang harus diupload; PUT bytes-nya langsung browser -> Drive.
 *
 * Dokumentasi resmi: https://developers.google.com/drive/api/guides/manage-uploads#resumable
 */

const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";

/**
 * Langkah 1: minta session URI dari Google. Session ini yang dipakai
 * untuk PUT bytes (bisa berkali-kali PUT kalau perlu resume).
 */
export async function startResumableSession(
  accessToken: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const res = await withBackoff(async () => {
    const r = await fetch(`${UPLOAD_BASE}?uploadType=resumable`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType || "application/octet-stream",
      },
      body: JSON.stringify({ name: fileName }),
    });
    if (!r.ok) throw new HttpError(r.status, await r.text());
    return r;
  });

  const location = res.headers.get("Location");
  if (!location) throw new Error("Google tidak mengembalikan session URI upload");
  return location;
}

export interface UploadPartResult {
  remoteFileId: string;
}

/**
 * Langkah 2: PUT seluruh bytes bagian file (blob) ke session URI.
 * Kalau koneksi putus di tengah jalan, panggil `resumeUpload()` untuk
 * lanjut dari byte terakhir yang sukses diterima Google -- bukan mulai
 * dari nol lagi (FILE-004: resume upload terputus).
 */
export async function uploadPart(
  sessionUri: string,
  blob: Blob,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<UploadPartResult> {
  return withBackoff(async () => {
    const res = await fetch(sessionUri, {
      method: "PUT",
      headers: {
        "Content-Length": String(blob.size),
      },
      body: blob,
    });

    if (res.status === 200 || res.status === 201) {
      onProgress?.(blob.size, blob.size);
      const data = await res.json();
      return { remoteFileId: data.id as string };
    }

    // 308 = belum selesai (jarang terjadi untuk PUT sekali jalan, tapi
    // bisa muncul kalau Google memutus koneksi di tengah). Lempar supaya
    // caller tahu harus lanjut pakai resumeUpload().
    throw new HttpError(res.status, await res.text());
  });
}

/**
 * Cek berapa byte yang sudah diterima Google untuk session ini, lalu
 * lanjutkan PUT dari situ. Dipanggil kalau uploadPart() gagal karena
 * koneksi putus (bukan karena rate limit -- itu sudah ditangani backoff).
 */
export async function resumeUpload(
  sessionUri: string,
  blob: Blob,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<UploadPartResult> {
  return withBackoff(async () => {
    // Tanya Google sudah sampai byte berapa (Content-Range: bytes */total)
    const statusRes = await fetch(sessionUri, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes */${blob.size}`,
      },
    });

    if (statusRes.status === 200 || statusRes.status === 201) {
      // Ternyata sudah selesai duluan (race condition jaringan)
      const data = await statusRes.json();
      onProgress?.(blob.size, blob.size);
      return { remoteFileId: data.id as string };
    }

    if (statusRes.status !== 308) {
      throw new HttpError(statusRes.status, await statusRes.text());
    }

    const range = statusRes.headers.get("Range"); // contoh: "bytes=0-1048575"
    const bytesReceived = range ? parseInt(range.split("-")[1], 10) + 1 : 0;

    const remainingBlob = blob.slice(bytesReceived);
    const res = await fetch(sessionUri, {
      method: "PUT",
      headers: {
        "Content-Length": String(remainingBlob.size),
        "Content-Range": `bytes ${bytesReceived}-${blob.size - 1}/${blob.size}`,
      },
      body: remainingBlob,
    });

    if (res.status !== 200 && res.status !== 201) {
      throw new HttpError(res.status, await res.text());
    }

    onProgress?.(blob.size, blob.size);
    const data = await res.json();
    return { remoteFileId: data.id as string };
  });
}
