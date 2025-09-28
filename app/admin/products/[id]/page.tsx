import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DeleteForm } from "@/components/delete-form";

// Fungsi untuk memformat harga (bisa dipindah ke file utilitas jika perlu)
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

// Props 'params' akan berisi ID dari URL
export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerClient();

  // Cek otentikasi pengguna
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Ambil data satu produk berdasarkan ID
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single(); // .single() untuk mengambil satu baris data

  // Jika produk tidak ditemukan, tampilkan halaman 404
  if (!product || error) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-8">
        <Link
          href="/admin/products"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Products
        </Link>
        <h1 className="mt-2 text-balance text-4xl font-bold">{product.name}</h1>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg">
          <Image
            src={product.image_url || "/placeholder.png"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-muted-foreground">
              {product.description || "No description."}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Price</h2>
            <p className="text-2xl font-bold">{formatPrice(product.price)}</p>
          </div>

          <div className="mt-auto flex gap-4 pt-4">
            <Button asChild variant="outline">
              <Link href={`/admin/products/${product.id}/edit`}>
                Edit Product
              </Link>
            </Button>

            <DeleteForm productId={product.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
