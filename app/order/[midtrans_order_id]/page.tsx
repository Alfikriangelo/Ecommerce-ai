import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
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

export default async function OrderStatusPage({
  params,
}: {
  // 1. Ubah nama parameter agar cocok dengan nama folder dinamis
  params: { midtrans_order_id: string };
}) {
  const midtransOrderId = params.midtrans_order_id;
  const supabase = createClient();

  // 2. Cari pesanan di database berdasarkan kolom 'midtrans_order_id'
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("midtrans_order_id", midtransOrderId)
    .single<Order>();

  if (error || !order) {
    return notFound();
  }

  const getStatusProps = (status: Order["status"]) => {
    switch (status) {
      case "success":
        return {
          title: "Pembayaran Berhasil",
          message: "Pesanan Anda telah dibayar dan sedang diproses.",
          icon: CheckCircle,
          badgeClass: "bg-green-500 hover:bg-green-600 text-white",
          colorClass: "text-green-600",
        };
      case "pending":
        return {
          title: "Menunggu Pembayaran",
          message:
            "Silakan selesaikan pembayaran. Kami menunggu konfirmasi dari Midtrans.",
          icon: Clock,
          badgeClass: "bg-yellow-500 hover:bg-yellow-600 text-white",
          colorClass: "text-yellow-600",
        };
      case "failure":
        return {
          title: "Pembayaran Gagal",
          message: "Terjadi kegagalan saat transaksi. Silakan coba lagi.",
          icon: XCircle,
          badgeClass: "bg-red-500 hover:bg-red-600 text-white",
          colorClass: "text-red-600",
        };
      default:
        return {
          title: "Status Tidak Diketahui",
          message: "Status pesanan ini tidak dapat diverifikasi.",
          icon: Clock,
          badgeClass: "bg-gray-500 hover:bg-gray-600 text-white",
          colorClass: "text-gray-600",
        };
    }
  };

  const currentProps = getStatusProps(order.status);
  const StatusIcon = currentProps.icon;

  return (
    <main className="mx-auto max-w-xl p-6 min-h-screen flex items-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <StatusIcon className={`h-16 w-16 ${currentProps.colorClass}`} />
          </div>
          <CardTitle className={`text-2xl ${currentProps.colorClass}`}>
            {currentProps.title}
          </CardTitle>
          <CardDescription>{currentProps.message}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="border-b pb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800">Status</span>
              <Badge className={currentProps.badgeClass}>
                {order.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
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
              Kembali ke Menu
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
