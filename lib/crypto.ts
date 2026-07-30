import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * Enkripsi token OAuth sebelum disimpan ke Supabase.
 *
 * Catatan desain: rencana teknis menyebut "encrypted via Supabase Vault".
 * Supabase Vault (ekstensi pgsodium) valid, tapi butuh setup ekstensi +
 * fungsi SQL tambahan. Untuk MVP gratis, kita enkripsi di application layer
 * pakai AES-256-GCM dengan key yang HANYA ada di server (TOKEN_ENCRYPTION_KEY
 * di env, tidak pernah dikirim ke browser). Hasil akhirnya setara: token
 * tidak pernah tersimpan plaintext di database.
 *
 * PENTING: fungsi ini hanya boleh dipanggil dari kode server-side
 * (Route Handler, cron, Server Action) — jangan pernah diimpor di
 * Client Component.
 */

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY belum di-set di .env.local. Generate dengan: openssl rand -hex 32"
    );
  }
  // Hash ke 32 byte tetap, supaya key di .env boleh string sembarang panjang
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // GCM standar pakai 12 byte IV
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format simpan: iv.authTag.ciphertext, semua base64, dipisah titik
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    "."
  );
}

export function decryptToken(payload: string): string {
  const key = getKey();
  const [ivB64, authTagB64, dataB64] = payload.split(".");

  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Format token terenkripsi tidak valid");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
