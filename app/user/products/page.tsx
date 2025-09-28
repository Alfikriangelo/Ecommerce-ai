// app/user/products/page.tsx

import Image from "next/image";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Header } from "@/components/header";

// Definisikan tipe di sini atau impor dari file terpusat
type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

export default async function UserProductsPage() {
  const supabase = await createServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    // Membungkus dalam satu elemen root <div> agar Header dan main sejajar
    <div>
      <Header />
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-8 text-center">
          <h1 className="text-balance text-4xl font-bold">Our Menu</h1>
          <p className="text-muted-foreground">
            Delicious food waiting for you
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* PERBAIKAN: Cek apakah 'products' ada sebelum melakukan .map */}
          {products &&
            products.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription className="line-clamp-2 h-10">
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
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <p className="text-lg font-semibold">
                    {formatPrice(product.price)}
                  </p>
                  {/* Sekarang TypeScript yakin 'product' adalah objek Product, bukan null */}
                  <AddToCartButton product={product as Product} />
                </CardFooter>
              </Card>
            ))}
        </section>
      </main>
    </div>
  );
}
