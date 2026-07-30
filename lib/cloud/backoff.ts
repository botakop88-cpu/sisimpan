/**
 * Retry dengan exponential backoff. Dipakai untuk semua request ke Google
 * Drive API (upload, resumable session, dst) supaya kalau kena rate limit
 * (403/429) atau error transient (5xx), tidak langsung menyerah atau malah
 * membombardir API dengan retry beruntun.
 *
 * Lihat 04_Analisis_Risiko_Teknis.md poin 4 & 2 -- backoff ini juga bagian
 * dari mitigasi supaya pola traffic tidak terlihat seperti bot/automasi
 * masif ke Google.
 */

const RETRYABLE_STATUS = new Set([403, 408, 429, 500, 502, 503, 504]);

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  isRetryableError: (err: unknown) => boolean = defaultIsRetryable,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 5, baseDelayMs = 1000, maxDelayMs = 64000 } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isRetryableError(err)) {
        throw err;
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      // Sedikit jitter supaya banyak client tidak retry di detik yang sama persis
      const jitter = Math.random() * 300;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
}

function defaultIsRetryable(err: unknown): boolean {
  if (err instanceof HttpError) {
    return RETRYABLE_STATUS.has(err.status);
  }
  // Error jaringan (fetch gagal total, offline, dst) -- layak dicoba lagi
  return err instanceof TypeError;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}
