// middleware.ts

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (request.nextUrl.pathname === "/") {
    if (session) {
      // Setelah mendapatkan sesi, ambil profil pengguna untuk mengecek perannya
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      // Arahkan pengguna berdasarkan perannya
      if (profile?.role === "admin") {
        // Jika peran adalah 'admin', arahkan ke dashboard admin
        return NextResponse.redirect(new URL("/admin/products", request.url));
      } else {
        // Jika peran lainnya (misal: 'customer'), arahkan ke halaman menu utama
        // Anda bisa membuat halaman ini di app/menu/page.tsx
        return NextResponse.redirect(new URL("/user/products", request.url));
      }
    } else {
      // Jika belum login, arahkan ke halaman login (Tidak ada perubahan)
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/"],
};
