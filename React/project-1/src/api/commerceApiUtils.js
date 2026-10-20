import { ApiError, request } from "./apiClient";

const SAFE_MESSAGES = new Set([
  "Invalid request payload.", "Client permission is required.", "Product not found.",
  "Cart item not found.", "You cannot access this cart item.",
  "Quantity cannot be greater than available stock.", "Active cart has no items.",
  "Insufficient stock for one or more products.", "Purchase total exceeds the supported limit.",
  "Idempotency key was already used with different details.",
]);
const TEXT_LIMITS = {
  full_name: 200, buyer_email: 254,
  "shipping_address.line1": 200, "shipping_address.line2": 200,
  "shipping_address.city": 100, "shipping_address.province": 100,
  "shipping_address.postal_code": 20, "shipping_address.country": 2,
};
const VALIDATION_MESSAGES = {
  body: ["A JSON object is required.", "Unsupported fields."],
  shipping_address: ["A shipping address object is required.", "Unsupported address fields."],
  product_id: ["Product id is required.", "Product id must be an integer."],
  quantity: ["Quantity is required.", "Quantity must be an integer.", "Quantity must be greater than 0."],
  "Idempotency-Key": ["Required: 1 to 128 ASCII letters, digits, '.', '_', ':', '-'."],
};
for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
  VALIDATION_MESSAGES[field] = ["Must be a string.", `Must contain 1 to ${limit} characters without control characters.`];
}
VALIDATION_MESSAGES.buyer_email.push("Must be a valid email address.");
VALIDATION_MESSAGES["shipping_address.country"].push("Must be a two-letter country code.");

export function validationError(field, message) {
  return new ApiError("Invalid request payload.", 400, { [field]: message });
}

export function positiveInteger(value, field) {
  const parsed = typeof value === "string" && /^[1-9]\d*$/.test(value) && String(Number(value)) === value
    ? Number(value) : value;
  // Backend IDs, stock, and quantities use PostgreSQL INTEGER columns.
  if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 2147483647) {
    throw validationError(field, "Must be a positive integer no greater than 2147483647.");
  }
  return parsed;
}

export function requireToken(token) {
  if (typeof token !== "string" || !token || /\s/.test(token) ||
    Array.from(token).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) > 126)) {
    throw new ApiError("Authentication is required.", 401);
  }
  return token;
}

function safeDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const result = {};
  for (const [field, messages] of Object.entries(VALIDATION_MESSAGES)) {
    if (Object.hasOwn(details, field)) {
      result[field] = messages.includes(details[field]) ? details[field] : "Invalid value.";
    }
  }
  return Object.keys(result).length ? result : null;
}

export async function commerceRequest(path, options) {
  try {
    return await request(path, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    const status = error instanceof ApiError ? error.status : 0;
    let message = "The request could not be completed.";
    if (SAFE_MESSAGES.has(error.message)) message = error.message;
    else if (status === 0) message = "Unable to connect to the API.";
    else if (status === 401 || status === 422) message = "Authentication is required or has expired.";
    else if (status === 403) message = "This action is not permitted.";
    else if (status === 404) message = "The requested resource was not found.";
    else if (status >= 500) message = "The service is temporarily unavailable.";
    throw new ApiError(message, status, status === 400 ? safeDetails(error.details) : null);
  }
}
