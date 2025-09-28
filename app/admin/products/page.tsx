// app/admin/products/page.tsx

import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription, // DISESUAIKAN: Impor CardDescription
  CardFooter,
} from "@/components/ui/card";

type Product = {
  id: number;
  name: string;
  description: string | null; // Kolom baru
  price: number;
  image_url: string | null;
};

// Fungsi untuk memformat harga ke dalam format Rupiah
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

export default async function AdminProductsPage() {
  // 1. Otentikasi (Tidak ada perubahan)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 2. Pengambilan Data: DISESUAIKAN untuk mengambil 'description'
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url") // Tambahkan 'description'
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return <p>Error loading products. Please try again later.</p>;
  }

  // 3. Tampilan (UI): Render halaman dengan data produk
  return (
    <main className="mx-auto max-w-7xl p-6">
      <section>
        {!products || products.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>No products found.</p>
            <p>
              You can{" "}
              <Link href="/admin/upload" className="text-primary underline">
                upload a new one
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {(products as Product[]).map((product) => (
              <Link href={`/admin/products/${product.id}`} key={product.id}>
                <Card key={product.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="truncate">{product.name}</CardTitle>
                    {/* DISESUAIKAN: Tampilkan deskripsi jika ada */}
                    {product.description && (
                      <CardDescription className="line-clamp-2">
                        {product.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="relative aspect-square w-full overflow-hidden rounded-md">
                      <Image
                        src={product.image_url || "/placeholder.png"}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-lg font-semibold">
                      {formatPrice(product.price)}
                    </p>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
