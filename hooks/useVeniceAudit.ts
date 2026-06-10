"use client";

import { useState } from "react";
import type { AuditRecord, AuditRequestBody, AuditVerdict } from "@/types/audit";
import { appendAuditRecord } from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

export function useVeniceAudit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<AuditVerdict | null>(null);
  const [lastRecord, setLastRecord] = useState<AuditRecord | null>(null);

  async function audit(body: AuditRequestBody): Promise<AuditRecord | null> {
    setLoading(true);
    setError(null);
    setVerdict(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Audit request failed");
      }

      const data = (await res.json()) as { verdict: AuditVerdict };
      setVerdict(data.verdict);

      const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === body.systemId);
      const record: AuditRecord = {
        id: crypto.randomUUID(),
        systemId: body.systemId,
        systemName: system?.name ?? body.systemId,
        spendRequest: body.spendRequest,
        verdict: data.verdict,
        timestamp: Date.now(),
      };

      appendAuditRecord(record);
      setLastRecord(record);
      return record;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setVerdict(null);
    setError(null);
    setLastRecord(null);
  }

  return { audit, loading, error, verdict, lastRecord, reset };
}
