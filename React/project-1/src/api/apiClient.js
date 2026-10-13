export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponse(response) {
  if (response.status === 204) {
    return {};
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { error: { message: text } } : {};
}

export async function request(
  path,
  { method = "GET", body, token, headers = {}, ...fetchOptions } = {},
) {
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError("Unable to connect to the API.", 0, {
      cause: error.message,
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || `API request failed with status ${response.status}.`,
      response.status,
      payload?.error?.details ?? null,
    );
  }

  return Object.hasOwn(payload, "data") ? payload.data : payload;
}