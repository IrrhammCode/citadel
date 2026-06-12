# Citadel

Zero-trust corporate treasury platform — MetaMask Smart Accounts × Venice AI.

CFOs grant **ERC-7715 Advanced Permissions** to autonomous agents. Every spend is audited by **Venice AI** before optional on-chain execution via **ERC-7710 delegation**. High-value spends require **wallet-signed CFO approval** (EIP-712).

## Core Flow

1. **Register Agent** (`/register-agent`) — identity, mandate, ERC-7715 permission
2. **Run Agent** (`/agent-dashboard`) — autonomous observe → think → audit → execute cycles
3. **Monitor** (`/dashboard`) — live activity, pending approvals, reports
4. **Audit Log** (`/audit-log`) — full Venice decision history

## Tech Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS
- wagmi + viem + `@metamask/smart-accounts-kit`
- Venice AI · Postgres · Redis · EIP-712 CFO signatures

## Local Development

```bash
npm install
cp .env.local.example .env.local
npm run infra:up          # Postgres + Redis (optional but recommended)
npm run db:migrate
npm run dev
```

## Production Deploy

### Required environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for cron scheduler, SSE, rate limits |
| `CITADEL_API_SECRET` | Min 16 chars — protects all API mutations |
| `CRON_SECRET` | Bearer token for `/api/cron/agent-ticks` |
| `SESSION_ACCOUNT_PRIVATE_KEY` | Session EOA for ERC-7710 execution |
| `VENICE_API_KEY` or `X402_WALLET_KEY` | Venice AI inference |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

### Recommended production

| Variable | Description |
|----------|-------------|
| `CFO_ALLOWED_SIGNERS` | Comma-separated CFO wallet addresses |
| `SLACK_WEBHOOK_URL` | Slack notifications for approval queue |
| `ONESHOT_WEBHOOK_SECRET` | HMAC secret for `/api/webhook/oneshot` |
| `CITADEL_REQUIRE_WALLET_APPROVAL` | `true` (default in production) |

### Deploy steps

```bash
npm run infra:up
npm run db:migrate
npm run build
npm run start
```

Set `NODE_ENV=production`. Preflight check: `GET /api/env/preflight`.

Vercel: configure `vercel.json` cron → `/api/cron/agent-ticks` with `CRON_SECRET` header.

### Security model

- All `POST/PATCH/DELETE` on `/api/*` require `CITADEL_API_SECRET` or same-origin
- `apiGuard` adds rate limiting (120/min) + store hydrate on mutations
- Deprecated scaffold APIs return **410 Gone** via middleware
- CFO approvals require EIP-712 wallet signature; optional address allowlist
- Postgres optimistic locking prevents concurrent write conflicts

## Testing

```bash
npm test                  # Vitest unit tests
npm run test:e2e          # Playwright (provide real VENICE_API_KEY for full integration tests)
```

## Demo Path

`/register-agent` → `/agent-dashboard` → `/dashboard` → approve pending spend → `/audit-log`

Or `/demo` → **Run Live Pipeline**
