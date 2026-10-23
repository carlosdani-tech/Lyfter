import { ApiError } from "./apiClient";
import { commerceRequest, positiveInteger, requireToken, validationError } from "./commerceApiUtils";
import { checkoutBody } from "./checkoutValidation.js";
import { purchaseSummary } from "../utils/purchase";

function checkoutKey(optionalKey) {
  const key = optionalKey === undefined ? globalThis.crypto?.randomUUID?.() : optionalKey;
  if (typeof key !== "string" || key.length < 1 || key.length > 128 || /[^A-Za-z0-9._:-]/.test(key)) {
    throw validationError("Idempotency-Key", "Required: 1 to 128 ASCII letters, digits, '.', '_', ':', '-'.");
  }
  return key;
}

export async function checkoutPurchase(checkoutData, token, optionalIdempotencyKey, { signal } = {}) {
  const body = checkoutBody(checkoutData, validationError);
  const accessToken = requireToken(token);
  const idempotencyKey = checkoutKey(optionalIdempotencyKey);
  try {
    const data = await commerceRequest("/sales/checkout", {
      method: "POST", token: accessToken, signal,
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
