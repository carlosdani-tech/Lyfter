import { clearSession, isAdmin, isAuthenticated } from "../services/sessionService.js";

export function getRedirectParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "./index.html";
}

export function requireAuth() {
  if (!isAuthenticated()) {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    window.location.href = `./login.html?redirect=${encodeURIComponent(currentPath)}`;
    return false;
  }

  return true;
}

export function requireAdmin() {
  if (!requireAuth()) return false;

  if (!isAdmin()) {
    window.location.href = "./restricted-access.html";
    return false;
  }

  return true;
}

export function handleApiAuthError(error, options = {}) {
  const {
    unauthorizedMessageTarget = null,
    forbiddenMessageTarget = null,
    redirectForbidden = true,
  } = options;

  if (error?.isUnauthorized) {
    clearSession();

    if (unauthorizedMessageTarget) {
      unauthorizedMessageTarget.textContent = "Tu sesión expiró. Inicia sesión nuevamente.";
      unauthorizedMessageTarget.dataset.state = "error";
      unauthorizedMessageTarget.hidden = false;
      return true;
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    window.location.href = `./login.html?redirect=${encodeURIComponent(currentPath)}`;
    return true;
  }

  if (error?.isForbidden) {
    if (forbiddenMessageTarget) {
      forbiddenMessageTarget.textContent = "No tienes permisos para acceder a esta sección.";
      forbiddenMessageTarget.dataset.state = "error";
      forbiddenMessageTarget.hidden = false;
    }

    if (redirectForbidden) {
      window.location.href = "./restricted-access.html";
    }

    return true;
  }

  return false;
}

export function redirectIfAuthenticated(target = "./index.html") {
  if (isAuthenticated()) {
    window.location.href = target;
    return true;
  }

  return false;
}