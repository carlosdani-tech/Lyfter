import { ApiError, request } from "./apiClient";
import { positiveInteger } from "./commerceApiUtils";

function verifiedProduct(product, expectedId = null) {
  const optionalText = (value) => value === null || typeof value === "string";
  if (!product || !Number.isInteger(product.id) || product.id < 1 || product.id > 2147483647 ||
    (expectedId !== null && product.id !== expectedId) || typeof product.name !== "string" ||
    typeof product.price !== "string" || !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(product.price) || /\s/.test(product.price) ||
    !Number.isInteger(product.stock) || product.stock < 0 || product.stock > 2147483647 ||
    typeof product.is_active !== "boolean" || !optionalText(product.description) ||
    !optionalText(product.category) || !optionalText(product.image_url)) {
    throw new ApiError("The API returned an invalid product response.", 502);
  }
  return product;
}

export async function getProducts() {
  const data = await request("/products");
  if (!Array.isArray(data?.products)) throw new ApiError("The API returned an invalid product list.", 502);
  return data.products.map((product) => verifiedProduct(product));
}

export async function getProduct(productId, options = {}) {
  const id = positiveInteger(productId, "product_id");
  const data = await request(`/products/${id}`, options);
  return verifiedProduct(data?.product, id);
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
  const id = positiveInteger(productId, "product_id");
  const data = await request(`/products/${id}`, {
    method: "PUT",
    body: product,
    token,
  });
  return data.product;
}

export async function deleteProduct(productId, token) {
  const id = positiveInteger(productId, "product_id");
  const data = await request(`/products/${id}`, {
    method: "DELETE",
    token,
  });
  return data.product;
}
