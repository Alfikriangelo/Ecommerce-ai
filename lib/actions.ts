"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();

  // Cek otentikasi
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const productId = formData.get("productId");
  if (!productId) {
    throw new Error("Product ID is required.");
  }

  // Hapus baris dari tabel 'products'
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product.");
  }

  // Penting: Revalidate cache agar daftar produk diperbarui
  revalidatePath("/admin/products");

  // Arahkan kembali pengguna ke halaman daftar produk
  redirect("/admin/products");
}

export async function updateProduct(productId: number, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Ambil data dari form yang di-submit
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = Number(formData.get("price"));

  if (!name || isNaN(price)) {
    throw new Error("Name and a valid price are required.");
  }

  // 2. Update baris di tabel 'products' berdasarkan ID
  const { error } = await supabase
    .from("products")
    .update({ name, description, price })
    .eq("id", productId);

  if (error) {
    console.error("Error updating product:", error);
    throw new Error("Failed to update product.");
  }

  // 3. Revalidate cache agar data di halaman daftar dan detail diperbarui
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);

  // 4. Arahkan pengguna kembali ke halaman detail setelah sukses
  redirect(`/admin/products/${productId}`);
}

export async function logout() {
  const supabase = await createClient();

  // Menghapus sesi login pengguna
  await supabase.auth.signOut();

  // Arahkan pengguna ke halaman login setelah logout
  redirect("/auth/login");
}
