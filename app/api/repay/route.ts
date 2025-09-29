// app/api/repay/route.ts

import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { order: oldOrder } = await req.json();

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
    });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Buat ID pesanan BARU untuk upaya pembayaran ulang
    const newInternalOrderId = uuidv4();
    const newMidtransOrderId = `belibeli-trx-${newInternalOrderId}`;

    const parameter = {
      transaction_details: {
        order_id: newMidtransOrderId, // Gunakan ID baru
        gross_amount: oldOrder.total_price,
      },
      item_details: oldOrder.items.map((item: any) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
      customer_details: oldOrder.customer_details,
      finish_redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${newInternalOrderId}`,
    };

    // Buat token baru dengan ID baru
    const token = await snap.createTransactionToken(parameter);

    // Buat juga baris order BARU di database untuk transaksi repay ini
    const { error: insertError } = await supabase.from("orders").insert({
      id: newInternalOrderId,
      user_id: user.id,
      total_price: oldOrder.total_price,
      status: "pending",
      items: oldOrder.items,
      customer_details: oldOrder.customer_details,
      midtrans_order_id: newMidtransOrderId,
    });

    if (insertError) {
      throw new Error("Gagal membuat catatan pesanan baru untuk repay.");
    }

    return NextResponse.json({ token, orderId: newInternalOrderId });
  } catch (error) {
    console.error("API Repay Error:", error);
    return new NextResponse(
      error instanceof Error
        ? error.message
        : "Failed to create new transaction token",
      { status: 500 }
    );
  }
}
