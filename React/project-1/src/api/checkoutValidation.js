function invalid(field, message) {
  const error = new Error("Invalid request payload.");
  error.status = 400;
  error.details = { [field]: message };
  return error;
}

export function checkoutSnapshot(items, total, fail = invalid) {
  if (!Array.isArray(items) || !items.length || items.length > 1000) {
    throw fail("items", "Must contain 1 to 1000 items.");
  }
  const seen = new Set();
  const snapshot = Array.from(items, (item) => {
    for (const field of ["product_id", "quantity"]) {
      if (!Number.isSafeInteger(item?.[field]) || item[field] <= 0 || item[field] > 2147483647) {
        throw fail("items", "Product IDs and quantities must be positive integers no greater than 2147483647.");
      }
    }
    if (seen.has(item.product_id)) throw fail("items", "Duplicate products are not allowed.");
    seen.add(item.product_id);
    return Object.freeze({ product_id: item.product_id, quantity: item.quantity });
  });
  if (typeof total !== "string" || total.length > 11 || /\s/.test(total) || !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(total)) {
    throw fail("total_amount", "Must be a canonical two-decimal string between 0.00 and 99999999.99.");
  }
  return { items: Object.freeze(snapshot), total_amount: total };
}

// One request schema for the API boundary and the provider-owned attempt.
export function checkoutBody(data, fail = invalid) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw fail("body", "A JSON object is required.");
  const text = (value, field, limit) => {
    if (typeof value !== "string") throw fail(field, "Must be a string.");
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > limit || Array.from(trimmed).some((character) => character.charCodeAt(0) < 32)) {
      throw fail(field, `Must contain 1 to ${limit} characters without control characters.`);
    }
    return trimmed;
  };
  const full_name = text(data.full_name, "full_name", 200);
  const buyer_email = text(data.buyer_email, "buyer_email", 254);
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(buyer_email)) throw fail("buyer_email", "Must be a valid email address.");
  if (typeof data.shipping_address !== "string") throw fail("shipping_address", "Must be a string.");
  const shipping_address = data.shipping_address.replace(/\r\n?/g, "\n").trim();
  if (!shipping_address || Array.from(shipping_address).length > 500 ||
    Array.from(shipping_address).some((character) => character.charCodeAt(0) < 32 && character !== "\n")) {
    throw fail("shipping_address", "Must contain 1 to 500 characters without control characters except line breaks.");
  }
  return Object.freeze({ full_name, buyer_email, shipping_address,
    ...checkoutSnapshot(data.items, data.total_amount, fail) });
}
