import { ApiError } from "./apiClient";
import { commerceRequest, positiveInteger, requireToken, validationError } from "./commerceApiUtils";
import { purchaseSummary } from "../utils/purchase";

const ADDRESS_FIELDS = ["line1", "line2", "city", "province", "postal_code", "country"];

function checkoutBody(buyerData) {
  if (!buyerData || typeof buyerData !== "object" || Array.isArray(buyerData)) {
    throw validationError("body", "A JSON object is required.");
  }
  const address = buyerData.shipping_address;
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    throw validationError("shipping_address", "A shipping address object is required.");
  }
  const body = {};
  for (const field of ["full_name", "buyer_email"]) {
    if (typeof buyerData[field] !== "string") throw validationError(field, "Must be a string.");
    body[field] = buyerData[field];
  }
  body.shipping_address = {};
  for (const field of ADDRESS_FIELDS) {
    const value = address[field];
    if (field === "line2" && value == null) body.shipping_address[field] = null;
    else if (typeof value !== "string") throw validationError(`shipping_address.${field}`, "Must be a string.");
    else body.shipping_address[field] = value;
  }
  // Explicit field copying excludes ownership, totals, items, statuses, and toJSON hooks.
  return body;
}

function checkoutKey(optionalKey) {
  const key = optionalKey === undefined ? globalThis.crypto?.randomUUID?.() : optionalKey;
  if (typeof key !== "string" || key.length < 1 || key.length > 128 || /[^A-Za-z0-9._:-]/.test(key)) {
    throw validationError("Idempotency-Key", "Required: 1 to 128 ASCII letters, digits, '.', '_', ':', '-'.");
  }
  return key;
}

export async function checkoutPurchase(buyerData, token, optionalIdempotencyKey) {
  const body = checkoutBody(buyerData);
  const accessToken = requireToken(token);
  const idempotencyKey = checkoutKey(optionalIdempotencyKey);
  try {
    const data = await commerceRequest("/sales/checkout", {
      method: "POST", token: accessToken,
      headers: { "Idempotency-Key": idempotencyKey }, body,
    });
    if (!data?.sale || !data.invoice || typeof data.sale !== "object" ||
      typeof data.invoice !== "object" || Array.isArray(data.sale) || Array.isArray(data.invoice)) {
      throw new ApiError("The API returned an invalid checkout response.", 502);
    }
    return { sale: data.sale, invoice: data.invoice, idempotencyKey };
  } catch (error) {
    // Retain only the non-secret attempt key so ambiguous outcomes can be retried safely.
    error.idempotencyKey = idempotencyKey;
    throw error;
  }
}

export async function getPurchaseConfirmation(saleId, token, { signal } = {}) {
  const id = positiveInteger(saleId, "sale_id");
  const data = await commerceRequest(`/sales/${id}/confirmation`, { token: requireToken(token), signal });
  const summary = purchaseSummary(data, id);
  if (!summary) throw new ApiError("The API returned an invalid confirmation response.", 502);
  return summary;
}
