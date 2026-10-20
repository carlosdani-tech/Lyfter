import { request } from "./apiClient";

export function login({ email, password }, { signal } = {}) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
    signal,
  });
}
