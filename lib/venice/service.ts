import "server-only";

/**
 * Unified Venice AI gateway — single entry point for all inference.
 * Fail-closed: Venice errors → block, never mock-approve.
 */
import {
  isVeniceConfigured,
  isX402Available,
  auditEnhanced,
  generateReport,
  evaluateNegotiation,
  searchVendor,
  generateTreasuryVisual,
  type EnhancedVerdict,
  VeniceClientError,
} from "@/lib/venice/client";
import {
  veniceHealthPing,
  veniceChatText,
  ensureVeniceBudget,
} from "@/lib/venice/inference";
import { thinkWithMetrics, buildSystemPrompt, buildUserPrompt, type AgentState, type AgentDecision } from "@/lib/agent/brain";
import { e2eMockAgentThink, isE2eMockVeniceEnabled } from "@/lib/venice/e2e-mock";
import { fallbackAuditEnhanced, fallbackAgentThink, isBaiFallbackConfigured } from "@/lib/fallback/bai";
import type { AuditRequestBody, AuditVerdict } from "@/types/audit";
import { appendVeniceUsage } from "@/lib/server/store";

const TOKEN_COST_PER_1K = 0.002;

function trackUsage(
  operation: "audit" | "think" | "report" | "negotiate" | "search" | "chat",
  model: string,
  tokens: number,
  latencyMs: number,
  systemId?: string,
  authMethodOverride?: "bai_fallback",
) {
  appendVeniceUsage({
    operation,
    model,
    tokens,
    latencyMs,
    systemId,
    authMethod: authMethodOverride ?? (isX402Available() ? "x402" : "api_key"),
    costUsd: tokens > 0 ? (tokens / 1000) * TOKEN_COST_PER_1K : 0,
  });
}

function failClosedVerdict(reason: string): EnhancedVerdict {
  return {
    decision: "blocked",
    confidence: 1,
    reasoning: reason,
    flags: ["venice_unavailable", "fail_closed"],
    patternAnalysis: {
      trend: "anomaly",
      description: "Audit could not complete — zero-trust policy blocks spend",
      riskLevel: "high",
    },
    vendorRisk: {
      isNew: true,
      trustScore: 0,
      recommendation: "Retry when Venice AI is available",
    },
  };
}

export class VeniceService {
  static async healthCheck(): Promise<{
    configured: boolean;
    ok: boolean;
    latencyMs: number;
    model: string;
    authMethod: "x402" | "api_key";
  }> {
    if (!isVeniceConfigured()) {
      return { configured: false, ok: false, latencyMs: 0, model: "none", authMethod: "api_key" };
    }
    const result = await veniceHealthPing();
    return {
      configured: true,
      ok: result.ok,
      latencyMs: result.latencyMs,
      model: result.model,
      authMethod: result.authMethod,
    };
  }

  /** Compliance audit gate — fail-closed on Venice error */
  static async audit(
    body: Parameters<typeof auditEnhanced>[0],
  ): Promise<EnhancedVerdict> {
    if (!isVeniceConfigured()) {
      return failClosedVerdict(
        "Venice not configured (VENICE_API_KEY or X402_WALLET_KEY). Zero-trust policy: all spends blocked.",
      );
    }

    const start = Date.now();
    const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";

    try {
      await ensureVeniceBudget();
      const { verdict, tokens } = await auditEnhanced(body);
      trackUsage("audit", model, tokens, Date.now() - start, body.systemId);
      return verdict;
    } catch (error) {
      if (isBaiFallbackConfigured()) {
        try {
          console.warn("[VeniceService] Primary failed, routing to B.AI fallback...");
          const { verdict, tokens } = await fallbackAuditEnhanced(body);
          trackUsage("audit", process.env.FALLBACK_BAI_MODEL ?? "llama-3.1-70b", tokens, Date.now() - start, body.systemId, "bai_fallback");
          return verdict;
        } catch (fallbackErr) {
          console.error("[VeniceService] Fallback also failed:", fallbackErr);
        }
      }

      const msg = error instanceof VeniceClientError
        ? `${error.code}: ${error.message}`
        : error instanceof Error ? error.message : "Unknown Venice error";
      trackUsage("audit", model, 0, Date.now() - start, body.systemId);
      return failClosedVerdict(`Venice audit failed (${msg}). Spend blocked per zero-trust policy.`);
    }
  }

  /** Agent think — inject customPrompt into knowledge. Fail-closed in production. */
  static async agentThink(
    state: AgentState,
    customPrompt?: string,
  ): Promise<AgentDecision> {
    if (isE2eMockVeniceEnabled()) {
      const start = Date.now();
      const decision = e2eMockAgentThink(state);
      trackUsage("think", "e2e-mock", 0, Date.now() - start, state.systemId);
      return decision;
    }

    if (!isVeniceConfigured()) {
      throw new Error("Venice not configured — set VENICE_API_KEY or X402_WALLET_KEY");
    }

    await ensureVeniceBudget();

    const enriched: AgentState = {
      ...state,
      knowledge: [
        ...(state.knowledge ?? []),
        ...(customPrompt ? [`CFO Policy: ${customPrompt}`] : []),
      ],
    };

    const start = Date.now();
    const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";

    try {
      const { decision, tokens } = await thinkWithMetrics(enriched);
      trackUsage("think", model, tokens, Date.now() - start, state.systemId);
      return decision;
    } catch (error) {
      if (isBaiFallbackConfigured()) {
        console.warn("[VeniceService] Primary agentThink failed, routing to B.AI fallback...");
        // Re-construct the prompt format that thinkWithMetrics uses
        const messages: any = [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(enriched) },
        ];
        const { data, tokens } = await fallbackAgentThink(messages, customPrompt);
        trackUsage("think", process.env.FALLBACK_BAI_MODEL ?? "llama-3.1-70b", tokens, Date.now() - start, state.systemId, "bai_fallback");
        try {
          return JSON.parse(data.match(/\{[\s\S]*\}/)?.[0] ?? data) as AgentDecision;
        } catch {
          throw new Error("Failed to parse B.AI fallback agent decision");
        }
      }
      throw error;
    }
  }

  static async generateAgentReport(
    systemId: string,
    systemName: string,
    data: Parameters<typeof generateReport>[2],
  ): Promise<string> {
    if (!isVeniceConfigured()) {
      return "Report unavailable — Venice AI not configured.";
    }
    const start = Date.now();
    const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";
    await ensureVeniceBudget();
    const report = await generateReport(systemId, systemName, data);
    trackUsage("report", model, 2500, Date.now() - start, systemId);
    return report;
  }

  static async negotiate(
    from: Parameters<typeof evaluateNegotiation>[0],
    to: Parameters<typeof evaluateNegotiation>[1],
    amount: number,
    reason: string,
  ) {
    if (!isVeniceConfigured()) {
      throw new Error("Venice not configured");
    }
    await ensureVeniceBudget();
    const start = Date.now();
    const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";
    const result = await evaluateNegotiation(from, to, amount, reason);
    trackUsage("negotiate", model, 800, Date.now() - start);
    return result;
  }

  static async vendorSearch(address: string, name?: string) {
    if (!isVeniceConfigured()) {
      throw new Error("Venice not configured");
    }
    await ensureVeniceBudget();
    const start = Date.now();
    const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";
    const result = await searchVendor(address, name);
    trackUsage("search", model, 600, Date.now() - start);
    return result;
  }

  static async chat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    options?: { model?: string; temperature?: number; maxTokens?: number },
  ) {
    if (!isVeniceConfigured()) {
      throw new Error("Venice not configured");
    }
    const start = Date.now();
    const model = options?.model ?? process.env.VENICE_MODEL ?? "llama-3.3-70b";
    const result = await veniceChatText(messages, {
      model,
      temperature: options?.temperature ?? 0.4,
      maxTokens: options?.maxTokens ?? 800,
    });
    trackUsage("chat", model, result.tokens, Date.now() - start);
    return {
      message: result.data,
      usage: { total_tokens: result.tokens },
    };
  }

  static async generateVisual(prompt: string) {
    if (!isVeniceConfigured()) {
      throw new Error("Venice not configured — cannot generate images");
    }
    await ensureVeniceBudget();
    const start = Date.now();
    const result = await generateTreasuryVisual(prompt);
    trackUsage("report", "flux-dev", 0, Date.now() - start);
    return result;
  }
}

export type { EnhancedVerdict, AuditVerdict };
