import { API_ENDPOINTS } from "../config.js";
import { request } from "./apiClient.js";

export function checkoutCart(payload) {
  return request(API_ENDPOINTS.sales.checkout, {
    method: "POST",
    body: payload,
  });
}

export function getSales(filters = {}) {
  return request(API_ENDPOINTS.sales.base, {
    query: filters,
  });
}

export function getSaleById(saleId) {
  return request(API_ENDPOINTS.sales.byId(saleId));
}

export function createSale(payload) {
  return checkoutCart(payload);
}
