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
    try {
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw error;
      return null;
    }
  }

  return null;
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
    if (error.name === "AbortError") throw error;
    throw new ApiError("Unable to connect to the API.", 0);
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      response.status >= 500 ? "The service is temporarily unavailable."
        : payload?.error?.message || `API request failed with status ${response.status}.`,
      response.status,
      response.status < 500 ? payload?.error?.details ?? null : null,
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("The API returned an invalid response.", 502);
  }

  return Object.hasOwn(payload, "data") ? payload.data : payload;
}
