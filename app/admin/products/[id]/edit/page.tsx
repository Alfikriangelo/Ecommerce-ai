// app/admin/products/[id]/edit/page.tsx

import { notFound, redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { updateProduct } from "@/lib/actions";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // 1. Ambil data produk yang akan diedit
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) {
    notFound();
  }

  // 2. Bind ID produk ke server action agar tahu produk mana yang harus di-update
  const updateProductWithId = updateProduct.bind(null, product.id);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Edit: {product.name}</h1>
      </header>

      {/* 3. Arahkan form action ke server action yang sudah di-bind */}
      <form action={updateProductWithId} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" name="name" defaultValue={product.name} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={product.description || ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Price (IDR)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            defaultValue={product.price}
            required
          />
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <Button asChild variant="outline">
            <Link href={`/admin/products/${product.id}`}>Cancel</Link>
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </main>
  );
}
