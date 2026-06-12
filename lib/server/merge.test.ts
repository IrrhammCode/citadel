import { describe, it, expect } from "vitest";
import { mergeByKey, mergeRecords, mergeDailySpend } from "@/lib/server/merge";

describe("mergeByKey", () => {
  it("merges by id keeping newer timestamp", () => {
    const existing = [{ id: "a", timestamp: 100, value: "old" }];
    const incoming = [{ id: "a", timestamp: 200, value: "new" }];
    const result = mergeByKey(incoming, existing, "id");
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("new");
  });

  it("appends new items", () => {
    const existing = [{ id: "a", timestamp: 100 }];
    const incoming = [{ id: "b", timestamp: 50 }];
    const result = mergeByKey(incoming, existing, "id");
    expect(result).toHaveLength(2);
  });

  it("respects cap", () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, timestamp: i }));
    const incoming = [{ id: "n", timestamp: 99 }];
    const result = mergeByKey(incoming, existing, "id", 3);
    expect(result).toHaveLength(3);
  });
});

describe("mergeRecords", () => {
  it("merges record maps", () => {
    const current = { a: { level: "semi-auto" } };
    const partial = { b: { level: "full-auto" } };
    const result = mergeRecords(current, partial);
    expect(result.a).toBeDefined();
    expect(result.b).toBeDefined();
  });
});

describe("mergeDailySpend", () => {
  it("keeps higher amount for same date", () => {
    const current = { sys1: { date: "2026-06-07", amount: "10" } };
    const partial = { sys1: { date: "2026-06-07", amount: "25" } };
    const result = mergeDailySpend(current, partial);
    expect(result.sys1.amount).toBe("25");
  });
});
