"use client";

import { Button } from "./ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    snap: any;
  }
}

type Order = {
  id: number;
  total_price: number;
  midtrans_order_id: string | null;
  items: { id: number; name: string; price: number; quantity: number }[];
  customer_details: any;
};

export function RepayButton({ order }: { order: Order }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRepay = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!response.ok) throw new Error("Failed to get token");

      const { token } = await response.json();

      window.snap.pay(token, {
        onSuccess: function () {
          alert("Payment success!");
          router.refresh(); // Refresh halaman riwayat pesanan
        },
        onClose: function () {
          // Refresh halaman saat pop-up ditutup agar status ter-update jika pembayaran terjadi
          router.refresh();
        },
      });
    } catch (error) {
      console.error(error);
      alert("Failed to retry payment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleRepay} disabled={isLoading}>
      {isLoading ? "Processing..." : "Pay Again"}
    </Button>
  );
}
