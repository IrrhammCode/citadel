import { privateKeyToAccount } from "viem/accounts";
import { isProductionDeploy } from "@/lib/env";

/**
 * Server-side session EOA used as the ERC-7715 permission recipient (`to` address).
 * 
 * CRITICAL PRODUCTION WARNING:
 * - This private key controls funds via delegated permissions.
 * - It MUST be managed via a secrets manager in production (Vercel Env, AWS Secrets Manager, Doppler, etc.).
 * - Never commit real keys. Never log the key.
 * - In production we perform additional sanity checks.
 */
export function getSessionAccount() {
  const privateKey = process.env.SESSION_ACCOUNT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SESSION_ACCOUNT_PRIVATE_KEY is not configured");
  }

  // Never log the actual key
  if (privateKey.length < 60) {
    throw new Error("SESSION_ACCOUNT_PRIVATE_KEY appears invalid (too short)");
  }

  if (isProductionDeploy()) {
    // Extra guard: refuse obviously test keys in production
    const lower = privateKey.toLowerCase();
    const testPatterns = ["test", "demo", "example", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"];
    if (testPatterns.some(p => lower.includes(p))) {
      throw new Error(
        "Refusing to use a test/demo private key in production. " +
        "Provide a proper funded session key via secrets manager."
      );
    }
  }

  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  return privateKeyToAccount(normalized as `0x${string}`);
}

export function getSessionAddress(): `0x${string}` {
  return getSessionAccount().address;
}

/** Safe check without throwing (useful for preflights) */
export function isSessionAccountSafeForProduction(): boolean {
  try {
    const key = process.env.SESSION_ACCOUNT_PRIVATE_KEY;
    if (!key || key.length < 60) return false;
    const lower = key.toLowerCase();
    const dangerous = ["test", "demo", "example", "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"];
    return !dangerous.some(d => lower.includes(d));
  } catch {
    return false;
  }
}
