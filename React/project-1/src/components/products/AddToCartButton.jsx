import { useRef } from "react";
import { toast } from "react-toastify";
import useAuthContext from "../../hooks/useAuthContext";
import useCartContext from "../../hooks/useCartContext";

export default function AddToCartButton({ product, detail = false }) {
  const { isClient } = useAuthContext();
  const { addItem, pendingProductIds, checkoutLocked } = useCartContext();
  const inFlight = useRef(false);
  const busy = isClient && pendingProductIds.includes(product.id);
  const available = product.is_active !== false && product.stock > 0;
  const availabilityId = `product-${product.id}-cart-availability`;
  async function handleAddToCart() {
    if (inFlight.current || !available || busy || checkoutLocked) return;
    inFlight.current = true;
    try {
      const cart = await addItem(product.id, 1);
      if (cart !== null) {
        const name = typeof product.name === "string" ? product.name.trim() : "";
        toast.success(name ? `${name} se agregó al carrito.` : "Producto agregado al carrito.");
      }
    } finally {
      inFlight.current = false;
    }
  }
  return (
    <>
      <button type="button"
        className={`${detail ? "product-detail__button" : "product-card__button"} cart-add-button`}
        disabled={!available || busy || checkoutLocked}
        aria-busy={busy}
        aria-describedby={!available ? availabilityId : undefined}
        onClick={handleAddToCart}>
        Agregar al carrito
      </button>
      {!available && <p id={availabilityId} className="cart-add-unavailable">
        {product.is_active === false ? "Este producto ya no está disponible." : "Sin stock por el momento."}
      </p>}
    </>
  );
}
