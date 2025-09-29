// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import midtransClient from "midtrans-client";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Authentication required", { status: 401 });
  }

  try {
    const { items } = await req.json();

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    });

    const totalPrice = items.reduce((sum: number, item: any) => {
      return sum + item.price * item.quantity;
    }, 0);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const customerDetailsData = {
      email: user.email,
      first_name: profile?.full_name || user.email?.split("@")[0] || "Guest",
    };

    const internalOrderId = uuidv4();
    const midtransOrderId = `belibeli-trx-${internalOrderId}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: totalPrice,
      },
      customer_details: customerDetailsData,
      item_details: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      // --- DIHAPUS ---
      // finish_redirect_url tidak lagi dikirim dari sini
    };

    const token = await snap.createTransactionToken(parameter);

    const { error: insertError } = await supabase.from("orders").insert({
      id: internalOrderId,
      user_id: user.id,
      total_price: totalPrice,
      status: "pending",
      items: items,
      customer_details: customerDetailsData,
      midtrans_order_id: midtransOrderId,
    });

    if (insertError) {
      console.error("Database Insertion Error:", insertError);
      throw new Error(
        "Gagal membuat pesanan di database setelah token dibuat."
      );
    }

    return NextResponse.json({ token, orderId: internalOrderId });
  } catch (error) {
    console.error("API Checkout Error:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Gagal memproses transaksi",
      { status: 500 }
    );
  }
}
