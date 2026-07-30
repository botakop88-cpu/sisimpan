import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client untuk dipakai di Server Components, Server Actions,
 * dan Route Handlers (app/api/**). Baca/tulis cookie sesi user supaya
 * request ke Supabase otomatis terautentikasi sebagai user yang login.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll dipanggil dari Server Component — boleh diabaikan
            // kalau ada middleware yang sudah refresh session user.
          }
        },
      },
    }
  );
}
