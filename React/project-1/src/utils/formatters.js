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
