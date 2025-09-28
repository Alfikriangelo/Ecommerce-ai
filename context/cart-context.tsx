"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { createClient } from "@/lib/supabase/client";

// Definisikan tipe data di sini atau impor dari file terpusat
type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
};

export type CartItem = Product & {
  quantity: number;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (item: Product) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCartItems = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("cart_items")
          .select(
            `
            quantity,
            products ( id, name, price, image_url )
          `
          )
          .eq("user_id", user.id);

        if (data) {
          const loadedCart = data
            .map((item) => {
              if (!item.products) return null;

              return {
                ...(item.products as Product),
                quantity: item.quantity,
              };
            })
            .filter(Boolean) as CartItem[];

          setCartItems(loadedCart);
        }
      }
      setIsLoading(false);
    };

    fetchCartItems();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          fetchCartItems();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const addToCart = async (product: Product) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to add items to your cart.");
      return;
    }

    const existingItem = cartItems.find((item) => item.id === product.id);

    if (existingItem) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .match({ user_id: user.id, product_id: product.id });

      if (!error) {
        setCartItems(
          cartItems.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
      });

      if (!error) {
        setCartItems([...cartItems, { ...product, quantity: 1 }]);
      }
    }
  };

  const clearCart = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setCartItems([]);
    } else {
      console.error("Error clearing cart:", error);
    }
  };

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, clearCart, isLoading }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
