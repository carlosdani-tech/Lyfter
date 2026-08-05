import { register } from "../services/authService.js";
import { redirectIfAuthenticated } from "../utils/guards.js";
import { hasAtLeastTwoNameParts, hasMinimumLength, hasNoPlaceholderNameParts, hasOnlyValidNameCharacters, isRequired, isValidEmail, normalizeWhitespace, valuesMatch } from "../utils/validators.js";

const form = document.querySelector("[data-register-form]");
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
  submitButton.textContent = isSubmitting ? "Registrando..." : "Registrarme";
}

function validateRegisterForm(formData) {
  let isValid = true;
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const passwordConfirmation = formData.get("passwordConfirmation");

  if (!isRequired(name)) {
    setFieldError("name", "Ingresa tu nombre completo.");
    isValid = false;
  } else if (!hasMinimumLength(name, 2)) {
    setFieldError("name", "El nombre debe tener al menos 2 caracteres.");
    isValid = false;
  } else if (!hasOnlyValidNameCharacters(name)) {
    setFieldError("name", "El nombre solo puede contener letras, espacios, guiones o apóstrofes.");
    isValid = false;
  } else if (!hasAtLeastTwoNameParts(name)) {
    setFieldError("name", "El nombre debe incluir al menos nombre y apellido.");
    isValid = false;
  } else if (!hasNoPlaceholderNameParts(name)) {
    setFieldError("name", "Ingresa un apellido válido.");
    isValid = false;
  }

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

  if (!isRequired(passwordConfirmation)) {
    setFieldError("passwordConfirmation", "Confirma la contraseña.");
    isValid = false;
  } else if (!valuesMatch(password, passwordConfirmation)) {
    setFieldError("passwordConfirmation", "Las contraseñas no coinciden.");
    isValid = false;
  }

  return isValid;
}

function getRegistrationPayload(formData) {
  return {
    name: normalizeWhitespace(formData.get("name")),
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  };
}

if (!redirectIfAuthenticated("./products.html")) {
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors();

    const formData = new FormData(form);
    if (!validateRegisterForm(formData)) return;

    setSubmitting(true);

    try {
      await register(getRegistrationPayload(formData));
      window.location.href = "./login.html";
    } catch (error) {
      if (formError) {
        formError.textContent = error.message || "No se pudo crear la cuenta.";
      }
    } finally {
      setSubmitting(false);
    }
  });
}
