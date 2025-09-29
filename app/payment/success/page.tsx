// app/payment/success/page.tsx

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  total_price: number;
  status: "pending" | "success" | "failure";
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  created_at: string;
  midtrans_order_id: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: {
    order_id?: string;
    status_code?: string;
    transaction_status?: string;
  };
}) {
  const midtransOrderId = searchParams.order_id;

  // Jika tidak ada order_id dari Midtrans, kembalikan ke home
  if (!midtransOrderId) {
    redirect("/");
  }

  const supabase = createClient();

  // --- PERUBAHAN LOGIKA PENCARIAN ---
  // CARI PESANAN BERDASARKAN 'midtrans_order_id', BUKAN 'id'
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("midtrans_order_id", midtransOrderId) // Mencari dengan ID dari Midtrans
    .single<Order>();

  // Jika pesanan tidak ditemukan, tampilkan halaman 404
  if (error || !order) {
    return notFound();
  }

  return (
    <main className="mx-auto max-w-xl p-6 min-h-screen flex items-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Pembayaran Berhasil!
          </CardTitle>
          <CardDescription>
            Terima kasih! Pesanan Anda telah kami terima dan sedang diproses.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="border-b pb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800">Status</span>
              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                BERHASIL
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              {/* Menampilkan ID dari Midtrans agar sesuai dengan URL */}
              <span>ID Pesanan</span>
              <span className="font-mono">{order.midtrans_order_id}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Tanggal Transaksi</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold border-b pb-1">
              Rincian Item
            </h3>
            {order.items.map((item, index) => (
              <div
                key={index}
                className="flex justify-between text-sm text-gray-700"
              >
                <span className="text-muted-foreground">
                  {item.name} ({item.quantity}x)
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-dashed">
            <div className="flex justify-between text-xl font-bold">
              <span>Total Pembayaran</span>
              <span className="text-primary">
                {formatPrice(order.total_price)}
              </span>
            </div>
          </div>
        </CardContent>

        <div className="p-6 pt-0">
          <Link href="/user/products" passHref className="block">
            <Button className="w-full" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali Belanja
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
