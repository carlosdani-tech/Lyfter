import { STORAGE_KEYS } from "../config.js";
import { readStorage, removeStorage, writeStorage } from "../utils/storage.js";

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return role || "customer";
}

function getRole(user) {
  if (typeof user?.role === "string") return normalizeRole(user.role);
  if (typeof user?.role?.name === "string") return normalizeRole(user.role.name);
  if (typeof user?.role_name === "string") return normalizeRole(user.role_name);
  if (typeof user?.roleName === "string") return normalizeRole(user.roleName);
  return "customer";
}

function getAuthData(authResponse) {
  return authResponse?.data?.data || authResponse?.data || authResponse || {};
}

const placeholderValues = new Set(["none", "null", "undefined"]);

function cleanNameValue(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((part) => part && !placeholderValues.has(part.toLowerCase()))
    .join(" ");
}

export function getUserDisplayName(user = getSession()?.user) {
  const safeUser = user || {};
  const joinedName = [cleanNameValue(safeUser.first_name), cleanNameValue(safeUser.last_name)]
    .filter(Boolean)
    .join(" ");

  return (
    cleanNameValue(safeUser.name) ||
    cleanNameValue(safeUser.full_name) ||
    cleanNameValue(safeUser.fullName) ||
    joinedName ||
    cleanNameValue(safeUser.email) ||
    "Usuario"
  );
}

export function getSessionToken(session = getSession()) {
  const token = (
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

  return typeof token === "string" && token.trim() ? token.trim() : null;
}

export function createSafeSession(authResponse) {
  const data = getAuthData(authResponse);
  const user = data?.user || authResponse?.user || authResponse?.data?.user || {};
  const token = getSessionToken(authResponse);
  const role = getRole(user);
  const firstName = cleanNameValue(user.first_name || user.firstName);
  const lastName = cleanNameValue(user.last_name || user.lastName);
  const name = getUserDisplayName({
    name: user.name,
    full_name: user.full_name,
    fullName: user.fullName,
    first_name: firstName,
    last_name: lastName,
    email: user.email,
  });

  return {
    token,
    role,
    user: {
      id: user.id || user.userId || null,
      name,
      first_name: firstName,
      last_name: lastName,
      email: user.email || "",
      role,
    },
  };
}

export function getSession() {
  return readStorage(STORAGE_KEYS.session);
}

export function saveSession(session) {
  const safeSession = createSafeSession(session);

  if (!safeSession.token) {
    clearSession();
    throw new Error("No se recibió una sesión válida desde el servidor.");
  }

  writeStorage(STORAGE_KEYS.session, safeSession);
}

export function clearSession() {
  removeStorage(STORAGE_KEYS.session);
}

export function isAuthenticated() {
  return Boolean(getSessionToken());
}

export function getCurrentUser() {
  const user = getSession()?.user || null;
  if (!user) return null;

  return {
    ...user,
    name: getUserDisplayName(user),
  };
}

export function isAdmin() {
  return getCurrentUser()?.role === "admin";
}
