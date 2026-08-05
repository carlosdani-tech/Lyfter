import { getCartSubtotal, getCartTotal, loadCart, submitCheckout } from "../services/cartService.js";
import { getCurrentUser } from "../services/sessionService.js";
import { showEmpty, showError, showLoading, clearMessage } from "../ui/alerts.js";
import { escapeHtml, formatCurrency } from "../utils/formatters.js";
import { handleApiAuthError, requireAuth } from "../utils/guards.js";
import { hasMinimumLength, isRequired, isValidEmail, isValidPaymentReference, isValidPhone } from "../utils/validators.js";

const form = document.querySelector("[data-checkout-form]");
const submitButton = form?.querySelector("[data-submit-button]");
const formError = form?.querySelector("[data-form-error]");
const statusMessage = document.querySelector("[data-checkout-status]");
const orderItems = document.querySelector("[data-order-items]");
const orderSubtotal = document.querySelector("[data-order-subtotal]");
const orderTotal = document.querySelector("[data-order-total]");
let currentItems = [];
let isSubmitting = false;


function setFieldError(fieldName, message) {
  const field = form?.elements?.[fieldName];
  const error = form?.querySelector(`[data-error-for="${fieldName}"]`);

  if (error) error.textContent = message || "";
  if (field) field.toggleAttribute("aria-invalid", Boolean(message));
}

function clearFormErrors() {
  form?.querySelectorAll("[data-error-for]").forEach((error) => {
    error.textContent = "";
  });

  form?.querySelectorAll("[aria-invalid]").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });

  if (formError) formError.textContent = "";
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "Procesando..." : "Confirmar pedido";
}

function renderOrderSummary(items) {
  currentItems = items;
  if (!orderItems) return;

  orderItems.innerHTML = "";

  if (!items.length) {
    orderItems.innerHTML = '<p class="empty-state">Tu carrito está vacío.</p>';
  } else {
    orderItems.innerHTML = items.map((item) => `
      <article class="checkout-summary-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${item.quantity} x ${formatCurrency(item.price)}</p>
        </div>
        <strong>${formatCurrency(item.price * item.quantity)}</strong>
      </article>
    `).join("");
  }

  if (orderSubtotal) orderSubtotal.textContent = formatCurrency(getCartSubtotal(items));
  if (orderTotal) orderTotal.textContent = formatCurrency(getCartTotal(items));
}

function prefillBuyer() {
  const user = getCurrentUser();
  if (!user || !form) return;

  if (user.name) form.elements.fullName.value = user.name;
  if (user.email) form.elements.email.value = user.email;
}

function validateCheckoutForm(formData) {
  let isValid = true;
  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const billingAddress = formData.get("billingAddress");
  const shippingAddress = formData.get("shippingAddress");
  const paymentMethod = formData.get("paymentMethod");
  const paymentReference = formData.get("paymentReference");

  if (!isRequired(fullName)) {
    setFieldError("fullName", "El nombre completo es requerido.");
    isValid = false;
  } else if (!hasMinimumLength(fullName, 3)) {
    setFieldError("fullName", "El nombre debe tener al menos 3 caracteres.");
    isValid = false;
  }

  if (!isRequired(email)) {
    setFieldError("email", "El correo electrónico es requerido.");
    isValid = false;
  } else if (!isValidEmail(email)) {
    setFieldError("email", "El correo electrónico no tiene un formato válido.");
    isValid = false;
  }

  if (!isRequired(phone)) {
    setFieldError("phone", "El teléfono es requerido.");
    isValid = false;
  } else if (!isValidPhone(phone)) {
    setFieldError("phone", "Ingresa un teléfono válido.");
    isValid = false;
  }

  if (!isRequired(billingAddress)) {
    setFieldError("billingAddress", "La dirección de facturación es requerida.");
    isValid = false;
  } else if (!hasMinimumLength(billingAddress, 8)) {
    setFieldError("billingAddress", "La dirección debe tener al menos 8 caracteres.");
    isValid = false;
  }

  if (!isRequired(shippingAddress)) {
    setFieldError("shippingAddress", "La dirección de envío es requerida.");
    isValid = false;
  } else if (!hasMinimumLength(shippingAddress, 8)) {
    setFieldError("shippingAddress", "La dirección debe tener al menos 8 caracteres.");
    isValid = false;
  }

  if (!isRequired(paymentMethod)) {
    setFieldError("paymentMethod", "Selecciona un método de pago.");
    isValid = false;
  }

  if (!isValidPaymentReference(paymentReference)) {
    setFieldError("paymentReference", "Usa una referencia corta con letras, números o guiones, sin datos sensibles.");
    isValid = false;
  }

  return isValid;
}

function getBuyerInfo(formData) {
  return {
    fullName: String(formData.get("fullName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    billingAddress: String(formData.get("billingAddress") || "").trim(),
    shippingAddress: String(formData.get("shippingAddress") || "").trim(),
    paymentMethod: String(formData.get("paymentMethod") || "").trim(),
    paymentReference: String(formData.get("paymentReference") || "").trim(),
  };
}

function disableCheckoutForm() {
  form?.querySelectorAll("input, textarea, select, button").forEach((field) => {
    field.disabled = true;
  });
}

async function loadCheckoutCart() {
  showLoading(statusMessage, "Cargando carrito...");
  const items = await loadCart();
  renderOrderSummary(items);

  if (!items.length) {
    showEmpty(statusMessage, "Tu carrito está vacío. Agrega productos antes de continuar.");
    if (submitButton) submitButton.disabled = true;
    return false;
  }

  clearMessage(statusMessage);
  if (submitButton) submitButton.disabled = false;
  return true;
}

async function initializeCheckout() {
  renderOrderSummary([]);
  prefillBuyer();

  if (!requireAuth()) {
    disableCheckoutForm();
    return;
  }

  try {
    await loadCheckoutCart();
  } catch (error) {
    if (handleApiAuthError(error, { forbiddenMessageTarget: statusMessage, redirectForbidden: false })) return;
    showError(statusMessage, error.message || "No se pudo cargar el carrito.");
    if (submitButton) submitButton.disabled = true;
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  clearFormErrors();
  clearMessage(statusMessage);

  const formData = new FormData(form);
  if (!validateCheckoutForm(formData)) return;

  setSubmitting(true);
  isSubmitting = true;

  let isRedirecting = false;

  try {
    showLoading(statusMessage, "Actualizando carrito...");
    const refreshedItems = await loadCart();
    renderOrderSummary(refreshedItems);

    if (!refreshedItems.length) {
      showEmpty(statusMessage, "Tu carrito está vacío. Agrega productos antes de continuar.");
      return;
    }

    showLoading(statusMessage, "Procesando pedido...");
    await submitCheckout(getBuyerInfo(formData), refreshedItems);
    isRedirecting = true;
    window.location.href = "./checkout-success.html";
  } catch (error) {
    if (handleApiAuthError(error, { forbiddenMessageTarget: statusMessage, redirectForbidden: false })) return;
    showError(statusMessage, error.message || "No se pudo procesar el pedido.");
    if (formError) formError.textContent = error.message || "No se pudo procesar el pedido.";
  } finally {
    if (isRedirecting) return;

    isSubmitting = false;
    setSubmitting(false);
    if (!currentItems.length && submitButton) submitButton.disabled = true;
  }
});

initializeCheckout();