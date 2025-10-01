// app\api\midtrans-notification\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const notificationJson = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const signature = crypto
      .createHash("sha512")
      .update(
        notificationJson.order_id +
          notificationJson.status_code +
          notificationJson.gross_amount +
          serverKey
      )
      .digest("hex");

    if (signature !== notificationJson.signature_key) {
      return new NextResponse("Invalid Signature", { status: 401 });
    }

    const transactionStatus = notificationJson.transaction_status;
    let newStatus = "pending";

    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      newStatus = "success";
    } else if (
      ["cancel", "deny", "expire", "failure"].includes(transactionStatus)
    ) {
      newStatus = "failed";
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("midtrans_order_id", notificationJson.order_id);

    if (error) {
      console.error("Supabase update error on notification:", error);
      return new NextResponse("Database Update Failed", { status: 500 });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Midtrans Notification Handler Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
