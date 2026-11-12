const PREFIX = "akshaya:";

export function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(key)) ?? window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(key), JSON.stringify(value));
}

export function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(key));
}

export function migrateLegacyStorage<T>(key: string, fallback: T): T {
  const current = readStorage<T>(key, fallback);
  if (typeof window === "undefined") return current;
  const namespaced = window.localStorage.getItem(storageKey(key));
  if (!namespaced) {
    try {
      const legacy = window.localStorage.getItem(key);
      if (legacy !== null) window.localStorage.setItem(storageKey(key), legacy);
    } catch {}
  }
  return current;
}
