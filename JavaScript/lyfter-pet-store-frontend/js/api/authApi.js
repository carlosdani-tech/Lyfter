import { API_ENDPOINTS } from "../config.js";
import { request } from "./apiClient.js";

export function registerUser(payload) {
  return request(API_ENDPOINTS.auth.register, {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function loginUser(credentials) {
  return request(API_ENDPOINTS.auth.login, {
    method: "POST",
    body: credentials,
    auth: false,
  });
}

export function getCurrentUser() {
  return request(API_ENDPOINTS.auth.me);
}
