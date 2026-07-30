import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk dipakai di Client Components (browser).
 * Pakai anon key — aman untuk diekspos ke browser karena
 * akses data diatur lewat Row Level Security (RLS) di Supabase.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
