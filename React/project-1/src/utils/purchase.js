const positiveId = (value) => Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
const money = (value) => typeof value === "string" && !/\s/.test(value) && /^(0|[1-9]\d{0,7})\.\d{2}$/.test(value);

// Retain only display-safe purchase fields; buyer snapshots are deliberately excluded.
export function purchaseSummary(data, expectedId = null) {
  const sale = data?.sale;
  const invoice = data?.invoice;
  if (!sale || !invoice || !positiveId(sale.id) || !positiveId(sale.user_id) || (sale.cart_id !== null && !positiveId(sale.cart_id)) ||
    (expectedId !== null && sale.id !== expectedId) || !positiveId(invoice.id) || invoice.sale_id !== sale.id ||
    !["completed", "cancelled", "returned"].includes(sale.status) ||
    !["issued", "cancelled", "refunded"].includes(invoice.status) ||
    invoice.status !== ({ completed: "issued", cancelled: "cancelled", returned: "refunded" })[sale.status] ||
    typeof invoice.invoice_number !== "string" || !invoice.invoice_number.trim() || invoice.invoice_number.length > 100 ||
    !money(sale.subtotal_amount) || !money(sale.tax_amount) || !money(sale.total_amount) || invoice.total_amount !== sale.total_amount ||
    !Array.isArray(sale.items) || !sale.items.length) return null;
  const items = [];
  for (const item of sale.items) {
    if (!positiveId(item.id) || !positiveId(item.product_id) || !positiveId(item.quantity) ||
      !money(item.unit_price) || !money(item.line_total) ||
      (item.product_name !== null && typeof item.product_name !== "string")) return null;
    items.push(Object.freeze({ id: item.id, product_id: item.product_id, product_name: item.product_name,
      quantity: item.quantity, unit_price: item.unit_price, line_total: item.line_total }));
  }
  return Object.freeze({
    sale: Object.freeze({ id: sale.id, user_id: sale.user_id, cart_id: sale.cart_id, status: sale.status,
      email_status: ["sent", "pending", "failed"].includes(sale.email_status) ? sale.email_status : "unknown",
      subtotal_amount: sale.subtotal_amount, tax_amount: sale.tax_amount, total_amount: sale.total_amount,
      items: Object.freeze(items) }),
    invoice: Object.freeze({ id: invoice.id, sale_id: invoice.sale_id, invoice_number: invoice.invoice_number,
      status: invoice.status, total_amount: invoice.total_amount }),
  });
}

export function purchaseStatusText(sale) {
  if (sale.status === "cancelled") return { title: "Compra cancelada", message: "Esta compra fue cancelada.", success: false };
  if (sale.status === "returned") return { title: "Compra devuelta", message: "Esta compra fue devuelta.", success: false };
  const messages = {
    sent: "Hemos enviado un correo de confirmación con los detalles de tu pedido.",
    pending: "Tu compra fue registrada. El envío del correo de confirmación está pendiente.",
    failed: "Tu compra fue registrada, pero no pudimos enviar el correo de confirmación.",
    unknown: "Tu compra fue registrada. No pudimos confirmar el estado del correo.",
  };
  return { title: "¡Gracias por tu compra!", message: messages[sale.email_status] || messages.unknown, success: true };
}
