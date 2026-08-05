export function readStorage(key, fallbackValue = null) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) return fallbackValue;

  try {
    return JSON.parse(rawValue);
  } catch {
    removeStorage(key);
    return fallbackValue;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorage(key) {
  localStorage.removeItem(key);
}

export function readTemporaryStorage(key, fallbackValue = null) {
  const rawValue = sessionStorage.getItem(key);

  if (!rawValue) return fallbackValue;

  try {
    return JSON.parse(rawValue);
  } catch {
    removeTemporaryStorage(key);
    return fallbackValue;
  }
}

export function writeTemporaryStorage(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function removeTemporaryStorage(key) {
  sessionStorage.removeItem(key);
}
