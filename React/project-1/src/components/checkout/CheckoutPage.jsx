import { useEffect } from "react";
import { Link } from "react-router-dom";
import useCartContext from "../../hooks/useCartContext";
import useCheckoutContext from "../../hooks/useCheckoutContext";
import { formatDecimalColones } from "../../utils/formatters";

const GENERAL_CHECKOUT_ERROR =
  "Ocurrió un problema al procesar tu compra. Por favor intenta de nuevo.";

const FIELDS = [
  ["full_name", "Nombre completo", 200, "name"],
  ["buyer_email", "Correo electrónico", 254, "email"],
  ["line1", "Dirección de envío", 200, "address-line1"],
  ["line2", "Dirección adicional (opcional)", 200, "address-line2"],
  ["city", "Ciudad", 100, "address-level2"],
  ["province", "Provincia", 100, "address-level1"],
  ["postal_code", "Código postal", 20, "postal-code"],
  ["country", "País (código de dos letras)", 2, "country"],
];

export default function CheckoutPage() {
  const cart = useCartContext();
  const checkout = useCheckoutContext();
  const { refreshCart } = cart;
  const { startNewPurchase } = checkout;
  useEffect(() => { void refreshCart(); }, [refreshCart]);
  useEffect(() => { startNewPurchase(); }, [startNewPurchase, cart.cartVersion]);
  const retrying = ["uncertain", "conflict"].includes(checkout.status);
  const submitting = checkout.status === "submitting";
  const processingFailed = ["rejected", "uncertain", "conflict"].includes(checkout.status);
  const hasCheckoutAlert = processingFailed || Boolean(checkout.error);
  return <main className="purchase-page">
    <nav className="purchase-progression" aria-label="Proceso de compra"><Link to="/carrito">Carrito</Link><span aria-hidden="true"> / </span><span aria-current="step">Checkout</span></nav>
    <h1>Checkout</h1>
    <p className="checkout-intro">Revisa los detalles de tu compra y completa la información necesaria para finalizar el pedido.</p>
    {!cart.cart && !cart.error && <p role="status">Cargando tu carrito...</p>}
    {!cart.loading && (cart.cart || cart.error) && !cart.canCheckout && !retrying && !submitting && <div className="cart-alert" role={hasCheckoutAlert ? undefined : "alert"}>
      <p>{cart.cart && !cart.items.length ? "Tu carrito está vacío." : "Revisa el carrito y su disponibilidad antes de confirmar."}</p>
      <Link to="/carrito">Volver al carrito</Link>
    </div>}
    <form className="checkout-layout" onSubmit={(event) => { event.preventDefault(); void checkout.submit(); }} aria-busy={submitting}>
      <section className="purchase-card" aria-labelledby="buyer-title">
        <h2 id="buyer-title">Información de compra</h2>
        <fieldset className="checkout-fields" disabled={checkout.formLocked}>
          <legend className="sr-only">Datos para completar la compra</legend>
          {FIELDS.map(([name, label, maxLength, autoComplete]) => {
            const address = !["full_name", "buyer_email"].includes(name);
            const field = address ? `shipping_address.${name}` : name;
            const value = address ? checkout.draft.shipping_address[name] : checkout.draft[name];
            const error = checkout.fieldErrors[field];
            return <div className={`checkout-field${["full_name", "buyer_email", "line1", "line2"].includes(name) ? " checkout-field--wide" : ""}`} key={field}>
              <label htmlFor={`buyer-${name}`}>{label}</label>
              <input id={`buyer-${name}`} name={field} type={name === "buyer_email" ? "email" : "text"}
                autoComplete={autoComplete} value={value} maxLength={maxLength} required={name !== "line2"}
                pattern={name === "country" ? "[A-Za-z]{2}" : undefined}
                aria-invalid={Boolean(error)} aria-describedby={error ? `buyer-${name}-error` : undefined}
                onChange={(event) => checkout.setField(field, event.target.value)} />
              {error && <p id={`buyer-${name}-error`} className="checkout-field-error">{error}</p>}
            </div>;
          })}
        </fieldset>
        <p className="purchase-hint">Usamos esta información para completar tu compra y preparar la confirmación.</p>
      </section>
      <section className="purchase-card" aria-labelledby="order-title">
        <h2 id="order-title">Resumen del pedido</h2>
        <ul className="checkout-items" aria-busy={cart.loading}>
          {cart.items.map((item) => <li key={item.id}><div><strong>{item.name}</strong><span>{item.quantity} × {formatDecimalColones(item.unit_price)}</span></div><strong>{formatDecimalColones(item.line_total)}</strong></li>)}
        </ul>
        <dl className="purchase-total" aria-busy={cart.loading}><dt>Total:</dt><dd>{cart.cart ? cart.displayTotals.total : "—"}</dd></dl>
        <p className="purchase-hint">La tienda verifica los precios y el stock al confirmar.</p>
        {retrying && <p className="purchase-hint">Conservamos los datos y el mismo intento para evitar duplicados. Reintenta aquí sin recargar la página; no inicies otra compra mientras el resultado sea incierto.</p>}
        {hasCheckoutAlert && <div className="cart-alert checkout-error" role="alert">
          {processingFailed && <p>{GENERAL_CHECKOUT_ERROR}</p>}
          {checkout.error && <p>{checkout.error}</p>}
        </div>}
        <p className="purchase-progress" role="status" aria-live="polite">{submitting ? "Confirmando tu compra..." : cart.loading ? "Actualizando el resumen..." : ""}</p>
        <button className="cart-primary" type="submit" disabled={!checkout.canSubmit}>Confirmar compra</button>
        {checkout.saleId && <Link to={`/compra/${checkout.saleId}`} className="purchase-secondary">Ver confirmación</Link>}
        <Link className="purchase-secondary" to="/carrito" onClick={checkout.cancelDraft}>Cancelar</Link>
      </section>
    </form>
  </main>;
}
