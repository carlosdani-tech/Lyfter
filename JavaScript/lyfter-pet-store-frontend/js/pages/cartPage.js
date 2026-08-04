import { getCartItemCount, getCartSubtotal, getCartTotal, loadCart, removeCartItem, updateCartItemQuantity } from "../services/cartService.js";
import { isAuthenticated } from "../services/sessionService.js";
import { showEmpty, showError, showLoading, showMessage, clearMessage } from "../ui/alerts.js";
import { createCartItem } from "../ui/cartItem.js";
import { renderNavbar } from "../ui/navbar.js";
import { formatCurrency } from "../utils/formatters.js";
import { handleApiAuthError } from "../utils/guards.js";

const cartContent = document.querySelector("[data-cart-content]");
const cartItemsContainer = document.querySelector("[data-cart-items]");
const cartStatus = document.querySelector("[data-cart-status]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const cartTotal = document.querySelector("[data-cart-total]");
const checkoutLink = document.querySelector("[data-checkout-link]");
const navbarTarget = document.querySelector("[data-navbar]");
let currentItems = [];

function setCheckoutEnabled(isEnabled) {
  if (!checkoutLink) return;

  checkoutLink.toggleAttribute("aria-disabled", !isEnabled);
  checkoutLink.classList.toggle("disabled-link", !isEnabled);
}

function updateSummary(items) {
  const subtotal = getCartSubtotal(items);
  const total = getCartTotal(items);

  if (cartSubtotal) cartSubtotal.textContent = formatCurrency(subtotal);
  if (cartTotal) cartTotal.textContent = formatCurrency(total);
  setCheckoutEnabled(items.length > 0 && isAuthenticated());
}

function clearCartItems() {
  if (cartItemsContainer) {
    cartItemsContainer.innerHTML = "";
  }
}

function renderRestrictedState() {
  currentItems = [];
  clearCartItems();
  updateSummary([]);
  showError(cartStatus, "Debes iniciar sesión para revisar tu carrito y finalizar la compra.");
  cartContent?.classList.add("is-restricted");
}

function renderEmptyState(message = "Tu carrito está vacío. Agrega productos antes de continuar.") {
  currentItems = [];
  clearCartItems();
  updateSummary([]);
  showEmpty(cartStatus, message);
}

function renderCart(items = []) {
  currentItems = items;
  clearCartItems();
  cartContent?.classList.remove("is-restricted");

  if (!isAuthenticated()) {
    renderRestrictedState();
    return;
  }

  if (!items.length) {
    renderEmptyState();
    return;
  }

  clearMessage(cartStatus);
  items.forEach((item) => cartItemsContainer.append(createCartItem(item)));
  updateSummary(items);
}

function refreshNavbarCount() {
  renderNavbar(navbarTarget);
}

function handleCartApiError(error, fallbackMessage) {
  if (handleApiAuthError(error, { unauthorizedMessageTarget: cartStatus, forbiddenMessageTarget: cartStatus, redirectForbidden: false })) {
    updateSummary([]);
    return true;
  }

  showError(cartStatus, error.message || fallbackMessage);
  return false;
}

async function loadAndRenderCart() {
  if (!isAuthenticated()) {
    renderRestrictedState();
    return;
  }

  clearCartItems();
  showLoading(cartStatus, "Cargando carrito...");

  try {
    renderCart(await loadCart());
    refreshNavbarCount();
  } catch (error) {
    if (handleCartApiError(error, "No se pudo cargar el carrito.")) return;
    updateSummary([]);
  }
}

cartItemsContainer?.addEventListener("change", async (event) => {
  const quantityInput = event.target.closest("[data-cart-quantity]");
  if (!quantityInput) return;

  quantityInput.disabled = true;

  try {
    const nextItems = await updateCartItemQuantity(quantityInput.dataset.productId, Number(quantityInput.value));
    renderCart(nextItems);
    showMessage(cartStatus, "Cantidad actualizada.", "success");
    refreshNavbarCount();
  } catch (error) {
    if (!handleCartApiError(error, "No se pudo actualizar la cantidad.")) {
      await loadAndRenderCart();
    }
  } finally {
    quantityInput.disabled = false;
  }
});

cartItemsContainer?.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-cart-item]");
  if (!removeButton) return;

  removeButton.disabled = true;

  try {
    const nextItems = await removeCartItem(removeButton.dataset.productId);
    renderCart(nextItems);
    showMessage(cartStatus, "Producto eliminado del carrito.", "success");
    refreshNavbarCount();
  } catch (error) {
    if (!handleCartApiError(error, "No se pudo eliminar el producto.")) {
      await loadAndRenderCart();
    }
  }
});

checkoutLink?.addEventListener("click", (event) => {
  if (!isAuthenticated()) {
    event.preventDefault();
    showError(cartStatus, "Inicia sesión antes de finalizar la compra.");
    return;
  }

  if (getCartItemCount(currentItems) === 0) {
    event.preventDefault();
    showEmpty(cartStatus, "Tu carrito está vacío. Agrega productos antes de continuar.");
  }
});

loadAndRenderCart();