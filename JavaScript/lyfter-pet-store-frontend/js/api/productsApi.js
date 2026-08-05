import { API_ENDPOINTS } from "../config.js";
import { request } from "./apiClient.js";

export function getProducts(filters = {}) {
  return request(API_ENDPOINTS.products.base, {
    query: filters,
  });
}

export function getProductById(productId) {
  return request(API_ENDPOINTS.products.byId(productId));
}

export function createProduct(payload) {
  return request(API_ENDPOINTS.products.base, {
    method: "POST",
    body: payload,
  });
}

export function updateProduct(productId, payload) {
  return request(API_ENDPOINTS.products.byId(productId), {
    method: "PUT",
    body: payload,
  });
}

export function patchProduct(productId, payload) {
  return request(API_ENDPOINTS.products.byId(productId), {
    method: "PATCH",
    body: payload,
  });
}

export function deleteProduct(productId) {
  return request(API_ENDPOINTS.products.byId(productId), {
    method: "DELETE",
  });
}

export function deactivateProduct(productId) {
  return patchProduct(productId, { active: false });
}
