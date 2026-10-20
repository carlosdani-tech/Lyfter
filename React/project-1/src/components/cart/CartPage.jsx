import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import useCartContext from "../../hooks/useCartContext";
import { formatDecimalColones } from "../../utils/formatters";
import { cartItemAvailability } from "../../utils/cartPresentation";
import ProductThumbnail from "../products/ProductThumbnail";

function CartItem({ item, onItemRemoved }) {
  const { productsById, pendingItemIds, isStale, checkoutLocked, incrementItem, decrementItem, removeItem, setItemQuantity } = useCartContext();
  const activeAction = useRef(false);
  const busy = pendingItemIds.includes(item.id);
  const availability = cartItemAvailability(item, productsById);
  const product = productsById?.[item.product_id];
  const blocked = busy || isStale || checkoutLocked;
  const increaseDisabled = blocked || availability.status !== "available" || item.quantity >= availability.stock;
  const decreaseDisabled = blocked || (item.quantity > 1 && ["unknown", "unavailable", "out-of-stock"].includes(availability.status));
  const run = async (event, action) => {
    if (activeAction.current || blocked) return;
    activeAction.current = true;
    const button = event.currentTarget;
    try {
      const result = await action(item.id);
      if (result && !result.items.some((entry) => entry.id === item.id) &&
        (document.activeElement === button || document.activeElement === document.body)) onItemRemoved();
    } finally { activeAction.current = false; }
  };
  const itemTitleId = `cart-item-${item.id}-title`;
  const availabilityId = `cart-item-${item.id}-availability`;
  return (
    <li className="cart-item" aria-labelledby={itemTitleId} aria-busy={busy}>
      <ProductThumbnail imageUrl={product?.image_url} name={item.name} />
      <div className="cart-item__body">
        <div className="cart-item__heading">
          <div>
            <p className="cart-item__id">Producto #{item.product_id}</p>
            <h2 id={itemTitleId}>{item.name}</h2>
          </div>
          <button type="button" className="cart-item__remove" disabled={blocked}
            aria-label={`Eliminar ${item.name} del carrito`} onClick={(event) => { void run(event, removeItem); }}>Quitar</button>
        </div>
        <p id={availabilityId} className={`cart-item__availability${availability.status !== "available" ? " cart-item__availability--warning" : ""}`}>
          {availability.status === "unknown" ? "Verificando disponibilidad..." :
            availability.status === "unavailable" ? "Este producto ya no está disponible. Elimínalo o actualiza el carrito." :
            availability.status === "out-of-stock" ? "Sin stock. Elimina este artículo para continuar." :
            availability.status === "quantity-conflict" ? `Stock disponible: ${availability.stock}. Ajusta la cantidad para continuar.` :
            `Disponibles: ${availability.stock}`}
        </p>
        <div className="cart-item__details">
          <div className="cart-quantity" role="group" aria-label={`Cantidad de ${item.name}`} aria-describedby={availabilityId}>
            <button type="button" disabled={decreaseDisabled}
              aria-label={`Disminuir cantidad de ${item.name}${item.quantity === 1 ? "; eliminar artículo" : ""}`}
              onClick={(event) => { void run(event, decrementItem); }}>−</button>
            <output aria-label={`Cantidad actual de ${item.name}`}>{item.quantity}</output>
            <button type="button" disabled={increaseDisabled} aria-label={`Aumentar cantidad de ${item.name}`}
              onClick={(event) => { void run(event, incrementItem); }}>+</button>
          </div>
          <dl className="cart-item__price"><dt>Precio unitario</dt><dd>{formatDecimalColones(item.unit_price)}</dd></dl>
          <dl className="cart-item__subtotal"><dt>Subtotal</dt><dd>{formatDecimalColones(item.line_total)}</dd></dl>
        </div>
        {availability.status === "quantity-conflict" && (
          <button type="button" className="cart-link-button" disabled={blocked}
            onClick={(event) => { void run(event, (id) => setItemQuantity(id, availability.stock)); }}>
            Usar el stock disponible ({availability.stock})
          </button>
        )}
        {busy && <p className="cart-item__progress">Actualizando este artículo...</p>}
      </div>
    </li>
  );
}

export default function CartPage() {
  const { cart, items, loading, error, productError, isStale, notice, displayTotals, canCheckout, refreshCart } = useCartContext();
  const headingRef = useRef(null);
  useEffect(() => { void refreshCart(); }, [refreshCart]);
  const initialLoading = !cart && !error;
  const feedback = error || productError;
  const status = initialLoading ? "Cargando tu carrito..." : loading ? "Actualizando el carrito y verificando disponibilidad..." : notice;
  return (
    <main className="cart-page">
      <div className="cart-container">
        <div className="cart-page__heading">
          <h1 id="cart-title" ref={headingRef} tabIndex={-1}>Carrito de compras</h1>
          <div className="cart-page__navigation">
            <button type="button" className="cart-link-button" disabled={loading}
              onClick={() => { void refreshCart(); }}>Actualizar carrito</button>
            <Link to="/productos" className="cart-catalog-link">Seguir comprando</Link>
          </div>
        </div>
        <p className="cart-status" role="status" aria-live="polite" aria-atomic="true">{status || ""}</p>
        {feedback && <div className="cart-alert" role="alert">
          <p>{feedback}</p>
          <button type="button" className="cart-link-button" disabled={loading}
            onClick={() => { void refreshCart(); }}>Actualizar carrito</button>
        </div>}
        <div className="cart-layout">
          <section className="cart-items-section" aria-label="Artículos del carrito">
            {initialLoading ? <div className="cart-empty" aria-busy="true"><div className="spinner" aria-hidden="true" /><p>Cargando productos...</p></div> :
              !cart ? <div className="cart-empty"><h2>No pudimos cargar tu carrito</h2><p>Intenta actualizarlo para continuar.</p><Link to="/productos">Ver productos</Link></div> :
              items.length === 0 ? <div className="cart-empty">
                <span className="cart-empty__icon" aria-hidden="true">🐾</span><h2>Tu carrito está vacío</h2>
                <p>Encuentra algo especial para tu mascota.</p><Link className="cart-primary" to="/productos">Ver productos</Link>
              </div> : <ul className="cart-items">{items.map((item) => <CartItem key={item.id} item={item}
                onItemRemoved={() => headingRef.current?.focus()} />)}</ul>}
          </section>
          <aside className="cart-summary" aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title">Resumen del pedido</h2>
            <dl className="cart-summary__total" aria-busy={loading}>
              <dt>Total:</dt><dd>{cart ? displayTotals.total : "—"}</dd>
            </dl>
            <p className="cart-summary__hint" id="cart-checkout-hint">
              {loading ? "Verificando total y disponibilidad..." : isStale ? "Actualiza el carrito para confirmar el total." :
                !cart || !items.length ? "Agrega productos para continuar." : !canCheckout ? "Revisa la disponibilidad y las cantidades antes de continuar." : "Total confirmado por la tienda."}
            </p>
            {canCheckout ? <Link to="/checkout" className="cart-primary" aria-describedby="cart-checkout-hint">Ir al checkout</Link> :
              <button type="button" className="cart-primary" disabled aria-describedby="cart-checkout-hint">Ir al checkout</button>}
          </aside>
        </div>
      </div>
    </main>
  );
}
