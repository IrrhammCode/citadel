import "server-only";
import type { z } from "zod";
import type { VeniceMessage } from "@/lib/venice/client";
import { getVeniceClient, isVeniceConfigured, isX402Available } from "@/lib/venice/client";
import { getVeniceX402Client, veniceX402Chat } from "@/lib/venice/x402";

export type InferenceResult<T> = {
  data: T;
  tokens: number;
  model: string;
  authMethod: "x402" | "api_key";
};

/** x402 budget gate — throws if balance insufficient */
export async function ensureVeniceBudget(): Promise<void> {
  if (!isX402Available()) return;

  const { checkBalance } = await import("@/lib/venice/x402");
  const client = getVeniceX402Client();
  const balance = await client.getBalance();
  const data = balance as Record<string, unknown>;
  const canConsume = data.canConsume !== false;
  const balanceUsd = Number(data.balanceUsd ?? 0);
  const budget = Number(process.env.X402_BUDGET_USD ?? 50);

  if (!canConsume || balanceUsd < 0.01) {
    throw new Error(
      `x402 wallet balance insufficient ($${balanceUsd.toFixed(2)}). Top up to continue Venice inference.`,
    );
  }

  const store = (await import("@/lib/server/store")).getServerStore();
  const spent = store.veniceUsage.reduce((s, u) => s + u.costUsd, 0);
  if (spent >= budget) {
    throw new Error(
      `x402 budget cap reached ($${spent.toFixed(2)} / $${budget}). Increase X402_BUDGET_USD or top up wallet.`,
    );
  }
}

export async function veniceHealthPing(): Promise<{
  ok: boolean;
  latencyMs: number;
  model: string;
  authMethod: "x402" | "api_key";
}> {
  if (!isVeniceConfigured()) {
    return { ok: false, latencyMs: 0, model: "none", authMethod: "api_key" };
  }

  const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";
  const start = Date.now();

  try {
    if (isX402Available()) {
      await veniceX402Chat([{ role: "user", content: "ping" }], model);
      return {
        ok: true,
        latencyMs: Date.now() - start,
        model,
        authMethod: "x402",
      };
    }
    const client = getVeniceClient();
    const result = await client.healthCheck();
    return { ...result, authMethod: "api_key" as const };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      model,
      authMethod: isX402Available() ? "x402" : "api_key",
    };
  }
}

export async function veniceChatJSON<T>(
  messages: VeniceMessage[],
  options?: {
    model?: string;
    temperature?: number;
    schema?: z.ZodType<T>;
  },
): Promise<InferenceResult<T>> {
  if (!isVeniceConfigured()) {
    throw new Error("Venice not configured — set VENICE_API_KEY or X402_WALLET_KEY");
  }

  await ensureVeniceBudget();

  const model = options?.model ?? process.env.VENICE_MODEL ?? "llama-3.3-70b";
  const temperature = options?.temperature ?? 0.1;

  if (isX402Available()) {
    const raw = await veniceX402Chat(
      messages.map((m) => ({ role: m.role, content: m.content })),
      model,
    );
    const jsonMatch = raw.trim().match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw.trim();
    const parsed = JSON.parse(jsonStr);
    const data = options?.schema ? options.schema.parse(parsed) : (parsed as T);
    return { data, tokens: 0, model, authMethod: "x402" };
  }

  const client = getVeniceClient();
  const result = await client.chatJSON({
    model,
    temperature,
    messages,
    schema: options?.schema,
  });
  return { data: result.data, tokens: result.tokens, model, authMethod: "api_key" };
}

export async function veniceChatText(
  messages: VeniceMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<InferenceResult<string>> {
  if (!isVeniceConfigured()) {
    throw new Error("Venice not configured");
  }

  await ensureVeniceBudget();

  const model = options?.model ?? process.env.VENICE_MODEL ?? "llama-3.3-70b";

  if (isX402Available()) {
    const content = await veniceX402Chat(
      messages.map((m) => ({ role: m.role, content: m.content })),
      model,
    );
    return { data: content, tokens: 0, model, authMethod: "x402" };
  }

  const client = getVeniceClient();
  const response = await client.chat({
    messages,
    model,
    temperature: options?.temperature ?? 0.4,
    maxTokens: options?.maxTokens ?? 800,
  });
  const content = response.choices[0]?.message?.content ?? "";
  return {
    data: content,
    tokens: response.usage?.total_tokens ?? 0,
    model,
    authMethod: "api_key",
  };
}
