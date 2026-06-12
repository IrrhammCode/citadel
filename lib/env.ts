import { z } from "zod";

const serverSchema = z.object({
  VENICE_API_KEY: z.string().optional(),
  VENICE_MODEL: z.string().default("llama-3.3-70b"),
  X402_WALLET_KEY: z.string().optional(),
  X402_BUDGET_USD: z.coerce.number().default(50),
  SESSION_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  SEPOLIA_RPC_URL: z.string().default("https://rpc.ankr.com/eth_sepolia"),
  USDC_CONTRACT_ADDRESS: z
    .string()
    .default("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
  TATUM_API_KEY: z.string().optional(),
  ONESHOT_API_KEY: z.string().optional(),
  REPORT_SPEND_THRESHOLD: z.coerce.number().default(5),
  BRAIN_CACHE_TTL_MINUTES: z.coerce.number().default(5),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CITADEL_API_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  CFO_ALLOWED_SIGNERS: z.string().optional(),
  ONESHOT_WEBHOOK_SECRET: z.string().optional(),
  CITADEL_REQUIRE_WALLET_APPROVAL: z.enum(["true", "false"]).optional(),
  E2E_CFO_PRIVATE_KEY: z.string().optional(),
  E2E_MOCK_VENICE: z.enum(["true", "false"]).optional(),
});

const publicClientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof publicClientSchema>;

function parseEnv() {
  const server = serverSchema.safeParse(process.env);
  if (!server.success) {
    console.error("[env] Invalid server environment:", server.error.flatten());
    throw new Error("Invalid server environment configuration");
  }
  const client = publicClientSchema.safeParse(process.env);
  if (!client.success) {
    console.error("[env] Invalid client environment:", client.error.flatten());
    throw new Error("Invalid client environment configuration");
  }
  return { server: server.data, client: client.data };
}

let _env: ReturnType<typeof parseEnv> | null = null;

export function getEnv() {
  if (!_env) _env = parseEnv();
  return _env;
}

export function isVeniceAuthConfigured(): boolean {
  return !!(process.env.VENICE_API_KEY || process.env.X402_WALLET_KEY);
}

export function getVeniceAuthMethod(): "x402" | "api_key" | "none" {
  if (process.env.X402_WALLET_KEY) return "x402";
  if (process.env.VENICE_API_KEY) return "api_key";
  return "none";
}

export function isSessionAccountConfigured(): boolean {
  return !!process.env.SESSION_ACCOUNT_PRIVATE_KEY;
}

export function isProductionDeploy(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Fail fast when booting production without required infra */
export function validateProductionEnv(): void {
  if (!isProductionDeploy()) return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.REDIS_URL) missing.push("REDIS_URL");
  if (!process.env.CITADEL_API_SECRET || process.env.CITADEL_API_SECRET.length < 16) {
    missing.push("CITADEL_API_SECRET (min 16 chars)");
  }
  if (!process.env.CRON_SECRET) missing.push("CRON_SECRET");
  if (!isSessionAccountConfigured()) missing.push("SESSION_ACCOUNT_PRIVATE_KEY");
  else {
    // Additional production safety check for the session key
    const { isSessionAccountSafeForProduction } = require("@/lib/metamask/session-account");
    if (!isSessionAccountSafeForProduction()) {
      missing.push("SESSION_ACCOUNT_PRIVATE_KEY (appears to be a test key — not safe for production)");
    }
  }
  if (!isVeniceAuthConfigured()) missing.push("VENICE_API_KEY or X402_WALLET_KEY");
  if (!process.env.CFO_ALLOWED_SIGNERS?.trim()) {
    missing.push("CFO_ALLOWED_SIGNERS (comma-separated authorized CFO addresses)");
  }
  if (!process.env.SLACK_WEBHOOK_URL?.trim()) {
    missing.push("SLACK_WEBHOOK_URL (approval + expiry alerts)");
  }
  if (!process.env.ONESHOT_WEBHOOK_SECRET?.trim()) {
    missing.push("ONESHOT_WEBHOOK_SECRET (HMAC for /api/webhook/oneshot)");
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Production requires: ${missing.join(", ")}. See .env.local.example`,
    );
  }
}

function isSessionAccountProductionSafe(): boolean {
  if (!isSessionAccountConfigured()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSessionAccountSafeForProduction } = require("@/lib/metamask/session-account") as {
      isSessionAccountSafeForProduction: () => boolean;
    };
    return isSessionAccountSafeForProduction();
  } catch {
    return false;
  }
}

export function getProductionReadiness(): {
  venice: boolean;
  sessionAccount: boolean;
  sessionAccountSafe: boolean;
  cfoAllowlist: boolean;
  slack: boolean;
  oneshotWebhook: boolean;
  rpc: boolean;
  database: boolean;
  redis: boolean;
  apiSecret: boolean;
  ready: boolean;
  authMethod: "x402" | "api_key" | "none";
  storeBackend: "postgres" | "file";
} {
  const venice = isVeniceAuthConfigured();
  const sessionConfigured = isSessionAccountConfigured();
  const sessionAccountSafe = isSessionAccountProductionSafe();
  const sessionAccount = isProductionDeploy()
    ? sessionConfigured && sessionAccountSafe
    : sessionConfigured;
  const cfoAllowlist = !!(process.env.CFO_ALLOWED_SIGNERS?.trim());
  const slack = !!(process.env.SLACK_WEBHOOK_URL?.trim());
  const oneshotWebhook = !!(process.env.ONESHOT_WEBHOOK_SECRET?.trim());
  const rpc = !!(process.env.SEPOLIA_RPC_URL || "https://rpc.ankr.com/eth_sepolia");
  const database = !!process.env.DATABASE_URL;
  const redis = !!process.env.REDIS_URL;
  const apiSecret = !!(process.env.CITADEL_API_SECRET && process.env.CITADEL_API_SECRET.length >= 16);

  const prodReady = isProductionDeploy()
    ? venice &&
      sessionAccount &&
      cfoAllowlist &&
      slack &&
      oneshotWebhook &&
      rpc &&
      database &&
      redis &&
      apiSecret
    : venice && sessionAccount && rpc;

  return {
    venice,
    sessionAccount,
    sessionAccountSafe,
    cfoAllowlist,
    slack,
    oneshotWebhook,
    rpc,
    database,
    redis,
    apiSecret,
    ready: prodReady,
    authMethod: getVeniceAuthMethod(),
    storeBackend: database ? "postgres" : "file",
  };
}
