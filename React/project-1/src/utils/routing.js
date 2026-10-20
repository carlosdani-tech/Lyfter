export function parseRouteId(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value) && String(Number(value)) === value &&
    Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647 ? Number(value) : null;
}

// Only known application paths can be restored after login.
export function safeDestination(value) {
  if (typeof value !== "string" || /[\\\s]/.test(value) ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)) return null;
  const path = value.split(/[?#]/, 1)[0];
  if (["/", "/productos", "/contacto", "/admin", "/carrito", "/checkout"].includes(path)) return value;
  const resource = /^\/(?:productos|admin\/editar|compra)\/([^/]+)$/.exec(path);
  return resource && parseRouteId(resource[1]) !== null ? value : null;
}
