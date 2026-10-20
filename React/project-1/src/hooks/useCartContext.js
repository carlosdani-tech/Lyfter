import { useContext } from "react";
import { CartContext } from "../context/CartContext";

export default function useCartContext() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCartContext requires CartProvider.");
  return cart;
}
