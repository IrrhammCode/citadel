/**
 * Venice x402 Client — Wallet-based authentication for Venice AI
 * No API key needed. Pay with USDC on Base or Solana.
 */
import { VeniceClient, createAuthFetch } from "venice-x402-client";

let veniceClient: VeniceClient | null = null;

/**
 * Initialize Venice x402 client with a wallet private key.
 * Uses SIWE (Sign-In-With-X) for authentication.
 */
export function getVeniceX402Client(walletKey?: string): VeniceClient {
  if (veniceClient) return veniceClient;

  const key = walletKey || process.env.X402_WALLET_KEY;
  if (!key) {
    throw new Error("X402_WALLET_KEY not configured. Provide a wallet private key for x402 auth.");
  }

  veniceClient = new VeniceClient(key);
  return veniceClient;
}

/**
 * Check Venice x402 wallet balance
 */
export async function checkBalance(walletAddress: string): Promise<{
  canConsume: boolean;
  balanceUsd: number;
  minimumTopUpUsd: number;
}> {
  const client = getVeniceX402Client();
  const balance = await client.getBalance();
  return {
    canConsume: (balance as Record<string, unknown>).canConsume as boolean ?? true,
    balanceUsd: (balance as Record<string, unknown>).balanceUsd as number ?? 0,
    minimumTopUpUsd: (balance as Record<string, unknown>).minimumTopUpUsd as number ?? 1,
  };
}

/**
 * Call Venice AI with x402 wallet auth (instead of API key)
 * Falls back to API key if x402 not configured
 */
export async function veniceX402Chat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  model?: string,
): Promise<string> {
  try {
    const client = getVeniceX402Client();
    const response = await client.chat({
      model: model || "llama-3.3-70b",
      messages,
    });
    const data = response as unknown as Record<string, unknown>;
    return data.choices
      ? (data.choices as Array<{ message: { content: string } }>)[0]?.message?.content || ""
      : JSON.stringify(response);
  } catch (error) {
    // Fallback to API key auth
    throw error; // Let caller handle fallback
  }
}

/**
 * Create auth fetch for custom OpenAI-compatible calls
 */
export function createVeniceAuthFetch(walletKey?: string) {
  const key = walletKey || process.env.X402_WALLET_KEY;
  if (!key) throw new Error("X402_WALLET_KEY not configured");
  return createAuthFetch(key);
}
