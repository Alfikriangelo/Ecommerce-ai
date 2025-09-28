// app/admin/layout.tsx

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* Kita panggil Header di sini dan "suntikkan" tombol Upload */}
      <Header>
        <Button asChild>
          <Link href="/admin/upload">Upload Product</Link>
        </Button>
      </Header>
      {/* `children` di sini adalah halaman-halaman admin Anda */}
      {children}
    </div>
  );
}
