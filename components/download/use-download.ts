"use client";

import { useState, useCallback } from "react";
import { downloadPart, saveMergedFile } from "@/lib/cloud/drive-download";

export type DownloadStage = "idle" | "fetching_manifest" | "downloading" | "done" | "failed";

export interface DownloadState {
  stage: DownloadStage;
  progressParts: number;
  totalParts: number;
  errorMessage?: string;
}

interface ManifestPart {
  chunkIndex: number;
  size: number;
  remoteFileId: string;
  accessToken: string;
}

interface Manifest {
  name: string;
  mimeType: string;
  originalSize: number;
  checksumSha256: string;
  parts: ManifestPart[];
}

export function useDownload() {
  const [state, setState] = useState<DownloadState>({
    stage: "idle",
    progressParts: 0,
    totalParts: 0,
  });

  const download = useCallback(async (manifestUrl: string, body?: unknown) => {
    setState({ stage: "fetching_manifest", progressParts: 0, totalParts: 0 });

    try {
      const res = await fetch(manifestUrl, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const manifest: Manifest & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(
          manifest.error === "wrong_password"
            ? "Password salah"
            : manifest.error === "expired"
              ? "Link share sudah kedaluwarsa"
              : "Gagal mengambil informasi file"
        );
      }

      setState((s) => ({ ...s, stage: "downloading", totalParts: manifest.parts.length }));

      const blobs: Blob[] = [];
      for (const part of manifest.parts) {
        const blob = await downloadPart(part.remoteFileId, part.accessToken);
        blobs.push(blob);
        setState((s) => ({ ...s, progressParts: s.progressParts + 1 }));
      }

      saveMergedFile(blobs, manifest.name, manifest.mimeType);
      setState((s) => ({ ...s, stage: "done" }));
    } catch (err) {
      setState((s) => ({
        ...s,
        stage: "failed",
        errorMessage: err instanceof Error ? err.message : "Download gagal",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ stage: "idle", progressParts: 0, totalParts: 0 });
  }, []);

  return { state, download, reset };
}
