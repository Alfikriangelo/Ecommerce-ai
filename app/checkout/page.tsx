// app/checkout/page.tsx

"use client";

import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation"; // 1. Impor useRouter

// Deklarasikan window.snap agar TypeScript tidak error
declare global {
  interface Window {
    snap: any;
  }
}

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems, totalPrice }),
      });

      if (!response.ok) throw new Error("Failed to create transaction");

      const { token } = await response.json();

      window.snap.pay(token, {
        // Pembayaran berhasil
        onSuccess: function (result: any) {
          alert("Payment success!");
          clearCart();
          router.push("/"); // Arahkan ke halaman utama atau "terima kasih"
        },
        // Pembayaran pending (misal: Transfer Bank, menunggu pembayaran)
        onPending: function (result: any) {
          alert("Waiting for your payment!");
          clearCart();
          router.push("/"); // Arahkan ke halaman instruksi pembayaran
        },
        // Pembayaran error
        onError: function (result: any) {
          alert("Payment failed!");
          // Tetap di halaman checkout agar bisa coba lagi
        },
        // Pengguna MENUTUP pop-up secara manual
        onClose: function () {
          // Cukup refresh halaman agar bisa mencoba bayar lagi dengan bersih
          window.location.reload();
        },
      });
    } catch (error) {
      console.error(error);
      alert("Checkout failed. Please try again.");
      setIsLoading(false); // Pastikan loading berhenti jika ada error di awal
    }
    // Jangan set isLoading ke false di sini, biarkan callback yang menanganinya
  };

  return (
    // ... sisa kode JSX Anda tidak berubah ...
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between items-center mb-2">
            <span>
              {item.name} (x{item.quantity})
            </span>
            <span>Rp {item.price * item.quantity}</span>
          </div>
        ))}
        <hr className="my-2" />
        <div className="flex justify-between font-bold text-xl">
          <span>Total</span>
          <span>Rp {totalPrice}</span>
        </div>
        <Button
          onClick={handleCheckout}
          disabled={isLoading || cartItems.length === 0}
          className="w-full mt-4"
        >
          {isLoading ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </main>
  );
}
