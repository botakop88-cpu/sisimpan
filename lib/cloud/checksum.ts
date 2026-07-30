import { sha256 } from "js-sha256";

/**
 * Hitung checksum SHA-256 untuk keseluruhan file SEKALIGUS per-bagian
 * (sesuai rencana split ke multi-akun), hanya dengan SEKALI baca file
 * dari awal sampai akhir -- bukan baca berkali-kali.
 *
 * Kenapa perlu incremental hasher (bukan crypto.subtle.digest biasa):
 * crypto.subtle.digest cuma bisa hash 1 buffer utuh sekaligus, artinya
 * untuk file besar harus dimuat penuh ke memori. js-sha256 punya API
 * incremental (.update() berkali-kali) sehingga kita bisa baca file
 * sedikit demi sedikit (windowed read) tanpa membebani memori browser.
 */

const READ_WINDOW_BYTES = 8 * 1024 * 1024; // baca 8MB per langkah

export interface PartBoundary {
  cloudAccountId: string;
  size: number;
}

export interface PartChecksum extends PartBoundary {
  offset: number;
  checksumSha256: string;
}

export interface FileHashResult {
  wholeFileChecksum: string;
  parts: PartChecksum[];
}

export async function hashFileWithParts(
  file: File,
  partBoundaries: PartBoundary[],
  onProgress?: (bytesProcessed: number, totalBytes: number) => void
): Promise<FileHashResult> {
  const wholeHasher = sha256.create();
  const parts: PartChecksum[] = [];

  let globalOffset = 0;
  let bytesProcessed = 0;

  for (const boundary of partBoundaries) {
    const partHasher = sha256.create();
    const partStart = globalOffset;
    const partEnd = globalOffset + boundary.size;

    let cursor = partStart;
    while (cursor < partEnd) {
      const windowEnd = Math.min(cursor + READ_WINDOW_BYTES, partEnd);
      const slice = file.slice(cursor, windowEnd);
      const buffer = await slice.arrayBuffer();

      partHasher.update(buffer);
      wholeHasher.update(buffer);

      bytesProcessed += buffer.byteLength;
      onProgress?.(bytesProcessed, file.size);

      cursor = windowEnd;
    }

    parts.push({
      cloudAccountId: boundary.cloudAccountId,
      size: boundary.size,
      offset: partStart,
      checksumSha256: partHasher.hex(),
    });

    globalOffset = partEnd;
  }

  return {
    wholeFileChecksum: wholeHasher.hex(),
    parts,
  };
}
