// checkout/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCart } from "@/context/cart-context";
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

interface ApiItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

declare global {
  interface Window {
    snap: {
      pay: (token: string, options?: any) => void;
    };
  }
}

const CheckoutPage = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { cartItems, isLoading: isCartLoading, clearCart } = useCart();

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

  useEffect(() => {
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
  }, []);

  const handleCheckout = async () => {
    if (totalAmount <= 0 || apiItems.length === 0) {
      alert("Keranjang belanja kosong.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: apiItems }),
      });

      const data = await response.json();

      if (!data.token) {
        throw new Error(data.message || "Error tidak diketahui");
      }

      // Kosongkan keranjang dulu
      await clearCart();

      // Memanggil Snap Pay
      window.snap.pay(data.token, {
        onSuccess: function (result: any) {
          // redirect ke halaman sukses
          router.push(`/payment/success?order_id=${data.orderId}`);
        },
        onPending: function (result: any) {
          // redirect ke halaman status pending
          router.push(`/order/${data.orderId}`);
        },
        onError: function (result: any) {
          // redirect ke halaman error
          router.push(`/order/${data.orderId}`);
        },
        onClose: function () {
          // redirect ke halaman order untuk memeriksa status
          router.push(`/order/${data.orderId}`);
        },
      });
    } catch (error) {
      console.error("Error saat checkout:", error);
      alert(
        error instanceof Error ? error.message : "Terjadi kesalahan koneksi."
      );
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6 min-h-screen pt-20">
      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>Ringkasan Pesanan Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          {isCartLoading ? (
            <p className="text-center text-muted-foreground">
              Memuat keranjang...
            </p>
          ) : cartItems.length === 0 ? (
            <p className="text-center text-red-500">Keranjang Anda kosong.</p>
          ) : (
            <>
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
              <div className="my-4 border-t border-dashed" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Bayar</span>
                <span className="text-primary">{formatPrice(totalAmount)}</span>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleCheckout}
            disabled={isCartLoading || loading || totalAmount <= 0}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Bayar Sekarang"
            )}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
};

export default CheckoutPage;
