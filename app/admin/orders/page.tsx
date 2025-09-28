import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Order = {
  id: string;
  created_at: string;
  items: any[]; // JSONB
  total_price: number;
  status: string;
  customer_details: { name: string; email: string };
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return <p>Gagal memuat data orders</p>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Daftar Pesanan</h1>
      <div className="space-y-6">
        {orders?.map((order: Order) => (
          <div
            key={order.id}
            className="rounded-lg border p-4 shadow-sm bg-white"
          >
            {/* Info order */}
            <div className="mb-2 flex justify-between text-sm text-gray-500">
              <span>
                Order ID: {order.id} •{" "}
                {new Date(order.created_at).toLocaleString("id-ID")}
              </span>
              <span
                className={`font-medium ${
                  order.status === "success"
                    ? "text-green-600"
                    : order.status === "pending"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {order.status}
              </span>
            </div>

            {/* Customer */}
            <div className="mb-2">
              <p className="font-semibold">Customer</p>
              <p>
                {order.customer_details?.name} ({order.customer_details?.email})
              </p>
            </div>

            {/* Items */}
            <div className="mb-2">
              <p className="font-semibold">Items:</p>
              <ul className="list-inside list-disc">
                {Array.isArray(order.items) &&
                  order.items.map((item: any, idx: number) => (
                    <li key={idx}>
                      {item.name} x {item.quantity ?? 1} —{" "}
                      {formatPrice(item.price)}
                    </li>
                  ))}
              </ul>
            </div>

            {/* Total */}
            <div className="mt-2 font-bold">
              Total: {formatPrice(order.total_price)}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
