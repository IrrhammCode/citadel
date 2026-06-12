/** Merge arrays by a unique key, newest timestamp wins on conflict. */

export function mergeByKey<T extends Record<string, unknown>>(
  incoming: T[] | undefined,
  existing: T[],
  key: keyof T,
  cap?: number,
): T[] {
  if (!incoming?.length) return existing;

  const map = new Map<string, T>();
  for (const item of existing) map.set(String(item[key]), item);
  for (const item of incoming) {
    const k = String(item[key]);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, item);
      continue;
    }
    const prevTs = (prev as { timestamp?: number }).timestamp ?? 0;
    const nextTs = (item as { timestamp?: number }).timestamp ?? 0;
    map.set(k, nextTs >= prevTs ? item : prev);
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = (a as { timestamp?: number }).timestamp ?? 0;
    const tb = (b as { timestamp?: number }).timestamp ?? 0;
    return tb - ta;
  });

  return cap ? merged.slice(0, cap) : merged;
}

export function mergeRecords<T extends Record<string, unknown>>(
  current: Record<string, T>,
  partial?: Record<string, T>,
): Record<string, T> {
  if (!partial) return current;
  return { ...current, ...partial };
}

export function mergeDailySpend(
  current: Record<string, { date: string; amount: string }>,
  partial?: Record<string, { date: string; amount: string }>,
): Record<string, { date: string; amount: string }> {
  if (!partial) return current;
  const merged = { ...current };
  for (const [systemId, entry] of Object.entries(partial)) {
    const existing = merged[systemId];
    if (!existing || entry.date >= existing.date) {
      const existingAmt = parseFloat(existing?.amount ?? "0");
      const incomingAmt = parseFloat(entry.amount);
      merged[systemId] = {
        date: entry.date,
        amount: String(Math.max(existingAmt, incomingAmt)),
      };
    }
  }
  return merged;
}
