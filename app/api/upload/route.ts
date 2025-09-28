import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
const BUCKET_NAME = "product-images";

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new NextResponse("File tidak ditemukan", { status: 400 });
    }

    // Nama file tidak lagi menggunakan productId, hanya user id dan UUID.
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${user.id}-${randomUUID()}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uniqueFileName, file);

    if (uploadError) {
      throw new Error("Gagal mengunggah gambar ke storage.");
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);
    const imageUrl = publicUrlData.publicUrl;

    // Webhook tidak lagi mengirim productId.
    const url = new URL(N8N_WEBHOOK!);
    url.searchParams.append("user_id", user.id);
    url.searchParams.append("image_url", imageUrl);

    await fetch(url.toString(), { method: "POST" });

    return NextResponse.json({
      message: "File uploaded successfully. A new product is being created.",
    });
  } catch (err) {
    console.error("Upload API Error:", err);
    return new NextResponse(
      err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui",
      { status: 500 }
    );
  }
}
