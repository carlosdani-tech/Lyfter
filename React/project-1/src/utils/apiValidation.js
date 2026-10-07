const PRODUCT_FIELD_LABELS = {
  name: "Nombre",
  description: "Descripción",
  category: "Categoría",
  price: "Precio",
  stock: "Stock",
  image_url: "URL de la imagen",
};

const VALIDATION_FALLBACK =
  "Revisa los datos del producto e intenta nuevamente.";

function collectDetailText(detail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map(collectDetailText).filter(Boolean).join(" ");
  }

  if (detail && typeof detail === "object") {
    return Object.values(detail)
      .map(collectDetailText)
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function getFieldMessage(field, detail) {
  const detailText = collectDetailText(detail).toLowerCase();

  switch (field) {
    case "name":
      return detailText.includes("at most")
        ? "debe tener como máximo 150 caracteres."
        : "es obligatorio.";
    case "description":
      return "debe tener como máximo 10000 caracteres.";
    case "category":
      return "debe tener como máximo 100 caracteres.";
    case "price":
      if (detailText.includes("required")) {
        return "es obligatorio.";
      }
      return detailText.includes("greater than or equal")
        ? "debe ser mayor o igual a 0."
        : "debe ser un número válido.";
    case "stock":
      if (detailText.includes("required")) {
        return "es obligatorio.";
      }
      return detailText.includes("greater than or equal")
        ? "debe ser mayor o igual a 0."
        : "debe ser un número entero válido.";
    case "image_url":
      return "debe tener como máximo 500 caracteres.";
    default:
      return "contiene un valor inválido.";
  }
}

function getFieldLabel(field) {
  if (PRODUCT_FIELD_LABELS[field]) {
    return PRODUCT_FIELD_LABELS[field];
  }

  const readableField = field.replaceAll("_", " ").trim();
  return readableField
    ? readableField.charAt(0).toUpperCase() + readableField.slice(1)
    : "Campo";
}

export function formatProductValidationError(error) {
  if (error?.status !== 400) {
    return null;
  }

  const details = error.details;

  if (!details || Array.isArray(details) || typeof details !== "object") {
    return VALIDATION_FALLBACK;
  }

  const messages = Object.entries(details).map(
    ([field, detail]) =>
      `${getFieldLabel(field)}: ${getFieldMessage(field, detail)}`,
  );

  return messages.length > 0
    ? `Revisa los datos del producto: ${messages.join(" ")}`
    : VALIDATION_FALLBACK;
}
