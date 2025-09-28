import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// API route ini akan dipanggil oleh n8n
export async function GET(request: NextRequest) {
  // 1. Keamanan: Cek secret token
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATION_TOKEN) {
    return new NextResponse(JSON.stringify({ message: "Invalid Token" }), {
      status: 401,
      statusText: "Unauthorized",
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Ambil path yang akan di-revalidate
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return new NextResponse(JSON.stringify({ message: "Missing path param" }), {
      status: 400,
    });
  }

  // 3. Lakukan revalidasi (membersihkan cache server)
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
