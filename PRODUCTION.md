# Citadel — Production Readiness Guide

**Warning**: This is a **zero-trust autonomous treasury system**. It can move real money on-chain using delegated permissions. Treat it with the same rigor as any financial infrastructure.

## Current Production Status (as of latest audit)

- **Architecture**: Good server-side execution model (Postgres + Redis store, proper separation).
- **Venice AI**: Strong fail-closed integration with usage tracking.
- **Resilience**: Retry, circuit breakers, and timeouts are present.
- **Key Gaps** (must be addressed before handling meaningful value):
  1. **Private Key Management** — `SESSION_ACCOUNT_PRIVATE_KEY` is the highest risk item.
  2. **On-chain Execution Safety** — Pre-execution simulation + permission freshness checks have been strengthened but require real mainnet testing.
  3. **Observability & Alerting** — Basic events exist; full monitoring/alerting is still manual.
  4. **Testing Coverage** — Core flows have some tests; adversarial and failure-mode coverage needs expansion.
  5. **Permission Lifecycle** — Revocation, expiry monitoring, and multi-agent visibility need operational tooling.

**Verdict**: Suitable for advanced hackathon demos and controlled testnet usage with small amounts. **Not yet recommended for production with significant treasury value** without additional operational hardening.

## Required Environment Variables (Production)

See `.env.local.example`. The following **must** be set and validated:

```bash
DATABASE_URL=...
REDIS_URL=...
CITADEL_API_SECRET=...          # min 16 chars, strong random
CRON_SECRET=...                 # for securing /api/cron/*
SESSION_ACCOUNT_PRIVATE_KEY=... # CRITICAL — see below
VENICE_API_KEY=... or X402_WALLET_KEY=...
SEPOLIA_RPC_URL=...
CFO_ALLOWED_SIGNERS=0x...       # comma separated (REQUIRED in production)
SLACK_WEBHOOK_URL=...           # recommended for approval alerts
```

The app will refuse to start in `NODE_ENV=production` if critical variables are missing (see `lib/env.ts:validateProductionEnv`).

## Private Key / Session Account Security (Highest Priority)

The session account private key is used to execute delegated transactions on behalf of agents.

**Production Requirements**:
- **Never** put a real private key in a plain environment variable on a long-lived server.
- Use a secrets manager:
  - Vercel Environment Variables (encrypted at rest)
  - AWS Secrets Manager + AWS Parameter Store
  - Doppler, 1Password Connect, HashiCorp Vault, etc.
- Prefer a dedicated, low-balance session EOA that only holds the minimum required permissions.
- Rotate the session key periodically (requires re-granting permissions).
- Monitor the session address balance and activity.

The code now includes runtime guards that will refuse to boot in production if it detects obvious test keys.

## Deployment Checklist

1. **Secrets**
   - [ ] All secrets in a proper secrets manager.
   - [ ] `SESSION_ACCOUNT_PRIVATE_KEY` is **not** a test key.
   - [ ] `CITADEL_API_SECRET` and `CRON_SECRET` are strong and different.

2. **Infrastructure**
   - [ ] Postgres + Redis available and reachable.
   - [ ] Run `npm run db:migrate` (or equivalent) before first deploy.
   - [ ] Vercel (or equivalent) has the cron job enabled (`vercel.json`).

3. **On-chain**
   - [ ] Session account has been granted real ERC-7715 permissions on the target chain.
   - [ ] 1Shot relayer (if used) is configured for gas sponsorship in the desired stablecoin.
   - [ ] Test the full grant → cycle → execute flow on a staging environment with real test funds first.

4. **Venice AI**
   - [ ] Monitor usage and costs (`/billing` page + `appendVeniceUsage`).
   - [ ] Consider setting `X402_WALLET_KEY` for pay-per-use instead of pre-funded API key when available.

5. **Monitoring & Alerting**
   - [ ] Wire Slack (or other) webhooks for approval requests and execution failures.
   - [ ] Set up alerts for:
     - Repeated agent cycle failures
     - Permission expiry approaching
     - Large spends
     - Venice error rate spikes
   - [ ] Consider adding a `/api/health` or `/api/status` endpoint that reports `getProductionReadiness()`.

6. **Testing**
   - [ ] Run `npm test` and `npm run test:e2e` before deploying.
   - [ ] Perform manual chaos testing (revoke permission mid-cycle, simulate Venice outage, etc.).

7. **Operational**
   - [ ] Have a runbook for "Agent is stuck" / "Permission needs re-grant" / "Emergency stop".
   - [ ] Document the exact CFO approval flow (including wallet signature requirements).

## Emergency Procedures

- **Emergency Stop**: Set `emergencyStop: true` in the autonomy config for a system via admin tools (or directly in the store).
- **Revoke Permission**: Use the wallet that originally granted the permission to revoke it on-chain.
- **Recover Funds**: The session account is the only entity that can move funds under the granted permission. Have the seed phrase / key of the session account in a secure offline location.

## Recommended Next Steps for True Production

1. Move session key loading to a pluggable signer (e.g. AWS KMS signer, Fireblocks, or MPC).
2. Add on-chain simulation (via Tenderly or similar) as a hard gate before every broadcast.
3. Implement comprehensive alerting (PagerDuty / OpsGenie) on top of the existing event bus.
4. Build a proper admin dashboard for permission health, daily limits, and manual interventions.
5. Achieve higher test coverage on `server-cycle`, `executeDelegatedTransfer`, and autonomy decision paths under failure conditions.
6. Regular security review / audit of the permission grant + delegation + execution flow.

## Support & Feedback

See `feedback.md` for known MetaMask Smart Accounts Kit pain points encountered while building this system.

---

**Remember**: Even with perfect code, a treasury system is only as safe as its key management, monitoring, and operational processes.
