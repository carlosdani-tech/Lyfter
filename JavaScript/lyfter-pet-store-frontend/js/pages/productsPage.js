import { listProducts } from "../services/productService.js";
import { isAuthenticated } from "../services/sessionService.js";
import { showEmpty, showError, showLoading, clearMessage } from "../ui/alerts.js";
import { createProductCard } from "../ui/productCard.js";
import { handleApiAuthError } from "../utils/guards.js";

const productsList = document.querySelector("[data-products-list]");
const statusMessage = document.querySelector("[data-products-status]");
const searchInput = document.querySelector("[data-product-search]");
let products = [];
let hasLoadedProducts = false;
let isLoadingProducts = false;
let searchDebounceId;

function clearProducts() {
  if (productsList) {
    productsList.innerHTML = "";
  }
}

function productMatchesSearch(product, searchValue) {
  const term = searchValue.trim().toLowerCase();
  if (!term) return true;

  return [product.name, product.category].some((value) => String(value).toLowerCase().includes(term));
}

function renderProducts(items) {
  clearProducts();

  if (!items.length) {
    showEmpty(statusMessage, "No hay productos para mostrar.");
    return;
  }

  clearMessage(statusMessage);
  const fragment = document.createDocumentFragment();
  items.forEach((product) => fragment.append(createProductCard(product)));
  productsList?.append(fragment);
}

async function loadProducts() {
  if (hasLoadedProducts || isLoadingProducts) return;

  if (!isAuthenticated()) {
    clearProducts();
    showError(statusMessage, "Debes iniciar sesión para ver el catálogo.");
    return;
  }

  isLoadingProducts = true;
  clearProducts();
  showLoading(statusMessage, "Cargando productos...");

  try {
    products = await listProducts({}, { forceRefresh: true });
    hasLoadedProducts = true;
    renderProducts(products);
  } catch (error) {
    if (handleApiAuthError(error, { unauthorizedMessageTarget: statusMessage })) return;
    clearProducts();
    showError(statusMessage, error.message || "No se pudo cargar el catálogo.");
  } finally {
    isLoadingProducts = false;
  }
}

searchInput?.addEventListener("input", () => {
  window.clearTimeout(searchDebounceId);
  searchDebounceId = window.setTimeout(() => {
    renderProducts(products.filter((product) => productMatchesSearch(product, searchInput.value)));
  }, 150);
});

loadProducts();