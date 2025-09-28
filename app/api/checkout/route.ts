import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import midtransClient from "midtrans-client";
import { v4 as uuidv4 } from "uuid";

// Inisialisasi Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false, // Ganti ke true jika sudah production
  serverKey: process.env.MIDTRANS_SERVER_KEY, // Ambil dari .env
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY, // Ambil dari .env
});

export async function POST(req: Request) {
  // 1. Setup Supabase Client untuk mengambil user profile
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const user = userData.user;
  const body = await req.json();
  const { userId, totalAmount, items } = body;

  let internalOrderId = "";

  // Safety check
  if (!process.env.NEXT_PUBLIC_SITE_URL || !process.env.MIDTRANS_SERVER_KEY) {
    return NextResponse.json(
      { success: false, message: "Server configuration missing." },
      { status: 500 }
    );
  }

  try {
    // 2. Ambil Profil Pengguna untuk Customer Details Midtrans
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // 3. Buat Entri Order di Database Supabase
    const customUuid = uuidv4();
    internalOrderId = customUuid; // Simpan ID Supabase sebelum prefix Midtrans

    const customerDetailsData = {
      email: user.email,
      name: profile?.full_name || user.email?.split("@")[0] || "Guest",
    };

    const { error: insertError } = await supabase.from("orders").insert({
      id: internalOrderId,
      user_id: userId,
      total_price: totalAmount,
      status: "pending",
      items: items,
      customer_details: customerDetailsData,
    });

    if (insertError) {
      console.error("Database Insertion Error:", insertError);
      return NextResponse.json(
        { success: false, message: "Failed to create order in database." },
        { status: 500 }
      );
    }

    // 4. Siapkan Payload Midtrans
    const midtransOrderId = `belibeli-trx-${internalOrderId}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: totalAmount,
      },
      customer_details: customerDetailsData,
      item_details: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      callbacks: {
        // Callback URL untuk redirect browser
        finish: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${internalOrderId}`,
        error: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${internalOrderId}`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${internalOrderId}`,
      },
      gopay: {
        enable_callback: true,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${internalOrderId}`,
      },
    };

    // 5. Dapatkan Snap Token dari Midtrans
    let snapToken;
    try {
      const transaction = await snap.createTransaction(parameter);
      snapToken = transaction.token;
    } catch (midtransError) {
      // PERBAIKAN: Jika pembuatan token GAGAL (karena VA/QRIS failed to load)
      const errorMessage = (midtransError as Error).message;
      console.error(
        "Midtrans Token Creation Failed. Cleaning up DB:",
        errorMessage
      );

      // Membersihkan pesanan yang baru dibuat di Supabase
      await supabase.from("orders").delete().eq("id", internalOrderId);

      return NextResponse.json(
        {
          success: false,
          message: `Failed to create transaction token: ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    console.log(
      "Midtrans Token created successfully for Order ID:",
      midtransOrderId
    );

    // 6. Respon ke Client
    return NextResponse.json({
      success: true,
      snapToken: snapToken,
      orderId: internalOrderId,
    });
  } catch (error) {
    console.error("API Checkout Global Error:", error);

    // Hapus order yang gagal dibuat tokennya di Midtrans
    if (internalOrderId) {
      await supabase.from("orders").delete().eq("id", internalOrderId);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to process transaction due to unknown error.",
      },
      { status: 500 }
    );
  }
}
