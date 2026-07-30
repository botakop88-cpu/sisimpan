"use client";

import { useState, useCallback } from "react";
import { hashFileWithParts, type PartChecksum } from "@/lib/cloud/checksum";
import { startResumableSession, uploadPart, resumeUpload } from "@/lib/cloud/drive-upload";
import { HttpError } from "@/lib/cloud/backoff";

export type UploadStage =
  | "idle"
  | "planning"
  | "hashing"
  | "dedup"
  | "uploading"
  | "done"
  | "failed";

export interface UploadState {
  stage: UploadStage;
  fileName: string;
  progressBytes: number;
  totalBytes: number;
  currentPartIndex: number;
  totalParts: number;
  errorMessage?: string;
}

interface PlanPart {
  cloudAccountId: string;
  providerEmail: string;
  size: number;
  accessToken: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message ?? json.error ?? `Request ke ${url} gagal`);
  }
  return json;
}

/**
 * Refresh access token satu akun (dipakai kalau upload part besar sampai
 * bikin token yang didapat dari plan-upload keburu expired di tengah jalan).
 */
async function refreshAccountToken(cloudAccountId: string): Promise<string> {
  const json = await postJson<{ accessToken: string }>(
    `/api/storage/accounts/${cloudAccountId}/token`,
    {}
  );
  return json.accessToken;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    stage: "idle",
    fileName: "",
    progressBytes: 0,
    totalBytes: 0,
    currentPartIndex: 0,
    totalParts: 0,
  });

  const upload = useCallback(async (file: File) => {
    setState({
      stage: "planning",
      fileName: file.name,
      progressBytes: 0,
      totalBytes: file.size,
      currentPartIndex: 0,
      totalParts: 0,
    });

    let fileId: string | null = null;

    try {
      // 1. Tanya server mau displit ke akun mana saja
      const planRes = await postJson<{ parts: PlanPart[] }>("/api/storage/plan-upload", {
        fileSize: file.size,
      });
      const plan = planRes.parts;

      setState((s) => ({ ...s, stage: "hashing", totalParts: plan.length }));

      // 2. Hash whole-file + per-part, sekali baca
      const hashResult = await hashFileWithParts(
        file,
        plan.map((p) => ({ cloudAccountId: p.cloudAccountId, size: p.size })),
        (processed) => setState((s) => ({ ...s, progressBytes: processed }))
      );

      // 3. Cek duplikat (anti-dedup)
      setState((s) => ({ ...s, stage: "dedup" }));
      const dedupRes = await postJson<{ isDuplicate: boolean; file?: { name: string } }>("/api/files/dedup", {
        checksumSha256: hashResult.wholeFileChecksum,
        fileName: file.name,
      });
      if (dedupRes.isDuplicate) {
        const msg = dedupRes.file
          ? `File "${file.name}" sudah pernah diupload sebagai "${dedupRes.file.name}". Upload dibatalkan.`
          : `File "${file.name}" sudah pernah diupload. Upload dibatalkan.`;
        throw new Error(msg);
      }

      // 4. Buat metadata file di DB
      const createRes = await postJson<{ fileId: string }>("/api/files", {
        name: file.name,
        mimeType: file.type,
        originalSize: file.size,
        checksumSha256: hashResult.wholeFileChecksum,
        chunkCount: plan.length,
      });
      fileId = createRes.fileId;

      setState((s) => ({ ...s, stage: "uploading", progressBytes: 0 }));

      // 4. Upload tiap part langsung ke Drive, lapor metadata sesudahnya.
      // Sengaja SEQUENTIAL (satu-satu), bukan paralel semua sekaligus --
      // supaya lebih gampang di-backoff dan tidak membanjiri API sekaligus
      // dari banyak akun berbeda (lihat 04_Analisis_Risiko_Teknis.md poin 4).
      let uploadedSoFar = 0;
      for (let i = 0; i < plan.length; i++) {
        const part = plan[i];
        const partHash = hashResult.parts[i];
        setState((s) => ({ ...s, currentPartIndex: i + 1 }));

        const blob = file.slice(partHash.offset, partHash.offset + partHash.size);
        const remoteFileId = await uploadOnePart(
          part,
          blob,
          file.name,
          file.type,
          (uploaded) =>
            setState((s) => ({ ...s, progressBytes: uploadedSoFar + uploaded }))
        );
        uploadedSoFar += part.size;

        await postJson(`/api/files/${fileId}/chunks`, {
          chunkIndex: i,
          chunkSize: part.size,
          checksumSha256: partHash.checksumSha256,
          cloudAccountId: part.cloudAccountId,
          remoteFileId,
          status: "ok",
        });
      }

      setState((s) => ({ ...s, stage: "done", progressBytes: file.size }));
    } catch (err) {
      console.error("Upload error:", err);
      // Kalau sudah sempat buat file row, tandai partial_failed supaya
      // tidak nyangkut selamanya di status 'uploading' (lihat cron cleanup
      // di 04_Analisis_Risiko_Teknis.md poin 6 & 7 -- itu jaring pengaman
      // tambahan, ini penanda langsung dari sisi client).
      if (fileId) {
        await postJson(`/api/files/${fileId}/chunks`, {
          chunkIndex: -1,
          chunkSize: 0,
          checksumSha256: "-",
          cloudAccountId: "-",
          remoteFileId: "-",
          status: "failed",
        }).catch(() => void 0);
      }
      setState((s) => ({
        ...s,
        stage: "failed",
        errorMessage: err instanceof Error ? err.message : "Upload gagal",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      stage: "idle",
      fileName: "",
      progressBytes: 0,
      totalBytes: 0,
      currentPartIndex: 0,
      totalParts: 0,
    });
  }, []);

  return { state, upload, reset };
}

async function uploadOnePart(
  part: PlanPart,
  blob: Blob,
  fileName: string,
  mimeType: string,
  onProgress: (bytesUploaded: number) => void
): Promise<string> {
  let accessToken = part.accessToken;

  const startSession = async () => startResumableSession(accessToken, fileName, mimeType);

  try {
    const sessionUri = await startSession();
    const result = await uploadPart(sessionUri, blob, onProgress);
    return result.remoteFileId;
  } catch (err) {
    // Token kemungkinan expired di tengah jalan (upload lama / file besar).
    // Refresh sekali lalu coba ulang dari awal part ini.
    if (err instanceof HttpError && err.status === 401) {
      accessToken = await refreshAccountToken(part.cloudAccountId);
      const sessionUri = await startResumableSession(accessToken, fileName, mimeType);
      const result = await resumeUpload(sessionUri, blob, onProgress);
      return result.remoteFileId;
    }
    throw err;
  }
}
