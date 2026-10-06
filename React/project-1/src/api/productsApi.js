import { request } from "./apiClient";

export async function getProducts() {
  const data = await request("/products");
  return data.products;
}

export async function getProduct(productId) {
  const data = await request(`/products/${encodeURIComponent(productId)}`);
  return data.product;
}

export async function createProduct(product, token) {
  const data = await request("/products", {
    method: "POST",
    body: product,
    token,
  });
  return data.product;
}

export async function updateProduct(productId, product, token) {
  const data = await request(`/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: product,
    token,
  });
  return data.product;
}

export async function deleteProduct(productId, token) {
  const data = await request(`/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    token,
  });
  return data.product;
}