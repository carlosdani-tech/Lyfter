import {
  createProduct,
  deactivateProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "../api/productsApi.js";
import { STORAGE_KEYS } from "../config.js";
import { readStorage, removeStorage, writeStorage } from "../utils/storage.js";
import { hasMinimumLength, isPositiveNumber, isRequired, isNonNegativeInteger, isValidUrl } from "../utils/validators.js";

const PRODUCTS_CACHE_TTL_MS = 60000;

function getRawProducts(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.products)) return response.data.products;
  return [];
}

function getRawProduct(response) {
  return response?.product || response?.data?.product || response?.data || response || null;
}

function getProductsCacheKey(filters = {}) {
  return `${STORAGE_KEYS.productsCache}:${JSON.stringify(filters)}`;
}

function readProductsCache(filters = {}) {
  const cached = readStorage(getProductsCacheKey(filters));
  if (!cached || !Array.isArray(cached.products)) return null;
  if (Date.now() - Number(cached.savedAt || 0) > PRODUCTS_CACHE_TTL_MS) return null;
  return cached.products;
}

function writeProductsCache(products, filters = {}) {
  writeStorage(getProductsCacheKey(filters), {
    savedAt: Date.now(),
    products,
  });
}

export function clearProductsCache() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_KEYS.productsCache))
    .forEach((key) => removeStorage(key));
}

export function normalizeProduct(product) {
  if (!product) return null;

  const price = Number(product.price ?? 0);
  const stock = Number(product.stock ?? product.inventory ?? product.stock_quantity ?? product.available_stock ?? product.quantity_available ?? 0);

  return {
    id: product.id ?? product.productId ?? product._id,
    name: product.name ?? "Producto sin nombre",
    description: product.description ?? "Sin descripción disponible.",
    category: product.category?.name ?? product.category ?? "Sin categoría",
    price: Number.isFinite(price) ? price : 0,
    stock: Number.isFinite(stock) ? stock : 0,
    imageUrl: product.imageUrl ?? product.image_url ?? product.image ?? "",
    active: product.active ?? product.isActive ?? product.is_active ?? true,
  };
}

export function buildProductPayload(productData) {
  return {
    name: String(productData.name || "").trim(),
    description: String(productData.description || "").trim(),
    category: String(productData.category || "").trim(),
    price: Number(productData.price),
    stock: Number(productData.stock),
    image_url: String(productData.imageUrl ?? productData.image_url ?? "").trim(),
  };
}

export function validateProductData(productData) {
  const errors = {};
  const payload = buildProductPayload(productData);

  if (!isRequired(payload.name)) {
    errors.name = "El nombre es requerido.";
  } else if (!hasMinimumLength(payload.name, 3)) {
    errors.name = "El nombre debe tener al menos 3 caracteres.";
  }

  if (!isRequired(payload.description)) {
    errors.description = "La descripcion es requerida.";
  } else if (!hasMinimumLength(payload.description, 8)) {
    errors.description = "La descripcion debe tener al menos 8 caracteres.";
  }

  if (!isRequired(payload.category)) {
    errors.category = "La categoria es requerida.";
  } else if (!hasMinimumLength(payload.category, 3)) {
    errors.category = "La categoria debe tener al menos 3 caracteres.";
  }

  if (!isPositiveNumber(payload.price)) {
    errors.price = "El precio debe ser un número positivo.";
  }

  if (!isNonNegativeInteger(payload.stock)) {
    errors.stock = "El stock debe ser un entero igual o mayor a cero.";
  }

  if (!isValidUrl(payload.image_url)) {
    errors.imageUrl = "Ingresa una URL válida.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    payload,
  };
}

export async function listProducts(filters = {}, options = {}) {
  const { forceRefresh = false } = options;
  const cachedProducts = forceRefresh ? null : readProductsCache(filters);
  if (cachedProducts) return cachedProducts;

  const response = await getProducts(filters);
  const products = getRawProducts(response).map(normalizeProduct).filter(Boolean);
  writeProductsCache(products, filters);
  return products;
}

export async function findProduct(productId) {
  const response = await getProductById(productId);
  return normalizeProduct(getRawProduct(response));
}

export async function createProductRecord(productData) {
  const { isValid, errors, payload } = validateProductData(productData);
  if (!isValid) {
    const error = new Error("Revisa los datos del producto.");
    error.details = errors;
    throw error;
  }

  const response = await createProduct(payload);
  clearProductsCache();
  return normalizeProduct(getRawProduct(response));
}

export async function updateProductRecord(productId, productData) {
  const { isValid, errors, payload } = validateProductData(productData);
  if (!isValid) {
    const error = new Error("Revisa los datos del producto.");
    error.details = errors;
    throw error;
  }

  const response = await updateProduct(productId, payload);
  clearProductsCache();
  return normalizeProduct(getRawProduct(response));
}

export function deactivateProductRecord(productId) {
  clearProductsCache();
  return deactivateProduct(productId);
}

export function deleteProductRecord(productId) {
  clearProductsCache();
  return deleteProduct(productId);
}

export function isProductInStock(product) {
  return Number(product?.stock || 0) > 0;
}