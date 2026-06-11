import OpenAI from "openai";
import { z } from "zod";
import { getVeniceX402Client, veniceX402Chat } from "@/lib/venice/x402";
import { searchVendor, checkAddressReputation } from "@/lib/venice/search";
import { getMemoryContext } from "./memory";
import { AgentEventBus } from "./event-bus";
import { createHash } from "crypto";

// ─── Types ──────────────────────────────────────────────────

export type AgentState = {
  systemId: string;
  systemName: string;
  goal: string;
  budget: {
    total: number;
    remaining: number;
    spent: number;
  };
  kpis: {
    name: string;
    target: number;
    current: number;
    unit: string;
    isHigherBetter: boolean;
    status: "met" | "behind" | "ahead";
  }[];
  pendingTasks: {
    id: string;
    type: "invoice" | "vendor_onboard" | "report" | "negotiate" | "custom";
    description: string;
    amount?: number;
    recipient?: string;
    priority: "low" | "medium" | "high";
  }[];
  recentTransactions: {
    amount: number;
    recipient: string;
    memo: string;
    timestamp: number;
    decision: "approved" | "blocked";
  }[];
  marketContext?: string;
  knowledge?: string[];
};

export type AgentAction = {
  type: "spend" | "negotiate" | "report" | "onboard_vendor" | "wait" | "custom";
  description: string;
  amount?: number;
  recipient?: string;
  memo?: string;
  reasoning: string;
  confidence: number;
  priority: "low" | "medium" | "high";
};

export type AgentDecision = {
  actions: AgentAction[];
  reasoning: string;
  confidence: number;
  nextCycleDelay: number; // minutes
};

// ─── Schema ─────────────────────────────────────────────────

const actionSchema = z.object({
  type: z.enum(["spend", "negotiate", "report", "onboard_vendor", "wait", "custom"]),
  description: z.string(),
  amount: z.number().optional(),
  recipient: z.string().optional(),
  memo: z.string().optional(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  priority: z.enum(["low", "medium", "high"]),
});

const decisionSchema = z.object({
  actions: z.array(actionSchema),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  nextCycleDelay: z.number().min(1).max(1440),
});

// ─── Venice Client ──────────────────────────────────────────

function getVeniceClient(): OpenAI {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) throw new Error("VENICE_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.venice.ai/api/v1",
  });
}

// ─── Retry Logic ────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[brain] ${label} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, lastError.message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`[brain] ${label} failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

// ─── Decision Cache ─────────────────────────────────────────

class DecisionCache {
  private cache = new Map<string, { decision: AgentDecision; ts: number }>();
  private readonly ttlMs: number;

  constructor(ttlMinutes: number = 5) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  private hash(state: AgentState): string {
    const key = JSON.stringify({
      systemId: state.systemId,
      goal: state.goal,
      budget: state.budget,
      kpis: state.kpis,
      pendingTasks: state.pendingTasks,
      recentTransactions: state.recentTransactions.slice(-3),
    });
    return createHash("sha256").update(key).digest("hex").slice(0, 16);
  }

  get(state: AgentState): AgentDecision | null {
    const key = this.hash(state);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.decision;
  }

  set(state: AgentState, decision: AgentDecision): void {
    const key = this.hash(state);
    this.cache.set(key, { decision, ts: Date.now() });
    // Evict old entries if cache grows too large
    if (this.cache.size > 100) {
      const oldest = Array.from(this.cache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const decisionCache = new DecisionCache(Number(process.env.BRAIN_CACHE_TTL_MINUTES) || 5);

/** Clear the decision cache (e.g. after manual overrides or config changes) */
export function clearDecisionCache(): void {
  decisionCache.clear();
}

// ─── Agent Brain ────────────────────────────────────────────

export async function think(state: AgentState): Promise<AgentDecision> {
  // Check cache first to avoid redundant API calls
  const cached = decisionCache.get(state);
  if (cached) {
    console.log("[brain] Returning cached decision");
    return cached;
  }

  // Enrich state with vendor research via Venice Web Search
  const enrichedState = await enrichStateWithResearch(state);

  // Get memory context
  const memoryContext = getMemoryContext(state.systemId);
  if (memoryContext.length > 0) {
    enrichedState.knowledge = [
      ...(enrichedState.knowledge || []),
      ...memoryContext,
    ];
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(enrichedState);

  // Make the actual Venice AI API call with retry logic
  const decision = await withRetry(
    () => callVeniceAI(systemPrompt, userPrompt),
    "think",
  );

  // Cache the result
  decisionCache.set(state, decision);

  return decision;
}

/**
 * Call Venice AI API for a decision. Tries x402 wallet auth first,
 * falls back to API key auth. Handles response parsing and validation.
 */
async function callVeniceAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<AgentDecision> {
  const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  let rawContent: string;

  // Try x402 wallet auth first, fall back to API key
  try {
    getVeniceX402Client();
    rawContent = await veniceX402Chat(messages, model);
  } catch {
    // x402 not available — use API key client
    const client = getVeniceClient();
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    });
    rawContent = response.choices[0]?.message?.content ?? "";
  }

  if (!rawContent) {
    throw new Error("Venice AI returned empty response");
  }

  // Parse and validate the response
  return parseDecision(rawContent, systemPrompt, userPrompt);
}

/**
 * Parse Venice AI response into a validated AgentDecision.
 * If initial parse fails, retries with a stricter prompt.
 */
async function parseDecision(
  rawContent: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AgentDecision> {
  // First attempt: parse the response directly
  try {
    const parsed = JSON.parse(rawContent);
    return decisionSchema.parse(parsed);
  } catch (parseErr) {
    console.warn("[brain] Initial JSON parse failed, retrying with strict prompt:",
      parseErr instanceof Error ? parseErr.message : parseErr);
  }

  // Second attempt: ask Venice to fix the JSON
  const client = getVeniceClient();
  const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";

  const fixResponse = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
      {
        role: "user",
        content: `The previous response was invalid JSON. Fix and return valid JSON only. Previous response:\n${rawContent.slice(0, 2000)}`,
      },
    ],
  });

  const fixContent = fixResponse.choices[0]?.message?.content;
  if (!fixContent) {
    throw new Error("Venice AI fix-up call returned empty response");
  }

  const parsed = JSON.parse(fixContent);
  return decisionSchema.parse(parsed);
}

// ─── Build User Prompt ──────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an autonomous AI treasury agent. Your job is to make intelligent spending and management decisions to achieve your goal while staying within budget and meeting KPIs.

CORE PRINCIPLES:
1. Always stay within budget — never exceed remaining balance
2. Prioritize actions that move KPIs toward targets
3. Be conservative with new vendors — verify before paying
4. Generate reports when KPIs are behind target
5. Negotiate when you can get better deals
6. Learn from recent transactions — avoid repeating mistakes

DECISION FRAMEWORK:
- If KPIs are met → optimize for efficiency
- If KPIs are behind → take corrective action
- If budget is low → prioritize high-impact actions
- If anomalies detected → investigate before acting

You MUST respond with valid JSON only:
{
  "actions": [
    {
      "type": "spend" | "negotiate" | "report" | "onboard_vendor" | "wait" | "custom",
      "description": "what you want to do",
      "amount": number (for spend actions),
      "recipient": "address" (for spend actions),
      "memo": "description" (for spend actions),
      "reasoning": "why this action",
      "confidence": 0.0-1.0,
      "priority": "low" | "medium" | "high"
    }
  ],
  "reasoning": "overall strategy explanation",
  "confidence": 0.0-1.0,
  "nextCycleDelay": minutes until next decision cycle
}

RULES:
- Maximum 3 actions per cycle
- Total spend cannot exceed remaining budget
- Confidence < 0.5 → use "wait" action instead
- Always include reasoning for each action`;
}

function buildUserPrompt(state: AgentState): string {
  const kpiSummary = state.kpis.map((k) => {
    const progress = k.isHigherBetter
      ? ((k.current / k.target) * 100).toFixed(1)
      : k.target > 0 ? (((k.target - (k.current - k.target)) / k.target) * 100).toFixed(1) : "100";
    return `- ${k.name}: ${k.current}${k.unit} / ${k.target}${k.unit} (${progress}%) [${k.status}]`;
  }).join("\n");

  const pendingTasks = state.pendingTasks.length > 0
    ? state.pendingTasks.map((t) => `- [${t.priority.toUpperCase()}] ${t.description}${t.amount ? ` (${t.amount} USDC)` : ""}`).join("\n")
    : "- No pending tasks";

  const recentTx = state.recentTransactions.length > 0
    ? state.recentTransactions.slice(-5).map((t) => `- ${t.decision === "approved" ? "✅" : "❌"} ${t.amount} USDC to ${t.recipient.slice(0, 10)}... — ${t.memo}`).join("\n")
    : "- No recent transactions";

  const knowledge = state.knowledge && state.knowledge.length > 0
    ? `\nKNOWLEDGE BASE:\n${state.knowledge.map((k) => `- ${k}`).join("\n")}`
    : "";

  return `AGENT: ${state.systemName}
GOAL: ${state.goal}

BUDGET:
- Total: ${state.budget.total} USDC
- Remaining: ${state.budget.remaining} USDC
- Spent: ${state.budget.spent} USDC (${((state.budget.spent / state.budget.total) * 100).toFixed(1)}%)

KPIs:
${kpiSummary}

PENDING TASKS:
${pendingTasks}

RECENT TRANSACTIONS:
${recentTx}
${knowledge}

${state.marketContext ? `MARKET CONTEXT:\n${state.marketContext}` : ""}

What actions should you take next to achieve your goal and meet your KPIs?`;
}

// ─── Quick Think (for simulation) ───────────────────────────

export async function thinkQuick(
  state: AgentState,
  scenario: string,
): Promise<{ action: AgentAction; reasoning: string }> {
  const prompt = `You are ${state.systemName}. Your goal: ${state.goal}.
Budget: ${state.budget.remaining} USDC remaining.
KPIs: ${state.kpis.map((k) => `${k.name}: ${k.current}/${k.target}`).join(", ")}

Scenario: ${scenario}

What would you do? Respond with JSON:
{
  "action": {
    "type": "spend" | "negotiate" | "report" | "onboard_vendor" | "wait" | "custom",
    "description": "what you want to do",
    "amount": number (for spend),
    "recipient": "address" (for spend),
    "memo": "description" (for spend),
    "reasoning": "why",
    "confidence": 0.0-1.0,
    "priority": "low" | "medium" | "high"
  },
  "reasoning": "overall explanation"
}`;

  return withRetry(async () => {
    let rawContent: string;

    try {
      getVeniceX402Client();
      rawContent = await veniceX402Chat([
        { role: "system", content: "You are an autonomous treasury agent. Respond with JSON only." },
        { role: "user", content: prompt },
      ]);
    } catch {
      const client = getVeniceClient();
      const response = await client.chat.completions.create({
        model: process.env.VENICE_MODEL ?? "llama-3.3-70b",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an autonomous treasury agent. Respond with JSON only." },
          { role: "user", content: prompt },
        ],
      });
      rawContent = response.choices[0]?.message?.content ?? "";
    }

    if (!rawContent) throw new Error("Venice returned an empty response");
    return JSON.parse(rawContent);
  }, "thinkQuick");
}

// ─── Enrich State with Research ─────────────────────────────

async function enrichStateWithResearch(state: AgentState): Promise<AgentState> {
  const enriched = { ...state };
  
  // Research vendors in pending tasks
  for (const task of enriched.pendingTasks) {
    if (task.type === "vendor_onboard" && task.recipient) {
      try {
        const reputation = await checkAddressReputation(task.recipient);
        if (reputation.reputation === "suspicious" || reputation.reputation === "malicious") {
          enriched.marketContext = (enriched.marketContext || "") + 
            `\nWARNING: Vendor ${task.recipient} has ${reputation.reputation} reputation: ${reputation.details}`;
        }
      } catch {
        // Ignore research errors
      }
    }
  }
  
  // Research vendors in recent transactions
  const recentVendors = enriched.recentTransactions
    .map((t) => t.recipient)
    .filter((r, i, arr) => arr.indexOf(r) === i) // unique
    .slice(0, 3); // limit to 3
  
  for (const vendor of recentVendors) {
    try {
      const result = await searchVendor(vendor);
      if (result.found && result.riskLevel === "high") {
        enriched.marketContext = (enriched.marketContext || "") + 
          `\nVendor ${vendor.slice(0, 10)}... risk: ${result.riskLevel} - ${result.summary}`;
      }
    } catch {
      // Ignore research errors
    }
  }
  
  return enriched;
}
