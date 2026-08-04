import { API_ENDPOINTS } from "../config.js";
import { request } from "./apiClient.js";

export function getCart() {
  return request(API_ENDPOINTS.cart.base);
}

export function addCartItem(payload) {
  return request(API_ENDPOINTS.cart.items, {
    method: "POST",
    body: payload,
  });
}

export function updateCartItem(itemId, payload) {
  return request(API_ENDPOINTS.cart.item(itemId), {
    method: "PUT",
    body: payload,
  });
}

export function removeCartItem(itemId) {
  return request(API_ENDPOINTS.cart.item(itemId), {
    method: "DELETE",
  });
}

export function clearCart() {
  throw new Error("El backend no expone una ruta para vaciar el carrito completo.");
}