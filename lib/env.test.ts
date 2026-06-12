import { describe, it, expect, afterEach, vi } from "vitest";

describe("env helpers", () => {
  const origVenice = process.env.VENICE_API_KEY;
  const origX402 = process.env.X402_WALLET_KEY;
  const origSession = process.env.SESSION_ACCOUNT_PRIVATE_KEY;

  afterEach(() => {
    if (origVenice) process.env.VENICE_API_KEY = origVenice;
    else delete process.env.VENICE_API_KEY;
    if (origX402) process.env.X402_WALLET_KEY = origX402;
    else delete process.env.X402_WALLET_KEY;
    if (origSession) process.env.SESSION_ACCOUNT_PRIVATE_KEY = origSession;
    else delete process.env.SESSION_ACCOUNT_PRIVATE_KEY;
  });

  it("isVeniceAuthConfigured accepts API key", async () => {
    process.env.VENICE_API_KEY = "test-key";
    delete process.env.X402_WALLET_KEY;
    const { isVeniceAuthConfigured } = await import("@/lib/env");
    expect(isVeniceAuthConfigured()).toBe(true);
  });

  it("isVeniceAuthConfigured accepts x402 wallet", async () => {
    delete process.env.VENICE_API_KEY;
    process.env.X402_WALLET_KEY = "0xabc";
    const { isVeniceAuthConfigured, getVeniceAuthMethod } = await import("@/lib/env");
    expect(isVeniceAuthConfigured()).toBe(true);
    expect(getVeniceAuthMethod()).toBe("x402");
  });

  it("getProductionReadiness requires CFO allowlist in production", async () => {
    const origNode = process.env.NODE_ENV;
    const origCfo = process.env.CFO_ALLOWED_SIGNERS;
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CITADEL_API_SECRET = "ci-secret-min-16-chars";
    process.env.VENICE_API_KEY = "test-key";
    process.env.SESSION_ACCOUNT_PRIVATE_KEY =
      "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
    delete process.env.CFO_ALLOWED_SIGNERS;

    vi.resetModules();
    const { getProductionReadiness } = await import("@/lib/env");
    const without = getProductionReadiness();
    expect(without.cfoAllowlist).toBe(false);
    expect(without.ready).toBe(false);

    process.env.CFO_ALLOWED_SIGNERS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    vi.resetModules();
    const { getProductionReadiness: getReady2 } = await import("@/lib/env");
    expect(getReady2().cfoAllowlist).toBe(true);

    process.env.NODE_ENV = origNode;
    if (origCfo) process.env.CFO_ALLOWED_SIGNERS = origCfo;
    else delete process.env.CFO_ALLOWED_SIGNERS;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.CITADEL_API_SECRET;
  });
});
