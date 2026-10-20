import { useContext } from "react";
import { CheckoutContext } from "../context/CheckoutContext";

export default function useCheckoutContext() {
  const checkout = useContext(CheckoutContext);
  if (!checkout) throw new Error("useCheckoutContext requires CheckoutProvider.");
  return checkout;
}
