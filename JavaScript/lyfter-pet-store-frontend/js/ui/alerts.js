export function showMessage(target, message, type = "info") {
  if (!target) return;

  target.textContent = message;
  target.dataset.state = type;
  target.hidden = !message;
}

export function showError(target, message) {
  showMessage(target, message, "error");
}

export function showLoading(target, message = "Cargando...") {
  showMessage(target, message, "loading");
}

export function showEmpty(target, message) {
  showMessage(target, message, "empty");
}

export function clearMessage(target) {
  if (!target) return;

  target.textContent = "";
  target.removeAttribute("data-state");
  target.hidden = true;
}

export function clearError(target) {
  clearMessage(target);
}
