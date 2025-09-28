// lib/supabase/server.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Ganti nama fungsinya agar lebih jelas saat diimpor
export const createClient = () => {
  const cookieStore = cookies();

  // Ini adalah cara standar untuk membuat server client yang menghormati RLS
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Tangani error jika cookies coba di-set di dalam Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Tangani error jika cookies coba di-set di dalam Server Component
          }
        },
      },
    }
  );
};
