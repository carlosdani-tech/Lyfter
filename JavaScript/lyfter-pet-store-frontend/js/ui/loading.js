export function setLoading(element, isLoading, loadingText = "Cargando...") {
  if (!element) return;
  element.toggleAttribute("aria-busy", isLoading);
  if (isLoading) element.dataset.previousText = element.textContent;
  element.textContent = isLoading ? loadingText : element.dataset.previousText || element.textContent;
}
