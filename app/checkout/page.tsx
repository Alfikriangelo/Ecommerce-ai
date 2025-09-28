"use client";

import React, { useState, useEffect, useMemo } from "react";
// Import clearCart dari useCart
import { useCart } from "@/context/cart-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Definisikan tipe data untuk item yang akan dikirim ke API
interface ApiItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
}

// Helper untuk formatting harga
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

// Deklarasi window.snap global
declare global {
  interface Window {
    snap: {
      pay: (token: string, options?: any) => void;
    };
  }
}

const CheckoutPage = () => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Mengambil useCart dan clearCart
  const { cartItems, isLoading: isCartLoading, clearCart } = useCart();

  // Hitung total jumlah dan format item untuk Midtrans/API
  const { totalAmount, apiItems, cartSummary } = useMemo(() => {
    let calculatedTotal = 0;
    const itemsForApi: ApiItem[] = [];
    const summary: { name: string; quantity: number; price: number }[] = [];

    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      calculatedTotal += itemTotal;

      itemsForApi.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });

      summary.push({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      });
    });

    return {
      totalAmount: calculatedTotal,
      apiItems: itemsForApi,
      cartSummary: summary,
    };
  }, [cartItems]);

  // 1. Inisialisasi Auth Supabase dan User ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });

    // Memuat script Midtrans Snap
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
    );
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [supabase]);

  // 2. Handler Pembayaran
  const handleCheckout = async () => {
    if (!userId) {
      alert("Silakan login untuk melanjutkan pembayaran.");
      return;
    }
    if (totalAmount <= 0 || apiItems.length === 0) {
      alert("Keranjang belanja kosong atau total tidak valid.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          totalAmount,
          items: apiItems,
        }),
      });

      const data = await response.json();

      if (data.success && data.snapToken) {
        // **PERBAIKAN UTAMA: HAPUS ISI KERANJANG DI SUPABASE**
        // Jika pembuatan order dan token Midtrans berhasil, kita kosongkan keranjang.
        await clearCart();

        // Membuka Pop-up Midtrans Snap
        window.snap.pay(data.snapToken, {
          onSuccess: function (result: any) {
            // Ketika success, redirect ke halaman order status
            router.push(`/order/${data.orderId}?status=success`);
          },
          onPending: function (result: any) {
            // Ketika pending, redirect ke halaman order status
            router.push(`/order/${data.orderId}?status=pending`);
          },
          onError: function (result: any) {
            // Ketika error, redirect ke halaman order status
            router.push(`/order/${data.orderId}?status=failure`);
          },
          onClose: function () {
            // Ketika pop-up ditutup tanpa menyelesaikan pembayaran (tetap pending)
            router.push(`/order/${data.orderId}?status=pending`);
          },
        });
      } else {
        alert(
          `Gagal membuat transaksi: ${data.message || "Error tidak diketahui"}`
        );
      }
    } catch (error) {
      console.error("Error saat checkout:", error);
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  const isReady = !isCartLoading && userId;

  return (
    <main className="mx-auto max-w-2xl p-6 min-h-screen pt-20">
      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>Ringkasan Pesanan Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          {isCartLoading && (
            <p className="text-center text-muted-foreground">
              Memuat keranjang...
            </p>
          )}

          {!isCartLoading && cartItems.length === 0 && (
            <p className="text-center text-red-500">Keranjang Anda kosong.</p>
          )}

          {/* Ringkasan Item */}
          <div className="space-y-3">
            {cartSummary.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-muted-foreground">
                  {item.name} ({item.quantity}x)
                </span>
                <span className="font-medium">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-dashed" />

          {/* Total Bayar Dinamis */}
          <div className="flex justify-between text-lg font-bold">
            <span>Total Bayar</span>
            <span className="text-primary">{formatPrice(totalAmount)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button
            onClick={handleCheckout}
            disabled={!isReady || loading || totalAmount <= 0}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Bayar Sekarang"
            )}
          </Button>

          {!userId && (
            <p className="text-xs mt-2 text-red-500 text-center">
              Anda perlu login untuk checkout.
            </p>
          )}
        </CardFooter>
      </Card>
    </main>
  );
};

export default CheckoutPage;
