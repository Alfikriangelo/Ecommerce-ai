// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  let order; // Deklarasikan di luar try/catch utama agar bisa diakses di blok catch
  try {
    // Inisialisasi Midtrans client
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

    // Siapkan detail pelanggan (Sangat disarankan melengkapi data)
    const customerDetails = {
      first_name: profile?.full_name || user.email?.split("@")[0],
      email: user.email,
      // Jika Anda memiliki data phone di profil, tambahkan di sini
      phone: "08123456789", // Placeholder jika tidak ada data aktual
    };

    // Buat catatan pesanan di database
    const { data: orderData, error: orderError } = await supabase
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

    // Simpan data order di variabel luar scope untuk cleanup jika Midtrans gagal
    order = orderData;

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
      // Callback URL sangat penting untuk e-wallet seperti GoPay
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

    // --- LOGIKA PEMBUATAN TOKEN DENGAN ERROR HANDLING SPESIFIK ---
    let token;
    try {
      // Buat token transaksi Midtrans
      token = await snap.createTransactionToken(parameter);
      console.log(
        `Midtrans Token created successfully for Order ID: ${order.id}`
      );
    } catch (midtransError) {
      // Jika pembuatan token Midtrans GAGAL, ini menangkap error yang acak (seperti failed to load VA/QRIS)
      const errorMessage = (midtransError as Error).message;
      console.error(
        "Midtrans Token Creation Failed. Cleaning up DB:",
        errorMessage
      );

      // Membersihkan pesanan yang baru dibuat di Supabase
      const { error: deleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (deleteError) {
        console.error(
          "Failed to cleanup failed order in Supabase:",
          deleteError
        );
      }

      // Kembalikan error spesifik ke frontend
      return new NextResponse(
        `Failed to create transaction token: ${errorMessage}`,
        { status: 500 }
      );
    }
    // --- AKHIR LOGIKA PEMBUATAN TOKEN ---

    return NextResponse.json({ token });
  } catch (error) {
    // Ini menangani error sebelum Midtrans dipanggil (misal: Supabase gagal insert)
    console.error("API Checkout Error:", error);

    return new NextResponse(
      error instanceof Error ? error.message : "Failed to create transaction",
      { status: 500 }
    );
  }
}
