// components/delete-form.tsx

"use client"; // Tandai sebagai Client Component

import { deleteProduct } from "@/lib/actions";
import { Button } from "./ui/button";

export function DeleteForm({ productId }: { productId: number }) {
  // Karena ini adalah Server Action, kita tidak perlu useTransition
  // Form akan menangani pending state secara otomatis

  return (
    <form action={deleteProduct}>
      <input type="hidden" name="productId" value={productId} />
      <Button
        variant="destructive"
        type="submit"
        // onClick untuk konfirmasi ada di dalam Client Component, jadi ini DIIZINKAN
        onClick={(e) => {
          if (!confirm("Are you sure you want to delete this product?")) {
            e.preventDefault();
          }
        }}
      >
        Delete Product
      </Button>
    </form>
  );
}
