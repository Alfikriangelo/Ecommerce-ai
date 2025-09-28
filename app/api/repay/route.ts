import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { order } = await req.json();

    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!order.midtrans_order_id) {
      throw new Error("Order ID from Midtrans is missing.");
    }

    // Membuat ID pesanan baru yang unik agar tidak ditolak Midtrans
    const newRepayOrderId = `${order.midtrans_order_id}-repay-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: newRepayOrderId,
        gross_amount: order.total_price,
      },
      item_details: order.items.map((item: any) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
      customer_details: order.customer_details,
      // Menitipkan ID pesanan yang asli agar bisa dilacak di webhook
      custom_field1: order.midtrans_order_id,
      enabled_payments: [
        "credit_card",
        "gopay",
        "qris",
        "shopeepay",
        "bca_va",
        "bni_va",
        "bri_va",
        "permata_va",
        "mandiri_bill",
        "indomaret",
        "alfamart",
        "akulaku",
      ],
      gopay: {
        enable_callback: true,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
      },
    };

    const token = await snap.createTransactionToken(parameter);
    return NextResponse.json({ token });
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
