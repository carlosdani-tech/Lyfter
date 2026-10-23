export function cartItemAvailability(item, productsById) {
  if (productsById === null) return { status: "unknown", stock: null };
  const product = productsById[item.product_id];
  if (!product || product.is_active === false) return { status: "unavailable", stock: 0 };
  if (product.is_active !== true || !Number.isSafeInteger(product.stock) || product.stock < 0 || product.stock > 2147483647) {
    return { status: "unknown", stock: null };
  }
  if (product.stock === 0) return { status: "out-of-stock", stock: 0 };
  return { status: item.quantity > product.stock ? "quantity-conflict" : "available", stock: product.stock };
}

export function canCheckoutCart(state) {
  return Boolean(state.cart && state.items.length && !state.loading && !state.isStale &&
    !state.productError && state.productsById !== null &&
    state.items.every((item) => cartItemAvailability(item, state.productsById).status === "available"));
}
