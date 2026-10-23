import { Link } from "react-router-dom";
import { formatDecimalColones } from "../../utils/formatters";
import { purchaseStatusText } from "../../utils/purchase";

export default function PurchaseConfirmation({ purchase }) {
  const { sale, invoice } = purchase;
  const status = purchaseStatusText(sale);
  return <>
    <section className="purchase-card confirmation-status" aria-labelledby="confirmation-title">
      {status.success && <span className="purchase-check" aria-hidden="true">✓</span>}
      <h1 id="confirmation-title">{status.title}</h1>
      <p role="status">{status.message}</p>
      <p>Compra #{sale.id} · Factura {invoice.invoice_number}</p>
    </section>
    <section className="purchase-card confirmation-summary" aria-labelledby="purchase-summary-title">
      <h2 id="purchase-summary-title">Resumen de la compra</h2>
      <div className="purchase-table-scroll" role="region" aria-labelledby="purchase-summary-title" tabIndex={0}>
        <table className="purchase-table"><caption className="sr-only">Artículos y total de la compra</caption>
          <thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio unitario</th><th scope="col">Subtotal</th></tr></thead>
          <tbody>{sale.items.map((item) => <tr key={item.id}><th scope="row">{item.product_name || `Producto #${item.product_id}`}</th><td>{item.quantity}</td><td>{formatDecimalColones(item.unit_price)}</td><td>{formatDecimalColones(item.line_total)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={3}>Total:</th><td>{formatDecimalColones(sale.total_amount)}</td></tr></tfoot>
        </table>
      </div>
    </section>
    <div className="confirmation-actions"><Link to="/productos" className="cart-primary">Volver al catálogo</Link><Link to="/" className="purchase-secondary">Ir al inicio</Link></div>
  </>;
}

