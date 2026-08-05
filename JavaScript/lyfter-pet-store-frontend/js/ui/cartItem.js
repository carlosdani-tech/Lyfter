import { escapeHtml, formatCurrency } from "../utils/formatters.js";

const UNKNOWN_STOCK_LIMIT = Number.MAX_SAFE_INTEGER;


function createImageFallback(className) {
  return Object.assign(document.createElement("div"), {
    className,
    textContent: "Sin imagen",
  });
}

export function createCartItem(item) {
  const article = document.createElement("article");
  const imageMarkup = item.imageUrl
    ? `<img class="cart-item-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" data-image-fallback>`
    : '<div class="cart-item-image cart-item-placeholder" aria-hidden="true">Sin imagen</div>';
  const hasKnownStock = item.stock !== UNKNOWN_STOCK_LIMIT;
  const maxAttribute = hasKnownStock ? ` max="${item.stock}"` : "";
  const stockMarkup = hasKnownStock ? `<p>Stock disponible: ${item.stock}</p>` : "";

  article.className = "cart-item";
  article.dataset.cartItemId = item.cartItemId || "";
  article.innerHTML = `
    <div class="cart-item-media">${imageMarkup}</div>
    <div class="cart-item-body">
      <h2>${escapeHtml(item.name)}</h2>
      <p>${formatCurrency(item.price)}</p>
      ${stockMarkup}
    </div>
    <div class="cart-item-actions">
      <label class="field compact-field">
        <span>Cantidad</span>
        <input type="number" min="1"${maxAttribute} step="1" value="${item.quantity}" data-cart-quantity data-product-id="${escapeHtml(item.id)}">
      </label>
      <strong>${formatCurrency(item.price * item.quantity)}</strong>
      <button class="button secondary-button" type="button" data-remove-cart-item data-product-id="${escapeHtml(item.id)}">Eliminar</button>
    </div>
  `;

  article.querySelector("[data-image-fallback]")?.addEventListener("error", (event) => {
    event.currentTarget.replaceWith(createImageFallback("cart-item-image cart-item-placeholder"));
  }, { once: true });

  return article;
}