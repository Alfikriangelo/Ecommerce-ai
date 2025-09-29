// components/add-to-cart-button.tsx

"use client";

import { useCart } from "@/context/cart-context";
import { Button } from "./ui/button";

// Definisikan tipe data untuk prop 'product'
// Ini memastikan komponen menerima data dengan format yang benar
type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export function AddToCartButton({ product }: { product: Product }) {
  // Ambil fungsi addToCart dari context
  const { addToCart } = useCart();

  return (
    // Saat tombol diklik, panggil fungsi addToCart dengan data produk ini
    <Button onClick={() => addToCart(product)}>Add to Cart</Button>
  );
}
