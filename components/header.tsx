// components/header.tsx

"use client";

import { usePathname } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { ShoppingCart, User } from "lucide-react"; // 1. Impor ikon User
import { Button } from "./ui/button";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Header({ children }: { children?: ReactNode }) {
  const { cartItems } = useCart();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUserName(profile.full_name);
        }
      }
    };
    fetchProfile();
  }, [pathname]); // Perbarui saat path berubah agar nama muncul setelah login

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isAuthPage = pathname.startsWith("/auth");
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        {/* Mengubah judul menjadi link ke halaman yang sesuai */}
        <Link
          href={isAdminPage ? "/admin/products" : "/user/products"}
          className="text-xl font-bold hover:opacity-80"
        >
          {isAdminPage ? "Admin Dashboard" : "BeliBeli"}
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          {userName && (
            <span className="hidden text-sm font-medium md:inline">
              Hi, {userName}!
            </span>
          )}

          {/* Menampilkan tombol sesuai halaman */}
          {!isAdminPage && !isAuthPage && (
            <>
              <Link href="/checkout">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </Link>

              {/* 2. Tambahkan Link ke Riwayat Pesanan */}
              {/* <Button asChild variant="ghost" size="icon">
                <Link href="/profile/orders" title="My Orders">
                  <User className="h-5 w-5" />
                </Link>
              </Button> */}
            </>
          )}

          {children}

          {!isAuthPage && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
