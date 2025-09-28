import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Helper untuk membuat klien Supabase dengan Service Role Key
const createServiceSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // PENTING: Gunakan Service Role Key
    { auth: { persistSession: false } }
  );
};

export async function POST(req: Request) {
  try {
    const notificationJson = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // 1. Verifikasi Signature Hash (Penting untuk Keamanan)
    const orderId = notificationJson.order_id;
    const statusCode = notificationJson.status_code;
    const grossAmount = notificationJson.gross_amount;

    const signature = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");

    if (signature !== notificationJson.signature_key) {
      console.warn("Signature verification failed for Order ID:", orderId);
      // Merespons 401 agar Midtrans tidak mengulang notifikasi yang tidak valid
      return new NextResponse("Invalid Signature", { status: 401 });
    }

    // PENTING: JANGAN PANGGIL API Midtrans LAGI. Status sudah ada di notificationJson!
    const transactionStatus = notificationJson.transaction_status;
    const fraudStatus = notificationJson.fraud_status;
    const midtransOrderId = notificationJson.order_id; // midtransOrderId adalah belibeli-trx-XXX

    let newStatus = "pending";

    if (transactionStatus === "capture") {
      // Hanya berlaku untuk Kartu Kredit yang non-3DSecure
      if (fraudStatus == "accept") {
        newStatus = "success";
      }
    } else if (transactionStatus === "settlement") {
      // Semua pembayaran tunai/VA/QRIS yang berhasil
      newStatus = "success";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      // Pembayaran gagal atau kedaluwarsa
      newStatus = "failure";
    }

    // 2. Update Database Supabase
    if (newStatus !== "pending") {
      const supabase = createServiceSupabaseClient();

      // Ekstrak ID internal Supabase dari Midtrans Order ID
      const internalOrderId = midtransOrderId.replace("belibeli-trx-", "");

      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", internalOrderId); // Update berdasarkan ID internal Supabase

      if (updateError) {
        console.error("Supabase update error:", updateError);
        // Jika update database gagal, kirim status 500 agar Midtrans mencoba lagi
        return new NextResponse("Database Update Failed", { status: 500 });
      }

      console.log(
        `Order ID ${internalOrderId} updated to status: ${newStatus}`
      );
    }

    // PENTING: Harus mengembalikan status 200 OK agar Midtrans menganggap notifikasi selesai
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Midtrans Notification Handler Global Error:", error);
    // Jika ada error internal, kirim 500 agar Midtrans mencoba lagi nanti
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
