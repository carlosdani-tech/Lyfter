import { addProductToCart } from "../services/cartService.js";
import { findProduct, isProductInStock } from "../services/productService.js";
import { showError, showLoading, showMessage, clearMessage } from "../ui/alerts.js";
import { renderNavbar } from "../ui/navbar.js";
import { escapeHtml, formatCurrency } from "../utils/formatters.js";
import { handleApiAuthError, requireAuth } from "../utils/guards.js";

const detailContainer = document.querySelector("[data-product-detail]");
const statusMessage = document.querySelector("[data-product-detail-status]");
const navbarTarget = document.querySelector("[data-navbar]");


function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("id") || "").trim();
}

function isValidProductId(productId) {
  return /^[1-9]\d*$/.test(productId);
}

function renderProductDetail(product) {
  const hasStock = isProductInStock(product);
  const imageMarkup = product.imageUrl
    ? `<img class="product-detail-image" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" data-image-fallback>`
    : '<div class="product-detail-image product-image-placeholder" aria-hidden="true">Sin imagen</div>';

  detailContainer.innerHTML = `
    <div class="product-detail-media">${imageMarkup}</div>
    <section class="detail-content">
      <p class="eyebrow">${escapeHtml(product.category)}</p>
      <h2>${escapeHtml(product.name)}</h2>
      <p>${escapeHtml(product.description)}</p>
      <dl class="product-detail-meta">
        <div>
          <dt>Precio</dt>
          <dd>${formatCurrency(product.price)}</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>${hasStock ? `${product.stock} disponible${product.stock === 1 ? "" : "s"}` : "Agotado"}</dd>
        </div>
      </dl>
      <button class="button primary-button" type="button" data-add-to-cart ${hasStock ? "" : "disabled"}>${hasStock ? "Agregar al carrito" : "Sin stock"}</button>
      <p class="state-message" data-cart-feedback role="status" aria-live="polite" hidden></p>
    </section>
  `;

  const addToCartButton = detailContainer.querySelector("[data-add-to-cart]");
  const cartFeedback = detailContainer.querySelector("[data-cart-feedback]");

  if (!hasStock) {
    showMessage(cartFeedback, "Este producto no está disponible por el momento.", "empty");
    return;
  }

  detailContainer.querySelector("[data-image-fallback]")?.addEventListener("error", (event) => {
    const image = event.currentTarget;
    image.replaceWith(Object.assign(document.createElement("div"), {
      className: "product-detail-image product-image-placeholder",
      textContent: "Sin imagen",
    }));
  }, { once: true });

  addToCartButton.addEventListener("click", async () => {
    addToCartButton.disabled = true;
    addToCartButton.textContent = "Agregando...";

    try {
      await addProductToCart(product);
      renderNavbar(navbarTarget);
      showMessage(cartFeedback, "Producto agregado al carrito.", "success");
    } catch (error) {
      showError(cartFeedback, error.message || "No se pudo agregar el producto al carrito.");
    } finally {
      addToCartButton.disabled = false;
      addToCartButton.textContent = "Agregar al carrito";
    }
  });
}

async function loadProductDetail() {
  if (!requireAuth()) return;

  const productId = getProductIdFromUrl();

  if (!isValidProductId(productId)) {
    showError(statusMessage, "Producto no válido.");
    return;
  }

  showLoading(statusMessage, "Cargando producto...");

  try {
    const product = await findProduct(productId);

    if (!product?.id) {
      showError(statusMessage, "El producto solicitado no existe.");
      return;
    }

    clearMessage(statusMessage);
    renderProductDetail(product);
  } catch (error) {
    if (handleApiAuthError(error, { unauthorizedMessageTarget: statusMessage, forbiddenMessageTarget: statusMessage, redirectForbidden: false })) return;

    if (error?.status === 404) {
      showError(statusMessage, "El producto solicitado no existe.");
      return;
    }

    showError(statusMessage, error.message || "No se pudo cargar el detalle del producto.");
  } finally {
    if (statusMessage?.dataset.state === "loading") {
      clearMessage(statusMessage);
    }
  }
}

loadProductDetail();


