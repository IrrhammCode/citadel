/** Internal write helper for store-sync (avoids circular imports) */
export function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}
