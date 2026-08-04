import { STORAGE_KEYS } from "../config.js";
import {
  addCartItem as addBackendCartItem,
  getCart as getBackendCart,
  removeCartItem as removeBackendCartItem,
  updateCartItem as updateBackendCartItem,
} from "../api/cartApi.js";
import { checkoutCart } from "../api/salesApi.js";
import { clearProductsCache } from "./productService.js";
import { readStorage, readTemporaryStorage, removeStorage, removeTemporaryStorage, writeStorage, writeTemporaryStorage } from "../utils/storage.js";

const CHECKOUT_CONFIRMATION_KEY = "lyfter_pet_store_last_order";
const UNKNOWN_STOCK_LIMIT = Number.MAX_SAFE_INTEGER;

function normalizeCartItem(item) {
  const price = Number(item.price ?? 0);
  const quantity = Number(item.quantity ?? 1);
  const stock = Number(item.stock ?? UNKNOWN_STOCK_LIMIT);

  return {
    id: item.id,
    cartItemId: item.cartItemId ?? item.cart_item_id ?? null,
    name: item.name || "Producto sin nombre",
    price: Number.isFinite(price) ? price : 0,
    imageUrl: item.imageUrl || "",
    stock: Number.isFinite(stock) ? stock : UNKNOWN_STOCK_LIMIT,
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
  };
}

function normalizeCart(items) {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeCartItem).filter((item) => item.id !== undefined && item.id !== null);
}

function buildSafePaymentMetadata(paymentMethod, paymentReference) {
  const reference = String(paymentReference || "").trim();

  return {
    method: paymentMethod,
    reference: reference ? reference.slice(-12) : null,
  };
}

function getOrderResponseData(response) {
  return response?.sale || response?.order || response?.data?.sale || response?.data?.order || response?.data || response || {};
}

function getResponseCart(response) {
  return response?.cart || response?.data?.cart || response?.data || response || {};
}

function getResponseCartItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.cart?.items)) return response.cart.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.cart?.items)) return response.data.cart.items;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.data?.items)) return response.data.data.items;
  if (Array.isArray(response?.data?.data?.cart?.items)) return response.data.data.cart.items;
  return [];
}

function normalizeBackendCartItem(item, localItems = []) {
  const productId = item.product_id ?? item.productId ?? item.product?.id ?? item.id;
  const localItem = localItems.find((cartItem) => String(cartItem.id) === String(productId));
  const price = Number(item.unit_price ?? item.price ?? localItem?.price ?? 0);
  const quantity = Number(item.quantity ?? 1);
  const stock = Number(item.stock ?? item.product?.stock ?? localItem?.stock ?? UNKNOWN_STOCK_LIMIT);

  return {
    id: productId,
    cartItemId: item.id ?? item.cart_item_id ?? item.cartItemId ?? null,
    name: item.name ?? item.product_name ?? item.product?.name ?? localItem?.name ?? "Producto sin nombre",
    price: Number.isFinite(price) ? price : 0,
    imageUrl: item.image_url ?? item.imageUrl ?? item.product?.image_url ?? localItem?.imageUrl ?? "",
    stock: Number.isFinite(stock) ? stock : UNKNOWN_STOCK_LIMIT,
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
  };
}

function normalizeBackendCart(response, localItems = getLocalCart()) {
  const items = getResponseCartItems(getResponseCart(response));
  return items.map((item) => normalizeBackendCartItem(item, localItems)).filter((item) => item.id !== undefined && item.id !== null);
}

export function getLocalCart() {
  return normalizeCart(readStorage(STORAGE_KEYS.cart, []));
}

export function saveLocalCart(items) {
  writeStorage(STORAGE_KEYS.cart, normalizeCart(items));
}

export function clearLocalCart() {
  removeStorage(STORAGE_KEYS.cart);
}

export function getCartSubtotal(items = getLocalCart()) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function getCartTotal(items = getLocalCart()) {
  return getCartSubtotal(items);
}

export function getCartItemCount(items = getLocalCart()) {
  return items.reduce((total, item) => total + item.quantity, 0);
}


export function validateCartForCheckout(items = getLocalCart()) {
  if (!items.length) {
    throw new Error("Tu carrito está vacío. Agrega productos antes de continuar.");
  }

  const invalidItem = items.find((item) => item.stock !== UNKNOWN_STOCK_LIMIT && (item.quantity > item.stock || item.stock <= 0));
  if (invalidItem) {
    throw new Error(`Revisa el stock disponible para ${invalidItem.name}.`);
  }
}

export function buildCheckoutPayload(buyerInfo, items = getLocalCart()) {
  validateCartForCheckout(items);
  const payment = buildSafePaymentMetadata(buyerInfo.paymentMethod, buyerInfo.paymentReference);

  return {
    buyer: {
      fullName: buyerInfo.fullName,
      email: buyerInfo.email,
      phone: buyerInfo.phone,
    },
    billing_address: buyerInfo.billingAddress,
    shipping_address: buyerInfo.shippingAddress,
    payment_method: payment.method,
    payment_reference: payment.reference,
    items: items.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
    })),
    subtotal: getCartSubtotal(items),
    total: getCartTotal(items),
  };
}

export async function loadCart() {
  const response = await getBackendCart();
  const items = normalizeBackendCart(response);
  saveLocalCart(items);
  return items;
}

export async function addProductToCart(product, quantity = 1) {
  const response = await addBackendCartItem({
    product_id: product.id,
    quantity,
  });
  const metadataItems = [
    ...getLocalCart(),
    {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: product.stock,
      quantity,
    },
  ];
  const items = normalizeBackendCart(response, metadataItems);
  saveLocalCart(items);
  return items;
}

export async function updateCartItemQuantity(productId, quantity) {
  const nextQuantity = Number(quantity);

  if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
    throw new Error("La cantidad debe ser un número entero mayor a cero.");
  }

  const currentItems = getLocalCart();
  const item = currentItems.find((cartItem) => String(cartItem.id) === String(productId));

  if (!item?.cartItemId) {
    throw new Error("No se pudo identificar el producto en el carrito activo.");
  }

  if (item.stock !== UNKNOWN_STOCK_LIMIT && nextQuantity > item.stock) {
    throw new Error("No hay stock suficiente para esa cantidad.");
  }

  const response = await updateBackendCartItem(item.cartItemId, { quantity: nextQuantity });
  const items = normalizeBackendCart(response, currentItems);
  saveLocalCart(items);
  return items;
}

export async function removeCartItem(productId) {
  const currentItems = getLocalCart();
  const item = currentItems.find((cartItem) => String(cartItem.id) === String(productId));

  if (!item?.cartItemId) {
    throw new Error("No se pudo identificar el producto en el carrito activo.");
  }

  const response = await removeBackendCartItem(item.cartItemId);
  const items = normalizeBackendCart(response, currentItems);
  saveLocalCart(items);
  return items;
}

export async function submitCheckout(buyerInfo, cartItems = getLocalCart()) {
  const items = normalizeCart(cartItems);
  const payload = buildCheckoutPayload(buyerInfo, items);
  const response = await checkoutCart(payload);
  clearProductsCache();
  const order = getOrderResponseData(response);

  saveCheckoutConfirmation({
    orderId: order.id || order.saleId || order.orderId || null,
    buyer: payload.buyer,
    items,
    subtotal: payload.subtotal,
    total: payload.total,
    paymentMethod: payload.payment_method,
  });

  clearLocalCart();
  return response;
}

export function saveCheckoutConfirmation(summary) {
  writeTemporaryStorage(CHECKOUT_CONFIRMATION_KEY, summary);
}

export function getCheckoutConfirmation() {
  return readTemporaryStorage(CHECKOUT_CONFIRMATION_KEY);
}

export function clearCheckoutConfirmation() {
  removeTemporaryStorage(CHECKOUT_CONFIRMATION_KEY);
}

export { CHECKOUT_CONFIRMATION_KEY };