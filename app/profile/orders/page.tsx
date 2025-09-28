// app/profile/orders/page.tsx

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepayButton } from "@/components/repay-button";

type Order = {
  id: number;
  created_at: string;
  total_price: number;
  status: string;
  midtrans_order_id: string | null;
  items: { id: number; name: string; price: number; quantity: number }[];
  customer_details: any;
};

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
  });
};

export default async function OrderHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Error fetching orders.</p>;
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-8">Your Order History</h1>
      <div className="flex flex-col gap-6">
        {orders.length === 0 ? (
          <p>You haven't placed any orders yet.</p>
        ) : (
          (orders as Order[]).map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle>
                  Order #{order.midtrans_order_id || order.id}
                </CardTitle>
                <CardDescription>
                  {formatDate(order.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Total</p>
                    <p className="text-xl font-bold">
                      {formatPrice(order.total_price)}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === "success"
                        ? "bg-green-100 text-green-800"
                        : order.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {order.status}
                  </div>
                </div>
              </CardContent>
              {order.status === "pending" && (
                <CardFooter>
                  <RepayButton order={order} />
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
