"use client";

import { useState } from "react";
import type { NegotiationRequest } from "@/types/agent";
import { getTrustScore, getBudgetPool, saveNegotiation, updateBudgetPool, updateNegotiationStatus, getNegotiations } from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

export function useNegotiation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestBudget(
    fromSystemId: string,
    amount: number,
    reason: string,
  ): Promise<NegotiationRequest | null> {
    setLoading(true);
    setError(null);

    try {
      const fromSystem = AUTONOMOUS_SYSTEMS.find((s) => s.id === fromSystemId);
      if (!fromSystem) throw new Error("System not found");

      const fromTrust = getTrustScore(fromSystemId);
      const pool = getBudgetPool();

      // Find a system with unused budget
      const toSystem = AUTONOMOUS_SYSTEMS.find((s) => {
        if (s.id === fromSystemId) return false;
        const allocation = pool.allocations.find((a) => a.systemId === s.id);
        return allocation && allocation.amount > 0;
      });

      if (!toSystem) {
        // Use unallocated pool
        if (pool.unallocated >= amount) {
          const negotiation: NegotiationRequest = {
            id: crypto.randomUUID(),
            fromSystemId,
            toSystemId: "pool",
            amount,
            reason,
            status: "approved",
            veniceVerdict: "Approved from unallocated pool",
            timestamp: Date.now(),
            resolvedAt: Date.now(),
          };

          // Update budget pool
          const newPool = {
            ...pool,
            unallocated: pool.unallocated - amount,
            allocated: pool.allocated + amount,
            allocations: [...pool.allocations, { systemId: fromSystemId, amount: (pool.allocations.find((a) => a.systemId === fromSystemId)?.amount || 0) + amount }],
          };
          updateBudgetPool(newPool);
          saveNegotiation(negotiation);
          return negotiation;
        }
        throw new Error("No available budget");
      }

      const toTrust = getTrustScore(toSystem.id);
      const toAllocation = pool.allocations.find((a) => a.systemId === toSystem.id);
      const unusedBudget = toAllocation ? toAllocation.amount * 0.3 : 0; // Assume 30% is unused

      // Call Venice to evaluate
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSystem: {
            name: fromSystem.name,
            trustScore: fromTrust.score,
            roi: 2.3,
            budget: fromSystem.budget || 500,
            spent: 0,
          },
          toSystem: {
            name: toSystem.name,
            trustScore: toTrust.score,
            unusedBudget,
          },
          amount,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Negotiation failed");
      }

      const data = (await res.json()) as { verdict: { approved: boolean; reasoning: string; confidence: number } };

      const negotiation: NegotiationRequest = {
        id: crypto.randomUUID(),
        fromSystemId,
        toSystemId: toSystem.id,
        amount,
        reason,
        status: data.verdict.approved ? "approved" : "rejected",
        veniceVerdict: data.verdict.reasoning,
        timestamp: Date.now(),
        resolvedAt: Date.now(),
      };

      if (data.verdict.approved) {
        // Transfer budget
        const newAllocations = pool.allocations.map((a) => {
          if (a.systemId === toSystem.id) return { ...a, amount: a.amount - Math.min(amount, unusedBudget) };
          if (a.systemId === fromSystemId) return { ...a, amount: a.amount + amount };
          return a;
        });
        updateBudgetPool({ ...pool, allocations: newAllocations });
      }

      saveNegotiation(negotiation);
      return negotiation;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function getSystemNegotiations(systemId: string): NegotiationRequest[] {
    return getNegotiations(systemId);
  }

  return { requestBudget, getSystemNegotiations, loading, error };
}
