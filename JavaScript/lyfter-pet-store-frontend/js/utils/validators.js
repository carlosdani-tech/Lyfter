const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+]?[(]?[0-9\s().-]{8,20}$/;
const paymentReferencePattern = /^[A-Za-z0-9-]{1,12}$/;
const namePartPattern = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:['-]?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const placeholderValues = new Set(["none", "null", "undefined"]);

export function normalizeWhitespace(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function isRequired(value) {
  return normalizeWhitespace(value).length > 0;
}

export function isValidEmail(value) {
  return emailPattern.test(String(value || "").trim());
}

export function isValidPhone(value) {
  return phonePattern.test(String(value || "").trim());
}

export function isValidPaymentReference(value) {
  const normalizedValue = String(value || "").trim();
  return !normalizedValue || paymentReferencePattern.test(normalizedValue);
}

export function hasMinimumLength(value, minimumLength) {
  return normalizeWhitespace(value).length >= minimumLength;
}

export function valuesMatch(value, confirmationValue) {
  return String(value || "") === String(confirmationValue || "");
}

export function hasOnlyValidNameCharacters(value) {
  const parts = normalizeWhitespace(value).split(" ").filter(Boolean);
  return parts.length > 0 && parts.every((part) => namePartPattern.test(part));
}

export function hasAtLeastTwoNameParts(value) {
  return normalizeWhitespace(value).split(" ").filter(Boolean).length >= 2;
}

export function hasNoPlaceholderNameParts(value) {
  return normalizeWhitespace(value)
    .split(" ")
    .filter(Boolean)
    .every((part) => !placeholderValues.has(part.toLowerCase()));
}

export function isValidFullName(value) {
  return hasOnlyValidNameCharacters(value) && hasAtLeastTwoNameParts(value) && hasNoPlaceholderNameParts(value);
}

export function isPositiveNumber(value) {
  return Number(value) > 0;
}

export function isNonNegativeInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0;
}

export function isValidUrl(value) {
  if (!value) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}