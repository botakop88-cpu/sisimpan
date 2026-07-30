/**
 * Tentukan file (atau bagiannya) mau ditaruh di akun cloud mana.
 * Dijalankan di SERVER (bukan client) supaya user tidak bisa memanipulasi
 * angka kapasitas dan supaya keputusan konsisten dengan data terbaru di DB.
 *
 * Strategi: prioritaskan akun institusi dulu (lihat account_owner_type di
 * 04_Analisis_Risiko_Teknis.md poin 3), lalu isi dari akun dengan sisa
 * kapasitas TERBANYAK dulu (sesuai BRD: "pilih akun dengan kapasitas
 * terbanyak"). Kalau 1 akun sudah cukup, tidak displit sama sekali.
 */

export interface AccountCapacity {
  id: string;
  providerEmail: string;
  accountOwnerType: "institution" | "personal";
  storageUsed: number;
  storageLimit: number;
}

export interface AllocationPart {
  cloudAccountId: string;
  providerEmail: string;
  size: number;
}

export class InsufficientCapacityError extends Error {
  constructor(shortfallBytes: number) {
    super(
      `Kapasitas gabungan tidak cukup, kurang ${(shortfallBytes / 1024 / 1024).toFixed(
        1
      )} MB. Hubungkan akun cloud tambahan.`
    );
    this.name = "InsufficientCapacityError";
  }
}

// Sisakan margin supaya tidak mepet 100% (hindari race condition upload
// bersamaan dari user lain yang berbagi akun institusi yang sama).
const SAFETY_MARGIN_RATIO = 0.05; // 5%
const SAFETY_MARGIN_MIN_BYTES = 50 * 1024 * 1024; // minimal sisakan 50MB

function usableCapacity(acc: AccountCapacity): number {
  const remaining = acc.storageLimit - acc.storageUsed;
  const margin = Math.max(acc.storageLimit * SAFETY_MARGIN_RATIO, SAFETY_MARGIN_MIN_BYTES);
  return Math.max(0, remaining - margin);
}

export function planAllocation(
  accounts: AccountCapacity[],
  fileSize: number
): AllocationPart[] {
  // Institusi dulu, baru pribadi. Dalam grup yang sama, sisa kapasitas
  // terbesar dulu.
  const sorted = [...accounts].sort((a, b) => {
    if (a.accountOwnerType !== b.accountOwnerType) {
      return a.accountOwnerType === "institution" ? -1 : 1;
    }
    return usableCapacity(b) - usableCapacity(a);
  });

  const parts: AllocationPart[] = [];
  let remaining = fileSize;

  for (const acc of sorted) {
    if (remaining <= 0) break;
    const usable = usableCapacity(acc);
    if (usable <= 0) continue;

    const take = Math.min(usable, remaining);
    parts.push({
      cloudAccountId: acc.id,
      providerEmail: acc.providerEmail,
      size: take,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new InsufficientCapacityError(remaining);
  }

  return parts;
}
