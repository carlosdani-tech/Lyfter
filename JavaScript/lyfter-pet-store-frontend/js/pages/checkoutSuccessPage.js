import { clearCheckoutConfirmation, getCheckoutConfirmation } from "../services/cartService.js";
import { escapeHtml, formatCurrency } from "../utils/formatters.js";

const successMessage = document.querySelector("[data-success-message]");
const summaryContainer = document.querySelector("[data-success-summary]");


function renderSuccessSummary(summary) {
  if (!summaryContainer || !summary) return;

  const orderId = summary.orderId ? `<p>Pedido: <strong>${escapeHtml(summary.orderId)}</strong></p>` : "";
  const itemsMarkup = Array.isArray(summary.items)
    ? summary.items.map((item) => `<li>${escapeHtml(item.name)} - ${item.quantity} x ${formatCurrency(item.price)}</li>`).join("")
    : "";

  summaryContainer.hidden = false;
  summaryContainer.innerHTML = `
    ${orderId}
    <p>Cliente: <strong>${escapeHtml(summary.buyer?.fullName)}</strong></p>
    <p>Método de pago: <strong>${escapeHtml(summary.paymentMethod)}</strong></p>
    <ul class="success-items-list">${itemsMarkup}</ul>
    <p>Total: <strong>${formatCurrency(summary.total)}</strong></p>
  `;
}

const confirmation = getCheckoutConfirmation();

if (confirmation) {
  renderSuccessSummary(confirmation);
  clearCheckoutConfirmation();
} else if (successMessage) {
  successMessage.textContent = "Tu pedido fue procesado. No hay un resumen temporal disponible.";
}
