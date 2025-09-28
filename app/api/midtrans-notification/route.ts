// app/api/midtrans-notification/route.ts

import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Helper function untuk mendapatkan ID pesanan internal dari order_id Midtrans
function extractInternalOrderId(midtransOrderId: string): number | null {
  const match = midtransOrderId.match(/^belibeli-trx-(\d+)$/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const notificationJson = await req.json();

    // 1. Inisialisasi Midtrans Client
    let apiClient = new midtransClient.Snap({
      isProduction: false, // Sesuaikan dengan lingkungan Anda
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    });

    // 2. Mendapatkan status transaksi dari Midtrans (Memverifikasi dengan API Call)
    const statusResponse = await apiClient.transaction.notification(
      notificationJson
    );

    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
      custom_field1, // Digunakan untuk RepayButton
    } = statusResponse;

    // 3. Verifikasi signature dari Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const calculatedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (calculatedSignature !== signature_key) {
      console.error("Invalid signature for order:", order_id);
      return new NextResponse("Invalid signature", { status: 403 });
    }

    // --- LOGIKA UPDATE STATUS DATABASE ---

    // Tentukan ID pesanan Midtrans yang benar
    // Gunakan custom_field1 jika ada (untuk skenario Repay), jika tidak gunakan order_id utama.
    const midtransOrderId = custom_field1 || order_id;

    // **EKSTRAK ID INTERNAL DARI midtransOrderId**
    // Karena Anda menggunakan format `belibeli-trx-{supabase_id}` di checkout
    const internalOrderId = extractInternalOrderId(midtransOrderId);

    if (!internalOrderId) {
      console.error(
        "Failed to extract internal order ID from:",
        midtransOrderId
      );
      return new NextResponse("Invalid Order ID Format", { status: 400 });
    }

    let newStatus = "pending";
    let logMessage = `Notification received for ${midtransOrderId}. Status: ${transaction_status}.`;

    // 4. Tentukan Status Baru Berdasarkan transaction_status Midtrans
    if (
      (transaction_status == "capture" && status_code == "200") || // Kartu kredit/debit berhasil
      transaction_status == "settlement" // Pembayaran non-kartu kredit/debit berhasil
    ) {
      newStatus = "success";
      logMessage = `Order ${midtransOrderId} is SUCCESS. Updating DB.`;
    } else if (
      transaction_status == "pending" // Masih menunggu pembayaran
    ) {
      newStatus = "pending";
      logMessage = `Order ${midtransOrderId} is PENDING. No DB status change needed (already pending).`;
    } else if (
      transaction_status == "deny" ||
      transaction_status == "expire" ||
      transaction_status == "cancel" ||
      transaction_status == "failure" // Tambahkan status kegagalan
    ) {
      newStatus = "failed";
      logMessage = `Order ${midtransOrderId} is FAILED (${transaction_status}). Updating DB.`;
    }

    console.log(logMessage);

    // 5. Buat Supabase client dengan service_role key untuk melewati RLS
    // Pastikan Anda menggunakan `midtrans_order_id` untuk menghindari duplikasi
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 6. Update tabel orders. Gunakan ID internal dari Supabase.
    // Order ID Supabase yang sebenarnya adalah bagian dari `midtrans_order_id` yang dibuat.
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", internalOrderId); // Update berdasarkan ID internal Supabase yang diekstrak!

    if (error) {
      console.error("Supabase update error on notification:", error);
      return new NextResponse("Supabase Update Failed", { status: 500 });
    }

    // 7. Respon ke Midtrans
    return new NextResponse("Notification received successfully", {
      status: 200,
    });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
