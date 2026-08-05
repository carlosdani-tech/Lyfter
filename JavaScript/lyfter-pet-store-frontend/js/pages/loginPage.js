import { login } from "../services/authService.js";
import { getRedirectParam, redirectIfAuthenticated } from "../utils/guards.js";
import { hasMinimumLength, isRequired, isValidEmail } from "../utils/validators.js";

const form = document.querySelector("[data-login-form]");
const submitButton = form?.querySelector("[data-submit-button]");
const formError = form?.querySelector("[data-form-error]");

function setFieldError(fieldName, message) {
  const field = form?.elements?.[fieldName];
  const error = form?.querySelector(`[data-error-for="${fieldName}"]`);

  if (error) {
    error.textContent = message || "";
  }

  if (field) {
    field.toggleAttribute("aria-invalid", Boolean(message));
  }
}

function clearFormErrors() {
  form?.querySelectorAll("[data-error-for]").forEach((error) => {
    error.textContent = "";
  });

  form?.querySelectorAll("[aria-invalid]").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });

  if (formError) {
    formError.textContent = "";
  }
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "Iniciando sesión..." : "Iniciar sesión";
}

function validateLoginForm(formData) {
  let isValid = true;
  const email = formData.get("email");
  const password = formData.get("password");

  if (!isRequired(email)) {
    setFieldError("email", "El correo electrónico es requerido.");
    isValid = false;
  } else if (!isValidEmail(email)) {
    setFieldError("email", "El correo electrónico no tiene un formato válido.");
    isValid = false;
  }

  if (!isRequired(password)) {
    setFieldError("password", "La contraseña es requerida.");
    isValid = false;
  } else if (!hasMinimumLength(password, 8)) {
    setFieldError("password", "La contraseña debe tener al menos 8 caracteres.");
    isValid = false;
  }

  return isValid;
}

function getCredentials(formData) {
  return {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  };
}

if (!redirectIfAuthenticated("./products.html")) {
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors();

    const formData = new FormData(form);
    if (!validateLoginForm(formData)) return;

    setSubmitting(true);

    try {
      await login(getCredentials(formData));
      window.location.href = getRedirectParam();
    } catch (error) {
      if (formError) {
        formError.textContent = error.message || "No se pudo iniciar sesión.";
      }
    } finally {
      setSubmitting(false);
    }
  });
}
