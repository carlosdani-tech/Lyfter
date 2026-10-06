import { request } from "./apiClient";

export function login({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getCurrentUser(token) {
  return request("/auth/me", { token });
}