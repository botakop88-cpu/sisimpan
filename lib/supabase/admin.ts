import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * PERINGATAN: client ini pakai SERVICE ROLE KEY yang bypass semua
 * Row Level Security. JANGAN PERNAH diimpor di kode yang jalan di
 * browser (client component). Hanya boleh dipakai di:
 * - Route Handlers (app/api/**)
 * - Cron jobs (app/api/cron/**)
 * - Server Actions yang memang butuh akses lintas-user (misal admin panel)
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
