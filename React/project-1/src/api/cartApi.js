import { ApiError } from "./apiClient";
import { commerceRequest, positiveInteger, requireToken } from "./commerceApiUtils";

async function requestCart(path, options) {
  const data = await commerceRequest(path, options);
  if (!data?.cart || typeof data.cart !== "object" || Array.isArray(data.cart) || !Array.isArray(data.cart.items)) {
    throw new ApiError("The API returned an invalid cart response.", 502);
  }
  return data.cart;
}

export async function getCart(token) {
  return requestCart("/cart", { token: requireToken(token) });
}

export async function addCartItem(productId, quantity, token) {
  const product_id = positiveInteger(productId, "product_id");
  const itemQuantity = positiveInteger(quantity, "quantity");
  return requestCart("/cart/items", {
    method: "POST", token: requireToken(token),
    body: { product_id, quantity: itemQuantity },
  });
}

export async function updateCartItem(itemId, quantity, token) {
  const id = positiveInteger(itemId, "item_id");
  const itemQuantity = positiveInteger(quantity, "quantity");
  return requestCart(`/cart/items/${id}`, {
    method: "PUT", token: requireToken(token), body: { quantity: itemQuantity },
  });
}

export async function removeCartItem(itemId, token) {
  const id = positiveInteger(itemId, "item_id");
  return requestCart(`/cart/items/${id}`, { method: "DELETE", token: requireToken(token) });
}
