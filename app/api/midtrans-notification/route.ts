import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Helper untuk membuat klien Supabase dengan Service Role Key
// Karena notifikasi Midtrans datang dari non-authenticated server
const createServiceSupabaseClient = () => {
  // Anda harus memastikan file createClient Anda dapat menerima argumen,
  // atau ganti impor ke '@supabase/supabase-js'
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
};

export async function POST(req: Request) {
  try {
    const notificationJson = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY; // 1. Verifikasi Signature Hash (Penting untuk Keamanan)

    const orderId = notificationJson.order_id;
    const statusCode = notificationJson.status_code;
    const grossAmount = notificationJson.gross_amount; // Buat Signature Hash

    const signature = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex"); // Bandingkan dengan signature yang dikirim Midtrans

    if (signature !== notificationJson.signature_key) {
      console.warn("Signature verification failed for Order ID:", orderId);
      return new NextResponse("Invalid Signature", { status: 401 });
    } // 2. Ambil Status dari Payload Notifikasi

    const transactionStatus = notificationJson.transaction_status;
    const fraudStatus = notificationJson.fraud_status;
    const midtransOrderId = notificationJson.order_id;

    let newStatus = "pending"; // Tentukan status baru berdasarkan notifikasi

    if (transactionStatus === "capture") {
      if (fraudStatus == "accept") {
        newStatus = "success";
      } else {
        // Jika capture tapi fraud challenge/reject, tetap pending/failure
        newStatus = "failure";
      }
    } else if (transactionStatus === "settlement") {
      newStatus = "success";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire" ||
      transactionStatus === "failure"
    ) {
      // Menambahkan status 'failure' dari Midtrans
      newStatus = "failure";
    } // 3. Update Database Supabase

    // TIDAK perlu memeriksa newStatus !== "pending" karena Midtrans mungkin mengirim
    // status pending ulang, dan kita harus memastikan order yang expired diupdate ke failure.

    const supabase = createServiceSupabaseClient(); // Ekstrak ID internal Supabase

    const internalOrderId = midtransOrderId.replace("belibeli-trx-", "");

    const { error: updateError } = await supabase
      .from("orders") // PERBAIKAN UTAMA: HANYA update kolom 'status'
      .update({ status: newStatus })
      .eq("id", internalOrderId);

    if (updateError) {
      console.error("Supabase update error:", updateError); // Kirim 500 agar Midtrans mencoba lagi
      return new NextResponse("Database Update Failed", { status: 500 });
    }

    console.log(`Order ID ${internalOrderId} updated to status: ${newStatus}`); // 4. Respon Wajib (200 OK) // Ini menghentikan Midtrans dari pengiriman notifikasi berulang
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Midtrans Notification Handler Global Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
