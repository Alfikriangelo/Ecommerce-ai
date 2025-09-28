// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    // Inisialisasi Midtrans client di dalam fungsi untuk koneksi yang selalu baru
    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    const { items, totalPrice } = await req.json();

    // Otentikasi pengguna
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ambil profil pengguna untuk detail customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Siapkan detail pelanggan
    const customerDetails = {
      first_name: profile?.full_name || user.email?.split("@")[0],
      email: user.email,
    };

    // Buat catatan pesanan di database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_price: totalPrice,
        status: "pending",
        items: items,
        customer_details: customerDetails,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Supabase order insert error:", orderError);
      throw new Error("Gagal membuat catatan pesanan di database.");
    }

    const orderId = `belibeli-trx-${order.id}`;

    // Siapkan parameter LENGKAP untuk Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice,
      },
      item_details: items.map((item: any) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
      customer_details: customerDetails,
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

    // Update order dengan ID dari Midtrans
    await supabase
      .from("orders")
      .update({ midtrans_order_id: orderId })
      .eq("id", order.id);

    // Buat token transaksi
    const token = await snap.createTransactionToken(parameter);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("API Checkout Error:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to create transaction",
      { status: 500 }
    );
  }
}
