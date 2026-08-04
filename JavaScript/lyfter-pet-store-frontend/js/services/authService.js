import { getCurrentUser as fetchCurrentUser, loginUser, registerUser } from "../api/authApi.js";
import { normalizeWhitespace } from "../utils/validators.js";
import { clearSession, getCurrentUser, getSessionToken, saveSession } from "./sessionService.js";

function splitFullName(name) {
  const parts = normalizeWhitespace(name).split(" ").filter(Boolean);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");

  return {
    firstName,
    lastName,
  };
}

function buildRegistrationPayload(payload) {
  const name = normalizeWhitespace(payload.name);
  const { firstName, lastName } = splitFullName(name);

  if (!firstName || !lastName) {
    throw new Error("El nombre debe incluir al menos nombre y apellido.");
  }

  return {
    email: String(payload.email || "").trim(),
    password: String(payload.password || ""),
    first_name: firstName,
    last_name: lastName,
  };
}

export async function login(credentials) {
  const session = await loginUser({
    email: credentials.email,
    password: credentials.password,
  });

  saveSession(session);
  return getCurrentUser();
}

export async function register(payload) {
  const response = await registerUser(buildRegistrationPayload(payload));

  if (getSessionToken(response)) {
    saveSession(response);
  }

  return response;
}

export function logout() {
  clearSession();
}

export function loadCurrentUser() {
  return fetchCurrentUser();
}
