import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
// BARU: Impor komponen Script dari Next.js
import Script from "next/script";

export const metadata: Metadata = {
  title: "BeliBeli",
  description: "Website jual beli makanan dan minuman",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* BARU: Tambahkan Script Midtrans di sini agar dimuat di semua halaman */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <CartProvider>
          <main>{children}</main>
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
