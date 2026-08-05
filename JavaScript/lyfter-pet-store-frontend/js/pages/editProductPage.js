import { createProductRecord, findProduct, updateProductRecord, validateProductData } from "../services/productService.js";
import { showError, showLoading, showMessage, clearMessage } from "../ui/alerts.js";
import { handleApiAuthError, requireAdmin } from "../utils/guards.js";

const formRoot = document.querySelector("[data-product-form-root]");
const form = document.querySelector("[data-product-form]");
const formTitle = document.querySelector("[data-form-title]");
const formError = form?.querySelector("[data-form-error]");
const submitButton = form?.querySelector("[data-submit-button]");
const statusMessage = document.querySelector("[data-product-form-status]");
let isSubmitting = false;

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function setFormVisible(isVisible) {
  if (formRoot) formRoot.hidden = !isVisible;
}

function setFieldError(fieldName, message) {
  const field = form?.elements?.[fieldName];
  const error = form?.querySelector(`[data-error-for="${fieldName}"]`);

  if (error) error.textContent = message || "";
  if (field) field.toggleAttribute("aria-invalid", Boolean(message));
}

function clearFormErrors() {
  form?.querySelectorAll("[data-error-for]").forEach((error) => {
    error.textContent = "";
  });

  form?.querySelectorAll("[aria-invalid]").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });

  if (formError) formError.textContent = "";
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "Guardando..." : "Guardar";
}

function getFormData() {
  return {
    name: form.elements.name.value,
    description: form.elements.description.value,
    category: form.elements.category.value,
    price: form.elements.price.value,
    stock: form.elements.stock.value,
    imageUrl: form.elements.imageUrl.value,
  };
}

function applyValidationErrors(errors) {
  Object.entries(errors).forEach(([fieldName, message]) => {
    setFieldError(fieldName, message);
  });
}

function validateForm() {
  const result = validateProductData(getFormData());

  if (!result.isValid) {
    applyValidationErrors(result.errors);
  }

  return result;
}

function fillForm(product) {
  form.elements.name.value = product.name || "";
  form.elements.description.value = product.description || "";
  form.elements.category.value = product.category || "";
  form.elements.price.value = product.price || "";
  form.elements.stock.value = product.stock ?? "";
  form.elements.imageUrl.value = product.imageUrl || "";
}

async function initializeForm() {
  const productId = getProductIdFromUrl();

  if (!requireAdmin()) return;

  setFormVisible(true);

  if (!productId) {
    if (formTitle) formTitle.textContent = "Crear producto";
    return;
  }

  if (formTitle) formTitle.textContent = "Editar producto";
  showLoading(statusMessage, "Cargando producto...");

  try {
    const product = await findProduct(productId);

    if (!product?.id) {
      showError(statusMessage, "El producto solicitado no existe.");
      form?.querySelectorAll("input, textarea, button").forEach((field) => {
        field.disabled = true;
      });
      return;
    }

    fillForm(product);
    clearMessage(statusMessage);
  } catch (error) {
    if (handleApiAuthError(error)) return;
    showError(statusMessage, error.message || "No se pudo cargar el producto.");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  clearFormErrors();
  clearMessage(statusMessage);

  const productId = getProductIdFromUrl();
  const validation = validateForm();
  if (!validation.isValid) return;

  setSubmitting(true);
  isSubmitting = true;

  try {
    if (productId) {
      await updateProductRecord(productId, getFormData());
      showMessage(statusMessage, "Producto actualizado correctamente.", "success");
    } else {
      const product = await createProductRecord(getFormData());
      showMessage(statusMessage, "Producto creado correctamente.", "success");

      if (product?.id) {
        window.history.replaceState(null, "", `./edit-product.html?id=${encodeURIComponent(product.id)}`);
        if (formTitle) formTitle.textContent = "Editar producto";
      }
    }
  } catch (error) {
    if (handleApiAuthError(error)) return;

    if (error.details) {
      applyValidationErrors(error.details);
    }

    showError(statusMessage, error.message || "No se pudo guardar el producto.");
    if (formError) formError.textContent = error.message || "No se pudo guardar el producto.";
  } finally {
    isSubmitting = false;
    setSubmitting(false);
  }
});

initializeForm();


