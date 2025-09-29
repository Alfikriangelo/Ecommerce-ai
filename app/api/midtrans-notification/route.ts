import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const notificationJson = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // 1. Verifikasi Signature Hash dari Midtrans untuk keamanan
    const orderId = notificationJson.order_id;
    const statusCode = notificationJson.status_code;
    const grossAmount = notificationJson.gross_amount;
    const signature = crypto
      .createHash("sha521")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");

    if (signature !== notificationJson.signature_key) {
      console.warn("Invalid signature for order:", orderId);
      return new NextResponse("Invalid Signature", { status: 401 });
    }

    // 2. Tentukan status baru berdasarkan notifikasi
    const transactionStatus = notificationJson.transaction_status;
    let newStatus = "pending";

    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      newStatus = "success";
    } else if (
      ["cancel", "deny", "expire", "failure"].includes(transactionStatus)
    ) {
      newStatus = "failure";
    }

    // 3. Buat Supabase client dengan service_role key untuk melewati RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 4. Update tabel orders berdasarkan midtrans_order_id
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("midtrans_order_id", orderId);

    if (error) {
      console.error("Supabase update error on notification:", error);
      return new NextResponse("Database Update Failed", { status: 500 });
    }

    console.log(`Order ${orderId} updated to status: ${newStatus}`);

    // 5. Kirim respons 200 OK ke Midtrans
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Midtrans Notification Handler Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
