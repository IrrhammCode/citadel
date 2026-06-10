"use client";

import { useState } from "react";
import type { AuditRequestBody } from "@/types/audit";
import type { EnhancedVerdict } from "@/lib/venice/client";
import { getVendorProfile, getAuditLog, updateVendorProfile, addAnomaly, updateTrustScore } from "@/lib/storage";
import { detectAnomalies } from "@/lib/venice/client";

export function useEnhancedAudit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<EnhancedVerdict | null>(null);

  async function audit(body: AuditRequestBody): Promise<EnhancedVerdict | null> {
    setLoading(true);
    setError(null);
    setVerdict(null);

    try {
      // Get vendor history
      const vendor = getVendorProfile(body.spendRequest.recipient);
      const vendorHistory = vendor
        ? { totalPaid: vendor.totalPaid, transactionCount: vendor.transactionCount, averageAmount: vendor.averageAmount }
        : undefined;

      // Get recent audits
      const recentAudits = getAuditLog()
        .filter((r) => r.systemId === body.systemId)
        .slice(0, 20)
        .map((r) => ({ amount: parseFloat(r.spendRequest.amount), recipient: r.spendRequest.recipient, timestamp: r.timestamp }));

      // Client-side anomaly detection
      const anomalies = await detectAnomalies(
        body.systemId,
        {
          amount: parseFloat(body.spendRequest.amount),
          recipient: body.spendRequest.recipient,
          memo: body.spendRequest.memo,
        },
        vendor,
        recentAudits,
      );

      // Store anomalies
      for (const anomaly of anomalies) {
        addAnomaly(anomaly);
      }

      // Call enhanced Venice audit
      const res = await fetch("/api/audit-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, vendorHistory, recentAudits }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Enhanced audit failed");
      }

      const data = (await res.json()) as { verdict: EnhancedVerdict };
      setVerdict(data.verdict);

      // Update vendor profile
      updateVendorProfile(body.spendRequest.recipient, parseFloat(body.spendRequest.amount));

      // Update trust score based on verdict
      if (data.verdict.decision === "approved") {
        updateTrustScore(body.systemId, {
          type: "success",
          description: `Approved: ${body.spendRequest.amount} USDC to ${body.spendRequest.recipient.slice(0, 10)}...`,
          points: 1,
          timestamp: Date.now(),
        });
      } else {
        updateTrustScore(body.systemId, {
          type: "blocked",
          description: `Blocked: ${data.verdict.reasoning.slice(0, 50)}...`,
          points: -5,
          timestamp: Date.now(),
        });
      }

      return data.verdict;
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
  }

  return { audit, loading, error, verdict, reset };
}
