import { API_BASE_URL, STORAGE_KEYS } from "../config.js";
import { readStorage } from "../utils/storage.js";

const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status || 0;
    this.code = options.code || "API_ERROR";
    this.details = options.details || null;
    this.data = options.data || null;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }
}

function buildUrl(endpoint, query = null) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${baseUrl}${normalizedEndpoint}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

function getStoredToken() {
  const session = readStorage(STORAGE_KEYS.session);
  return (
    session?.token ||
    session?.access_token ||
    session?.accessToken ||
    session?.data?.token ||
    session?.data?.access_token ||
    session?.data?.accessToken ||
    session?.data?.data?.token ||
    session?.data?.data?.access_token ||
    session?.data?.data?.accessToken ||
    null
  );
}

function createHeaders(customHeaders = {}, includeAuth = true, hasJsonBody = false) {
  const headers = new Headers(customHeaders);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuth) {
    const token = getStoredToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      throw new ApiError("El servidor devolvió una respuesta inválida.", {
        status: response.status,
        code: "INVALID_JSON_RESPONSE",
      });
    }
  }

  const text = await response.text();
  return text || null;
}

function getBackendMessage(data) {
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  return "";
}

function getErrorDetails(data) {
  return data?.error?.details || data?.details || data?.errors || null;
}

function formatDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";

  const messages = Object.entries(details)
    .map(([field, message]) => `${field}: ${Array.isArray(message) ? message.join(", ") : message}`)
    .join(" ");

  return messages ? ` ${messages}` : "";
}

function getErrorMessage(status, data) {
  const backendMessage = getBackendMessage(data);
  const details = getErrorDetails(data);

  if (backendMessage === "Active cart has no items.") {
    return "No se pudo procesar la compra porque el carrito activo no tiene productos. Intenta volver a agregar los productos al carrito.";
  }

  if (status === 400 || status === 422) {
    return `${backendMessage || "Revisa los datos enviados e intenta nuevamente."}${formatDetails(details)}`;
  }

  const messages = {
    401: "Debes iniciar sesión o tu sesión expiró.",
    403: "No tienes permisos para acceder a esta sección.",
    404: "Recurso no encontrado.",
    409: "El correo electrónico ingresado ya está registrado. Utiliza uno diferente o inicia sesión con tu cuenta existente.",
    500: "Error interno del servidor.",
  };

  return messages[status] || backendMessage || "No se pudo completar la solicitud.";
}

function getNetworkErrorMessage() {
  return "No se pudo conectar con el servidor.";
}

function getTimeoutErrorMessage() {
  return "El servidor tardó demasiado en responder.";
}

export async function request(endpoint, options = {}) {
  const {
    query,
    body,
    headers,
    auth = true,
    ...fetchOptions
  } = options;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const hasJsonBody = body !== undefined && !(body instanceof FormData);
  const requestOptions = {
    ...fetchOptions,
    headers: createHeaders(headers, auth, hasJsonBody),
    signal: fetchOptions.signal || controller.signal,
  };

  if (body !== undefined) {
    requestOptions.body = hasJsonBody ? JSON.stringify(body) : body;
  }

  try {
    const response = await fetch(buildUrl(endpoint, query), requestOptions);
    const data = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(getErrorMessage(response.status, data), {
        status: response.status,
        code: data?.code || data?.error?.code || "HTTP_ERROR",
        details: getErrorDetails(data),
        data,
      });
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error?.name === "AbortError") {
      throw new ApiError(getTimeoutErrorMessage(), {
        code: "REQUEST_TIMEOUT",
        details: `Timeout after ${REQUEST_TIMEOUT_MS}ms`,
      });
    }

    throw new ApiError(getNetworkErrorMessage(), {
      code: "NETWORK_ERROR",
      details: error?.message || null,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
