import { escapeHtml, formatCurrency } from "../utils/formatters.js";


function getStockText(stock) {
  if (stock <= 0) return "Agotado";
  if (stock === 1) return "1 disponible";
  return `${stock} disponibles`;
}

function createImageFallback() {
  return Object.assign(document.createElement("div"), {
    className: "product-card-image product-image-placeholder",
    textContent: "Sin imagen",
  });
}

export function createProductCard(product) {
  const article = document.createElement("article");
  const imageMarkup = product.imageUrl
    ? `<img class="product-card-image" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" fetchpriority="low" data-image-fallback>`
    : '<div class="product-card-image product-image-placeholder" aria-hidden="true">Sin imagen</div>';

  article.className = "product-card";
  article.innerHTML = `
    <div class="product-card-media">${imageMarkup}</div>
    <div class="product-card-body">
      <span class="badge">${escapeHtml(product.category)}</span>
      <h2>${escapeHtml(product.name)}</h2>
      <p class="product-card-price">${formatCurrency(product.price)}</p>
      <p class="product-card-stock" data-stock="${product.stock > 0 ? "available" : "empty"}">${getStockText(product.stock)}</p>
      <a class="button primary-button" href="./product-detail.html?id=${encodeURIComponent(product.id)}">Ver detalle</a>
    </div>
  `;

  article.querySelector("[data-image-fallback]")?.addEventListener("error", (event) => {
    event.currentTarget.replaceWith(createImageFallback());
  }, { once: true });

  return article;
}