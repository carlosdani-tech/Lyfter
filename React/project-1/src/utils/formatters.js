const colonesFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PRICE_FALLBACK = "Precio no disponible";

export function formatColones(value) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return PRICE_FALLBACK;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? colonesFormatter.format(numericValue)
    : PRICE_FALLBACK;
}

// Format server decimal strings without converting money through floating point.
export function formatDecimalColones(value) {
  if (typeof value !== "string" || /\s/.test(value) || !/^(0|[1-9]\d*)\.\d{2}$/.test(value)) {
    return PRICE_FALLBACK;
  }
  const [whole, fraction] = value.split(".");
  return colonesFormatter.formatToParts(BigInt(whole))
    .map((part) => part.type === "fraction" ? fraction : part.value).join("");
}
