<div align="center">

# 🏛️ Citadel — Zero-Trust Corporate Treasury for Autonomous Agents

> **Scoped on-chain permissions, Venice AI compliance gates, and wallet-signed CFO approvals — built on MetaMask Smart Accounts.**

[![MetaMask Smart Accounts](https://img.shields.io/badge/MetaMask-Smart%20Accounts%20Kit-F6851B?style=for-the-badge&logo=metamask&logoColor=white)](https://docs.metamask.io/smart-accounts-kit/)
[![Venice AI](https://img.shields.io/badge/AI-Venice%20Inference-8B5CF6?style=for-the-badge)](https://venice.ai/)
[![Ethereum Sepolia](https://img.shields.io/badge/Chain-Sepolia-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)](https://sepolia.etherscan.io/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Register → Run → Deliver** — the audited pipeline for AI agents that spend corporate treasury.

[Live Demo Path](#-demo) · [Quick Start](#-quick-start) · [Venice AI](#-venice-ai-integration) · [Architecture](#️-architecture-diagram) · [MetaMask Feedback](feedback.md)

</div>

---

## ⏱️ How Citadel Works in 10 Seconds

Citadel turns corporate treasury into a **gated, auditable agent runtime**:

1. **CFO registers an agent** and grants **ERC-7715 Advanced Permissions** via MetaMask (scoped USDC limits).
2. ↓ **Session account** receives delegation rights — agents never hold the treasury key.
3. ↓ **Agent cycle runs** — observe state → Venice think → **fail-closed audit**.
4. ↓ **Autonomy policy** routes high-value spends to the **CFO approval queue**.
5. ↓ **CFO signs EIP-712** approval from an allowlisted wallet.
6. ↓ **ERC-7710 delegation** executes USDC transfer on **Sepolia** with full audit trail.

---

## ⚡ Quick Start

Get Citadel running locally in under 2 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/IrrhammCode/citadel.git
cd citadel

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit: VENICE_API_KEY, SESSION_ACCOUNT_PRIVATE_KEY (see Environment Variables)

# 4. Start infrastructure (recommended)
npm run infra:up
npm run db:migrate

# 5. Run the app
npm run dev
```

Open **http://localhost:3000** → `/register-agent` → `/agent-dashboard` → `/dashboard`

> **MetaMask:** Advanced Permissions require [MetaMask Flask 13.5+](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/) on **Sepolia**.

---

## 🌍 Project Overview

**What is Citadel?**  
Citadel is a zero-trust corporate treasury control plane where autonomous AI agents operate under **MetaMask Advanced Permissions (ERC-7715)**. Every spend proposal passes through **Venice AI** compliance auditing before optional on-chain execution via **ERC-7710 delegation**.

**Why does it exist?**  
AI agents are already making financial decisions — but treasuries still approve wires manually. Citadel bridges that gap with **scoped permissions**, **AI audit gates**, and **cryptographic CFO approvals** instead of blind automation.

**Who is it for?**  
- CFOs and finance teams who need guardrails for agent spending  
- Developers building **Best Agent** / autonomous treasury systems  
- Hackathon teams integrating **MetaMask Smart Accounts Kit** + **Venice AI**

**How is it different?**  
Citadel separates **permission grant** (CFO MetaMask) from **execution** (session EOA) from **policy** (Venice + autonomy config) from **human override** (EIP-712 signed approvals). No single button moves funds without a logged decision chain.

---

## 📂 Repository Structure & Key Modules

Citadel is a unified Next.js monorepo with a server-authoritative agent runtime.

| Module | Path | Description |
|--------|------|-------------|
| **Register Agent** | [`/register-agent`](./app/register-agent/page.tsx) | 5-step wizard: identity → mandate → policy → ERC-7715 grant → activate |
| **Agent Runtime** | [`lib/agent/server-cycle.ts`](./lib/agent/server-cycle.ts) | Server-side observe → think → audit → autonomy → execute pipeline |
| **MetaMask Integration** | [`lib/metamask/`](./lib/metamask/) | ERC-7715 grant, ERC-7710 delegated USDC execution, permission normalization |
| **Venice Gateway** | [`lib/venice/service.ts`](./lib/venice/service.ts) | Unified AI gateway with fail-closed audit and usage metering |
| **CFO Approvals** | [`lib/approval/signature.ts`](./lib/approval/signature.ts) | EIP-712 typed data signatures + allowlist verification |
| **Server Store** | [`lib/server/store.ts`](./lib/server/store.ts) | Postgres/file-backed state with optimistic locking |
| **Scheduler** | [`app/api/cron/agent-ticks`](./app/api/cron/agent-ticks/route.ts) | Redis ZSET cron for distributed agent cycles |
| **E2E Tests** | [`e2e/pipeline.spec.ts`](./e2e/pipeline.spec.ts) | Playwright: register → cycle → wallet-signed approval |
| **MetaMask Feedback** | [`feedback.md`](./feedback.md) | **Primary reference doc** — SDK issues, official URLs, Citadel workarounds |
| **Venice AI Stack** | [`lib/venice/`](./lib/venice/) | Gateway, audit, x402, RPC, prompts — see [Venice Integration](#-venice-ai-integration) |

---

## 🚨 Problem Statement

Autonomous agents and AI treasuries face a trust and control crisis:

- **Unscoped automation:** Agents with hot-wallet keys can drain treasuries with no policy boundary.
- **Black-box AI spends:** Models propose transfers without immutable compliance reasoning.
- **Manual CFO bottlenecks:** Every micro-payment still needs human review — killing agent utility.
- **No on-chain permission model:** Traditional `approve()` patterns don't express *daily limits*, *mandates*, or *revocable agent scope*.
- **Weak audit trails:** Finance teams can't reconstruct *why* a payment was approved or blocked.

---

## 💡 Solution

Citadel replaces blind trust with a **layered zero-trust pipeline**:

- **ERC-7715 Advanced Permissions:** CFO grants time-bound, amount-scoped USDC authority to a session account via MetaMask ([docs](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/)).
- **Venice AI fail-closed audit:** No Venice verdict → no spend. Reasoning, confidence, and flags are persisted ([`VeniceService.audit`](./lib/venice/service.ts)).
- **Supervised autonomy:** Configurable thresholds route high-value spends to CFO queue before execution.
- **EIP-712 wallet approvals:** CFO decisions are cryptographic signatures, not database toggles ([`lib/approval/signature.ts`](./lib/approval/signature.ts)).
- **ERC-7710 delegation:** Session account redeems permissions on-chain without custody transfer ([`lib/metamask/execute.ts`](./lib/metamask/execute.ts)).
- **Server-authoritative state:** Postgres + Redis for production; unified store API for agents, audits, and permissions.

---

## 💎 Key Features

- **Unified agent registration wizard** with mandate, KPIs, Venice policy, and MetaMask permission grant
- **Autonomous agent cycles** — observe → think → audit → autonomy → execute
- **CFO approval queue** with wallet-signed approve / reject (EIP-712)
- **Live dashboard** — activity feed, budget pool, stats, pending approvals
- **Full audit log** — every Venice verdict with reasoning and flags
- **Agent lifecycle controls** — stop loop, emergency stop, revoke permission, remove agent
- **Slack notifications** for pending approvals, resolutions, and permission expiry alerts
- **Production infra** — Postgres, Redis scheduler, API auth, rate limits, cron ticks
- **Playwright E2E** — enterprise pipeline test with mocked Venice option

---

## 🧠 Venice AI Integration

Citadel treats **Venice AI** as the compliance brain of the treasury — not a chat sidebar. Every autonomous spend passes through a **unified server gateway** (`VeniceService`) with **fail-closed** semantics: if Venice is unavailable, misconfigured, or over budget, the spend is **blocked**, never silently approved.

**Official Venice resources:** [venice.ai](https://venice.ai/) · [Venice API](https://docs.venice.ai/) · [x402 client (`venice-x402-client`)](https://www.npmjs.com/package/venice-x402-client)

### Venice in the Agent Pipeline

```text
runServerCycle(systemId)
    │
    ├─► VeniceService.agentThink()     ← proposes actions (spend, wait, report, …)
    │
    └─► for each spend action:
            VeniceService.audit()      ← fail-closed compliance gate
                ├─ patternAnalysis
                ├─ vendorRisk
                ├─ on-chain verify (Venice Crypto RPC)
                ├─ Tatum malicious-address check
                └─ tx simulation
            → appendServerAudit()        ← persisted verdict + reasoning
            → autonomy / CFO queue     ← only if audit passes
            → executeDelegatedTransfer ← on-chain (MetaMask ERC-7710)
```

| Stage | Venice role | Code evidence |
|-------|-------------|---------------|
| **Think** | Agent proposes next actions from treasury state + CFO policy | [`server-cycle.ts` (L469)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L469) · [`VeniceService.agentThink` (L128)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L128) |
| **Audit** | Fail-closed gate before any spend | [`server-cycle.ts` (L203)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L203) · [`auditSpend` (L158)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L158) |
| **Report** | Auto-generated CFO weekly summaries | [`report-trigger.ts` (L45)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/report-trigger.ts#L45) · [`VeniceService.generateAgentReport` (L181)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L181) |
| **Chat** | CFO conversational insights in agent dashboard | [`venice-chat.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/agent/venice-chat.tsx) · [`POST /api/venice/chat`](https://github.com/IrrhammCode/citadel/blob/main/app/api/venice/chat/route.ts) |
| **Billing** | Token + USD usage metering | [`appendVeniceUsage` (L188)](https://github.com/IrrhammCode/citadel/blob/main/lib/server/store.ts#L188) · [`GET /api/billing`](https://github.com/IrrhammCode/citadel/blob/main/app/api/billing/route.ts) |

---

### Layer 1 — `VeniceService` Gateway (single entry point)

All server-side Venice calls route through [`lib/venice/service.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts):

| Method | Purpose | Implementation link |
|--------|---------|---------------------|
| `healthCheck()` | Preflight + latency probe | [L70](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L70) |
| `audit()` | **Fail-closed** spend compliance gate | [L90](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L90) |
| `agentThink()` | Autonomous decision generation | [L128](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L128) |
| `generateAgentReport()` | CFO narrative reports | [L181](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L181) |
| `negotiate()` | Inter-agent budget negotiation verdict | [L197](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L197) |
| `vendorSearch()` | Vendor / address risk search | [L214](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L214) |
| `chat()` | Open-ended CFO / operator chat | [L226](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L226) |
| `generateVisual()` | Treasury visual intelligence (flux-dev) | [L247](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L247) |

**Fail-closed policy** — when Venice is down or unconfigured, audit returns `decision: "blocked"`:

- [`failClosedVerdict()` (L50)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L50) — builds blocked verdict with `venice_unavailable` flag
- [`audit()` early exit (L94)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L94) — blocks all spends if no API key / x402 wallet
- [`audit()` catch path (L120)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L120) — blocks on Venice error after optional fallback
- **Unit test:** [`service.test.ts` (L25)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.test.ts#L25) — `blocks audit when Venice not configured`

---

### Layer 2 — `VeniceClient` (OpenAI-compatible API)

[`lib/venice/client.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts) wraps `https://api.venice.ai/api/v1`:

| Capability | Evidence |
|------------|----------|
| OpenAI SDK + Venice base URL | [L179–182](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L179) |
| Response cache (5 min TTL) | [L79–124](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L79) |
| Exponential backoff retry (429/5xx) | [L135–263](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L135) |
| `chatJSON` + Zod schema validation | [L271–319](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L271) |
| Structured `VeniceClientError` codes | [L399–408](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L399) |
| `isVeniceConfigured()` — API key **or** x402 | [L429](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L429) |
| Basic compliance audit | [`auditSpendRequest` (L467)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L467) |
| **Enhanced audit** (patterns + vendor + on-chain) | [`auditEnhanced` (L506)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L506) |
| Spending pattern analysis | [`analyzePatterns` (L653)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L653) |
| Rule-based anomaly detection | [`detectAnomalies` (L710)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L710) |
| Weekly CFO report generation | [`generateReport` (L798)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L798) |
| Budget negotiation evaluation | [`evaluateNegotiation` (L852)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L852) |
| Vendor web risk search | [`searchVendor` (L905)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L905) |
| Image generation (`flux-dev`) | [`generateTreasuryVisual` (L982)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L982) |

**Enhanced audit enrichment** inside `auditEnhanced` automatically attaches:

- **On-chain recipient check** via Venice Crypto RPC — [L518–527](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L518) → [`verifyAddressOnChain`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L117)
- **Tatum malicious-address intelligence** — [L529–545](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L529)
- **ERC-20 transfer simulation** — [L547–563](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L547)
- **CFO custom policy injection** — `policy.customCFORule` from register wizard — [L613–617](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L613)

---

### Layer 3 — Compliance Prompts

[`lib/venice/prompts.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/prompts.ts):

| Artifact | Link |
|----------|------|
| `COMPLIANCE_SYSTEM_PROMPT` — zero-trust CFO firewall persona | [L3](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/prompts.ts#L3) |
| `buildComplianceUserPrompt()` — structured spend + permission JSON | [L25](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/prompts.ts#L25) |
| Injected at registration as `customPrompt` | [`register-agent-wizard.tsx` (L60)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/register-agent-wizard.tsx#L60) |
| Passed into audit from server cycle | [`server-cycle.ts` (L214)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L214) |

---

### Layer 4 — Agent Brain (Think + Critique Loop)

[`lib/agent/brain.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts) calls Venice for autonomous reasoning:

| Step | Evidence |
|------|----------|
| `thinkWithMetrics()` — primary decision | [L187](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L187) |
| State enrichment + vendor research | [L195](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L195) |
| `callVeniceAIWithMetrics()` — x402 first, API key fallback | [L243](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L243) |
| **Second-pass risk critique** (conservative override) | [L216–229](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L216) |
| Decision cache (hash of state) | [L190–193](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L190) |
| Zod-validated `AgentDecision` schema | [L47–60](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L47) |
| Vendor search integration | [L4](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L4) → [`lib/venice/search.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/search.ts) |

---

### Layer 5 — Authentication & Billing

**Dual auth** — API key (`VENICE_API_KEY`) or wallet-based x402 (`X402_WALLET_KEY`):

| Component | Evidence |
|-----------|----------|
| x402 client wrapper | [`lib/venice/x402.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/x402.ts) |
| `getVeniceX402Client()` — SIWE wallet auth | [L13](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/x402.ts#L13) |
| `veniceX402Chat()` — wallet-paid inference | [L46](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/x402.ts#L46) |
| `ensureVeniceBudget()` — x402 balance + cap gate | [`inference.ts` (L15)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/inference.ts#L15) |
| `X402_BUDGET_USD` spend cap | [L24](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/inference.ts#L24) |
| x402 path in enhanced audit | [`client.ts` (L629)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L629) |
| Env helpers `getVeniceAuthMethod()` | [`lib/env.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/env.ts) |
| Usage persisted per inference | [`trackUsage` (L31)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L31) → `store.veniceUsage[]` |
| Billing dashboard UI | [`app/billing/page.tsx`](https://github.com/IrrhammCode/citadel/blob/main/app/billing/page.tsx) |
| Billing API (budget, spent, x402 balance) | [`app/api/billing/route.ts`](https://github.com/IrrhammCode/citadel/blob/main/app/api/billing/route.ts) |

---

### Layer 6 — Venice Crypto RPC

[`lib/venice/rpc.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts) — blockchain reads via `https://api.venice.ai/api/v1/crypto/rpc`:

| Function | Link |
|----------|------|
| `veniceRPC()` — generic JSON-RPC proxy | [L26](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L26) |
| `getETHBalance()` | [L66](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L66) |
| `getUSDCBalance()` — ERC-20 `balanceOf` | [L88](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L88) |
| `verifyAddressOnChain()` — used in audit enrichment | [L117](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L117) |
| Supported networks list | [L146](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L146) |

---

### Layer 7 — HTTP API Routes

| Endpoint | Method | Venice usage | Code |
|----------|--------|--------------|------|
| `/api/audit-enhanced` | POST | Direct `VeniceService.audit` | [`route.ts` (L41)](https://github.com/IrrhammCode/citadel/blob/main/app/api/audit-enhanced/route.ts#L41) |
| `/api/agent/think` | POST | `VeniceService.agentThink` | [`route.ts` (L63)](https://github.com/IrrhammCode/citadel/blob/main/app/api/agent/think/route.ts#L63) |
| `/api/venice/chat` | POST | `VeniceService.chat` | [`route.ts` (L25)](https://github.com/IrrhammCode/citadel/blob/main/app/api/venice/chat/route.ts#L25) |
| `/api/venice/health` | GET | Health + usage stats | [`route.ts` (L7)](https://github.com/IrrhammCode/citadel/blob/main/app/api/venice/health/route.ts#L7) |
| `/api/billing` | GET | x402 balance + inference costs | [`route.ts`](https://github.com/IrrhammCode/citadel/blob/main/app/api/billing/route.ts) |
| `/api/report` | POST | `generateReport` | [`route.ts`](https://github.com/IrrhammCode/citadel/blob/main/app/api/report/route.ts) |
| `/api/negotiate` | POST | `evaluateNegotiation` | [`route.ts`](https://github.com/IrrhammCode/citadel/blob/main/app/api/negotiate/route.ts) |
| `/api/suggestions` | POST | Venice-powered treasury suggestions | [`route.ts`](https://github.com/IrrhammCode/citadel/blob/main/app/api/suggestions/route.ts) |
| `/api/env/preflight` | GET | `VeniceService.healthCheck` in readiness | [`route.ts` (L14)](https://github.com/IrrhammCode/citadel/blob/main/app/api/env/preflight/route.ts#L14) |
| `/api/audit` | POST | **410 Gone** → migrated to audit-enhanced | [`route.ts` (L4)](https://github.com/IrrhammCode/citadel/blob/main/app/api/audit/route.ts#L4) |

---

### Layer 8 — UI Surfaces

| UI | Venice feature | Code |
|----|----------------|------|
| Register wizard — **Venice AI Compliance Rule** textarea | CFO policy → `customPrompt` → audit | [`register-agent-wizard.tsx` (L304)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/register-agent-wizard.tsx#L304) |
| Agent dashboard — **Venice Chat** | CFO Q&A over treasury context | [`venice-chat.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/agent/venice-chat.tsx) |
| Dashboard — **Venice Suggestions** | AI treasury recommendations | [`venice-suggestions.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/agent/venice-suggestions.tsx) |
| Audit log — verdict panels | Displays Venice reasoning + flags | [`audit-verdict-panel.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/audit/audit-verdict-panel.tsx) · [`enhanced-verdict-panel.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/audit/enhanced-verdict-panel.tsx) |
| System detail — **Report Viewer** | Venice-generated CFO report | [`report-viewer.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/agent/report-viewer.tsx) |
| Negotiation panel | Inter-agent budget AI verdict | [`negotiation-panel.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/agent/negotiation-panel.tsx) |
| Billing page | Live inference cost tracking | [`billing/page.tsx`](https://github.com/IrrhammCode/citadel/blob/main/app/billing/page.tsx) |
| Env preflight banner | Venice health in dashboard | [`env-preflight.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/env/env-preflight.tsx) |
| Landing page | Venice as core intelligence pillar | [`landing-page.tsx` (L48)](https://github.com/IrrhammCode/citadel/blob/main/components/landing/landing-page.tsx#L48) |
| Live demo page | Steps reference `VeniceService.audit` | [`demo/page.tsx` (L89)](https://github.com/IrrhammCode/citadel/blob/main/app/demo/page.tsx#L89) |

---

### Layer 9 — Resilience & Testing

| Mechanism | Purpose | Evidence |
|-----------|---------|----------|
| **B.AI fallback** | Secondary LLM if Venice primary fails | [`lib/fallback/bai.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/fallback/bai.ts) · wired in [`service.ts` (L109)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L109) |
| **E2E Venice mock** | Deterministic CI without live API | [`e2e-mock.ts` (L13)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/e2e-mock.ts#L13) · disabled in production [L6](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/e2e-mock.ts#L6) |
| **Vitest fail-closed tests** | Audit blocks when unconfigured | [`service.test.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.test.ts) |
| **Server cycle test** | Mocks Venice in unit tests | [`server-cycle.test.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.test.ts) |
| **Playwright E2E** | Full pipeline with `E2E_MOCK_VENICE=true` | [`pipeline.spec.ts` (L14)](https://github.com/IrrhammCode/citadel/blob/main/e2e/pipeline.spec.ts#L14) |
| Retry + circuit breaker (on-chain, not Venice) | Execution resilience after audit passes | [`execute.ts` (L47)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L47) |

---

### Layer 10 — Data Model & Persistence

Venice outputs are **never ephemeral** — they land in the server store:

| Data | Where persisted | Evidence |
|------|-----------------|----------|
| Audit verdicts | `store.auditLog[]` | [`server-cycle.ts` (L220)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L220) · [`appendServerAudit`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/store.ts#L152) |
| Agent decisions | `store.decisions[]` | [`appendServerDecision`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/store.ts#L174) |
| Inference usage | `store.veniceUsage[]` | [`store-types.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/store-types.ts) · [`appendVeniceUsage`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/store.ts#L188) |
| CFO reports | `store.reports[]` | [`report-trigger.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/report-trigger.ts) |
| Audit log UI (server-first) | [`audit-log-table.tsx`](https://github.com/IrrhammCode/citadel/blob/main/components/audit/audit-log-table.tsx) | polls `/api/store` |

---

### Venice Environment Variables

```ini
# Primary auth (pick one)
VENICE_API_KEY=vapi_...
X402_WALLET_KEY=0x...              # wallet-based x402 auth

# Model & budget
VENICE_MODEL=llama-3.3-70b
X402_BUDGET_USD=50

# CI / E2E only (never production)
E2E_MOCK_VENICE=true

# Optional fallback if Venice primary fails
FALLBACK_BAI_API_KEY=...
FALLBACK_BAI_MODEL=llama-3.1-70b
```

Configured in [`.env.local.example`](https://github.com/IrrhammCode/citadel/blob/main/.env.local.example) · validated in [`lib/env.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/env.ts) · checked at boot via [`instrumentation.ts`](https://github.com/IrrhammCode/citadel/blob/main/instrumentation.ts).

---

## 🏆 Hackathon Challenge Response

Citadel targets **MetaMask Smart Accounts** + **Venice AI** + **Autonomous Agent Treasury** tracks.

**5W1H summary:**

| | |
|---|---|
| **What** | A zero-trust treasury where AI agents spend USDC under ERC-7715 permissions, Venice audit, and CFO signatures |
| **Why** | Enterprises need agents that *can* spend — but only within provable, revocable, auditable bounds |
| **Who** | CFOs, treasury ops, and developers building agentic finance on Ethereum |
| **Where** | Sepolia testnet · MetaMask Flask · Venice AI · Postgres/Redis backend |
| **When** | Audit runs **before** execution; CFO signature required **before** high-value on-chain transfer |
| **How** | `requestExecutionPermissions` → server cycle → `VeniceService.audit` → `serverNeedsApproval` → EIP-712 → `sendTransactionWithDelegation` |

<details>
<summary>🔎 Proof of Implementation (Code Evidence)</summary>

* **ERC-7715 Permission Grant:** [`register-agent-wizard.tsx` (L86)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/register-agent-wizard.tsx#L86) — `requestExecutionPermissions` with `erc20-token-periodic`
* **Permission Normalization:** [`normalize-permission.ts` (L10)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/normalize-permission.ts#L10) — maps grant response → `permissionContext` + `delegationManager`
* **ERC-7710 Delegated Execution:** [`execute.ts` (L92)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L92) — `sendTransactionWithDelegation` USDC transfer
* **Server Agent Cycle:** [`server-cycle.ts` (L463)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L463) — `runServerCycle` orchestration
* **Venice Fail-Closed Audit:** [`service.ts` (L90)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L90) — see [Venice AI Integration](#-venice-ai-integration)
* **Venice Think in Cycle:** [`server-cycle.ts` (L469)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L469)
* **Enhanced Audit API:** [`audit-enhanced/route.ts` (L41)](https://github.com/IrrhammCode/citadel/blob/main/app/api/audit-enhanced/route.ts#L41)
* **EIP-712 CFO Signature:** [`signature.ts` (L11)](https://github.com/IrrhammCode/citadel/blob/main/lib/approval/signature.ts#L11) — `Citadel Treasury` typed data domain
* **Approval Queue UI:** [`approval-queue.tsx` (L44)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/approval-queue.tsx#L44) — `signTypedDataAsync` + approve flow
* **API Security Middleware:** [`middleware.ts` (L12)](https://github.com/IrrhammCode/citadel/blob/main/middleware.ts#L12) — deprecated APIs return 410; mutations require auth
* **E2E Pipeline Test:** [`pipeline.spec.ts` (L14)](https://github.com/IrrhammCode/citadel/blob/main/e2e/pipeline.spec.ts#L14) — register → cycle → signed approval
* **MetaMask SDK Feedback:** [`feedback.md`](./feedback.md) — documented pain points with official doc links

</details>

---

## 🎨 Application Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — product overview and pipeline |
| `/register-agent` | Register agent + ERC-7715 permission wizard |
| `/agent-dashboard` | Start/stop agents, run cycles, Venice chat |
| `/dashboard` | Monitor results, approval queue, budget, permissions |
| `/audit-log` | Full Venice audit history |
| `/systems` | Agent registry and built-in templates |
| `/systems/[id]` | Agent detail, lifecycle, activity, reports |
| `/demo` | **Run Live Pipeline** — orchestrated end-to-end demo |
| `/billing` | Venice token usage and x402 metering |

---

## 🏗️ Architecture Diagram

```text
                         ┌─────────────────────────────────────┐
                         │           CFO (MetaMask)            │
                         │  requestExecutionPermissions        │
                         │         (ERC-7715 grant)            │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
┌──────────────┐    ┌──────────────────────────────────────────────────┐
│  /register   │───▶│              Citadel Server Store                 │
│   -agent     │    │         (Postgres / Redis / file)                 │
└──────────────┘    └────────────────────────┬─────────────────────────┘
                                              │
┌──────────────┐    ┌────────────────────────▼─────────────────────────┐
│ /agent-      │───▶│           runServerCycle (per agent)              │
│ dashboard    │    │  observe → Venice think → Venice audit (gate)     │
└──────────────┘    │       → autonomy policy → approval or execute    │
                    └───────┬────────────────────────────┬───────────────┘
                            │                            │
              ┌─────────────▼────────────┐    ┌──────────▼──────────────┐
              │      Venice AI Service      │    │   CFO Approval Queue   │
              │   audit · think · report    │    │   EIP-712 signature    │
              └─────────────┬────────────┘    └──────────┬──────────────┘
                            │                            │
                            └────────────┬───────────────┘
                                         ▼
                         ┌─────────────────────────────────────┐
                         │     Session EOA (server-side)       │
                         │  sendTransactionWithDelegation      │
                         │         (ERC-7710 redeem)           │
                         └─────────────────┬───────────────────┘
                                           ▼
                         ┌─────────────────────────────────────┐
                         │   Sepolia USDC Transfer On-Chain    │
                         └─────────────────────────────────────┘
```

**Architecture breakdown:**

1. **CFO** grants scoped ERC-7715 permission to a **session account** (not the agent's key).
2. **Citadel store** persists permissions, autonomy config, audit log, and agent state.
3. **Agent cycle** proposes actions; **Venice** audits fail-closed.
4. **Autonomy policy** auto-approves low-risk spends or queues CFO review.
5. **CFO** signs EIP-712 approval from an allowlisted address.
6. **Session account** redeems delegation and executes USDC `transfer` on Sepolia.

---

## ⚙️ Protocol Execution Flow

End-to-end lifecycle of one agent spend:

1. **Register:** CFO completes wizard — identity, mandate, Venice policy, MetaMask ERC-7715 grant, `syncToServer()`.
2. **Schedule:** Agent loop starts via `POST /api/agent/loop` or cron `/api/cron/agent-ticks`.
3. **Observe:** Server loads treasury state, permissions, memory, and knowledge for the agent.
4. **Think:** `VeniceService.agentThink` proposes actions (spend, wait, report, etc.).
5. **Audit:** `VeniceService.audit` evaluates each spend — decision, confidence, flags, reasoning.
6. **Autonomy:** `serverNeedsApproval` checks thresholds; may create pending approval + Slack alert.
7. **CFO Sign:** Wallet signs EIP-712 `ApprovalDecision`; server verifies signer against `CFO_ALLOWED_SIGNERS`.
8. **Execute:** `executeDelegatedTransfer` calls `sendTransactionWithDelegation` with normalized permission context.
9. **Deliver:** Audit record, activity event, trust score update, and dashboard sync.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | **Next.js 16** · React 19 · Tailwind | App Router UI, wizard, dashboards |
| Wallet | **wagmi** · **viem** · MetaMask Flask | Connect, sign, typed data |
| Smart Accounts | **@metamask/smart-accounts-kit** | ERC-7715 grant · ERC-7710 delegation |
| AI | **Venice AI** · x402 client | Audit, think, reports, chat |
| Backend | **Next.js API Routes** | Agent loop, store, autonomy, webhooks |
| Database | **PostgreSQL** | Durable server store with versioning |
| Cache / Queue | **Redis** | Cron scheduler, rate limits, SSE pub/sub |
| Auth | **CITADEL_API_SECRET** · EIP-712 | API mutation guard + CFO signatures |
| Testing | **Vitest** · **Playwright** | Unit + E2E pipeline |
| Infra | **Docker Compose** | Local Postgres + Redis |

### 🔍 Source Code Evidence per Technology

**MetaMask Smart Accounts (ERC-7715 / ERC-7710)**

- [`wallet-client.ts` (L18)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/wallet-client.ts#L18) — `erc7715ProviderActions` + `erc7710WalletActions`
- [`register-agent-wizard.tsx` (L86)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/register-agent-wizard.tsx#L86) — `requestExecutionPermissions`
- [`normalize-permission.ts` (L15)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/normalize-permission.ts#L15) — extract `context` / `delegationManager`
- [`execute.ts` (L52)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L52) — `executeDelegatedTransfer`
- [`session-account.ts` (L13)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/session-account.ts#L13) — server session EOA

**Venice AI** — full evidence in [Venice AI Integration](#-venice-ai-integration) (40+ code links)

**Agent Runtime**

- [`server-cycle.ts` (L463)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L463) — `runServerCycle`
- [`server-cycle.ts` (L333)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L333) — delegated spend execution path
- [`loop/route.ts`](https://github.com/IrrhammCode/citadel/blob/main/app/api/agent/loop/route.ts) — start / stop / PATCH cycle API

**Security & Approvals**

- [`signature.ts` (L29)](https://github.com/IrrhammCode/citadel/blob/main/lib/approval/signature.ts#L29) — `buildApprovalMessage`
- [`approvals-server.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/approvals-server.ts) — server approval + execute bridge
- [`api-guard.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/api-guard.ts) — auth + rate limit + hydrate
- [`middleware.ts` (L22)](https://github.com/IrrhammCode/citadel/blob/main/middleware.ts#L22) — mutation auth on `/api/*`

**Infrastructure**

- [`store.ts` (L42)](https://github.com/IrrhammCode/citadel/blob/main/lib/server/store.ts#L42) — `hydrateServerStore`
- [`postgres.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/backends/postgres.ts) — optimistic locking backend
- [`redis.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/server/redis.ts) — scheduler ZSET + rate limit
- [`001_init.sql`](https://github.com/IrrhammCode/citadel/blob/main/scripts/migrations/001_init.sql) — database schema

---

## 📁 Folder Structure

```text
citadel/
├── app/                      # Next.js App Router pages & API routes
│   ├── register-agent/       # Agent registration wizard
│   ├── agent-dashboard/      # Run / monitor agents
│   ├── dashboard/            # CFO monitor & approval queue
│   ├── audit-log/            # Venice audit history
│   ├── demo/                 # Live pipeline demo
│   └── api/                  # agent/loop, store, autonomy, cron, venice, …
├── components/               # UI: agent, dashboard, permissions, layout
├── lib/
│   ├── agent/                # server-cycle, autonomy, approvals, brain
│   ├── metamask/             # ERC-7715/7710 integration
│   ├── venice/               # AI gateway & prompts
│   ├── server/               # store, redis, postgres, api-guard
│   ├── approval/             # EIP-712 signatures
│   └── notifications/        # Slack webhooks
├── e2e/                      # Playwright tests + seed helpers
├── scripts/                  # DB migrations
├── feedback.md               # MetaMask Smart Accounts Kit feedback (primary reference doc)
└── docker-compose.yml        # Postgres + Redis
```

---

## 💻 Installation Guide

**Prerequisites:** Node.js 20+, Docker (recommended), MetaMask Flask on Sepolia.

```bash
git clone https://github.com/IrrhammCode/citadel.git
cd citadel
npm install
cp .env.local.example .env.local

# Infrastructure (recommended for production-like local dev)
npm run infra:up
npm run db:migrate

npm run dev
```

---

## 🔑 Environment Variables

Copy `.env.local.example` → `.env.local`.

### Local development (minimum)

```ini
VENICE_API_KEY=vapi_your_key_here
SESSION_ACCOUNT_PRIVATE_KEY=0x_your_sepolia_session_key
SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia
CFO_ALLOWED_SIGNERS=0xYourCfoWalletAddress

# Optional — mock Venice in CI/E2E
# E2E_MOCK_VENICE=true
```

### Production (required when `NODE_ENV=production`)

```ini
DATABASE_URL=postgresql://citadel:citadel@localhost:5432/citadel
REDIS_URL=redis://localhost:6379
CITADEL_API_SECRET=change_me_min_16_chars
CRON_SECRET=change_me_cron_secret
SESSION_ACCOUNT_PRIVATE_KEY=0x...
VENICE_API_KEY=...                    # or X402_WALLET_KEY
CFO_ALLOWED_SIGNERS=0x...,0x...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ONESHOT_WEBHOOK_SECRET=change_me_hmac
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Preflight health check: `GET /api/env/preflight` · Status: `GET /api/status` · Venice health: `GET /api/venice/health`

---

## 🚀 Running the Project

**Development:**

```bash
npm run dev          # http://localhost:3000
```

**Production build:**

```bash
npm run build
npm run start
```

**Infrastructure:**

```bash
npm run infra:up     # Docker: Postgres + Redis
npm run infra:down
npm run db:migrate
```

**Vercel cron:** `vercel.json` schedules `/api/cron/agent-ticks` every minute — set `CRON_SECRET` and send `Authorization: Bearer <CRON_SECRET>`.

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
npm test

# Lint
npm run lint

# E2E (Playwright — starts dev server)
E2E_MOCK_VENICE=true \
CITADEL_API_SECRET=ci-secret-min-16-chars \
CFO_ALLOWED_SIGNERS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
npm run test:e2e
```

**E2E covers:** seed agent → `PATCH /api/agent/loop` → pending approval → EIP-712 signed CFO approve.

---

## 📤 Deployment

```bash
# 1. Provision Postgres + Redis
# 2. Set all production env vars (see above)
# 3. Migrate
npm run db:migrate

# 4. Build & start
npm run build
npm run start

# Or deploy to Vercel
# - Configure env in project settings
# - Enable cron for agent-ticks
```

**Security model:**

- All `POST/PATCH/DELETE` on `/api/*` require `CITADEL_API_SECRET` or same-origin
- `apiGuard`: rate limit 120/min + store hydrate on mutations
- Deprecated scaffold APIs return **410 Gone**
- CFO approvals require EIP-712 signature + `CFO_ALLOWED_SIGNERS` allowlist
- Postgres optimistic locking on concurrent writes

---

## 📜 Example Audit Record

Every spend proposal produces a persisted Venice verdict:

```json
{
  "id": "audit-abc123",
  "systemId": "marketing-agent-001",
  "spendRequest": {
    "amount": "25",
    "token": "USDC",
    "recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "memo": "Q2 vendor invoice #1042"
  },
  "verdict": {
    "decision": "approved",
    "confidence": 0.94,
    "reasoning": "Verified vendor payment within daily limit and agent mandate.",
    "flags": []
  },
  "timestamp": 1717772400000
}
```

---

## 📊 Dashboard

The CFO dashboard (`/dashboard`) includes:

- **Env preflight** — Venice, session account, Postgres, Redis health
- **Pipeline guide** — Register → Run → Deliver progress
- **Approval queue** — pending spends with Sign & Approve (EIP-712)
- **Stats cards** — active permissions, approved/blocked today
- **Activity feed** — server-synced agent events
- **Budget pool** — allocation across agents
- **Permission cards** — expiry countdown per agent

---

## 💼 Core Use Cases

- 🏢 **Corporate treasury agents** — marketing, payroll, devops spend within scoped limits
- 🤖 **Best Agent hackathon demos** — full register → run → approve → execute loop
- 🔐 **Zero-trust AI finance** — Venice audit gate before any on-chain movement
- 📋 **Compliance-ready audit** — immutable reasoning log for finance review
- 🔔 **Ops alerting** — Slack for pending approvals and permission expiry
- 🧪 **MetaMask Smart Accounts reference** — ERC-7715 + ERC-7710 integration patterns

---

## 🔭 Future Vision

- 🔑 **KMS / MPC session signer** — replace plain `SESSION_ACCOUNT_PRIVATE_KEY`
- ⛓️ **Mainnet deployment** — beyond Sepolia with audited permission flows
- 🧮 **On-chain simulation** — Tenderly / preflight before delegation redeem
- 🕸️ **Multi-chain treasury** — cross-chain budget pools (stub APIs exist)
- 📈 **Permission analytics** — health dashboard via `getGrantedExecutionPermissions`
- 🛡️ **On-chain revocation** — delegation manager disable flows documented in [feedback.md](./feedback.md)

---

## 🗺️ Roadmap

| Phase | Focus |
|-------|--------|
| **Phase 1 — Hackathon MVP** | Register → cycle → Venice audit → CFO approve → delegate execute on Sepolia |
| **Phase 2 — Production hardening** | KMS signer, monitoring, adversarial tests, mainnet pilot |
| **Phase 3 — Enterprise** | SSO, multi-tenant store, compliance exports, SOC2-oriented logging |
| **Phase 4 — Agent marketplace** | Third-party agent templates with isolated permission namespaces |

---

## 📝 MetaMask Smart Accounts Kit — Feedback

Citadel was built on **real ERC-7715 / ERC-7710 integration**, not mocks. During development we documented **10 actionable issues** with official doc links, reproduction steps, and Citadel workarounds.

**Read the full report:** [`feedback.md`](./feedback.md)

| # | Issue | Severity |
|---|-------|----------|
| 1 | Grant → redeem lifecycle not connected end-to-end | High |
| 2 | `permissionContext` / `delegationManager` extraction ambiguous | High |
| 3 | No structured SDK error taxonomy | Medium |
| 4 | TypeScript types vs runtime persistence mismatch | Medium |
| 5 | Flask + smart-account upgrade prerequisites unclear | Medium |
| 6 | Sepolia test asset friction | Low |
| 7 | On-chain permission revocation under-documented | High |
| 8 | Multi-agent permission inventory patterns missing | Medium |
| 9 | Conflicting permission request shapes in the wild | High |
| 10 | Advanced Permissions wallet UX for CFO signers | Medium |

**Citadel workarounds cited in feedback:**

- [`normalize-permission.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/normalize-permission.ts) — reverse-engineered delegation field extraction
- [`register-agent-wizard.tsx` (L86)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/register-agent-wizard.tsx#L86) — correct `erc20-token-periodic` grant shape
- [`permissions.ts` (L42)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/permissions.ts#L42) — example of **incorrect** schema we hit before aligning with official docs
- [`execute.ts` (L92)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L92) — `sendTransactionWithDelegation` redemption

**Official references used:** [Advanced Permissions concept](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/) · [Execute on user's behalf](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/) · [ERC-7715 Wallet Client API](https://docs.metamask.io/smart-accounts-kit/reference/advanced-permissions/wallet-client/) · [ERC-7710 delegation](https://docs.metamask.io/smart-accounts-kit/reference/erc7710/wallet-client/) · [EIP-7715](https://eips.ethereum.org/EIPS/eip-7715) · [EIP-7710](https://eips.ethereum.org/EIPS/eip-7710)

> Contributing MetaMask SDK feedback? Add findings to [`feedback.md`](./feedback.md) before opening issues upstream.

---

## 📚 Documentation Links

| Document | Description |
|----------|-------------|
| **[feedback.md](./feedback.md)** | **Primary reference** — MetaMask Smart Accounts Kit feedback with code + URL evidence |
| [Venice AI Integration](#-venice-ai-integration) | Full Venice stack in this README (gateway, audit, x402, UI, tests) |
| [docs/MAXIMIZED_CONCEPT.md](./docs/MAXIMIZED_CONCEPT.md) | Extended product concept |
| [Venice AI](https://venice.ai/) · [Venice Docs](https://docs.venice.ai/) | Official Venice platform |
| [MetaMask Advanced Permissions](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/) | Official ERC-7715 docs |
| [Execute on user's behalf](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/) | Official grant + redeem guide |
| [EIP-7715](https://eips.ethereum.org/EIPS/eip-7715) · [EIP-7710](https://eips.ethereum.org/EIPS/eip-7710) | Specifications |

---

## 🎥 Demo

**Recommended demo path:**

1. `/register-agent` — register agent + MetaMask ERC-7715 grant  
2. `/agent-dashboard` — start agent / run cycle  
3. `/dashboard` — approve pending spend (CFO wallet)  
4. `/audit-log` — review Venice verdicts  

**One-click demo:** `/demo` → **Run Live Pipeline**

```bash
# Or scripted E2E
E2E_MOCK_VENICE=true npm run test:e2e
```

> **Live URL / demo video:** add your deployed URL and recording here after submission.

---

## 🤝 Contributing

1. Fork the repo and create a branch from `main`.
2. Follow existing conventions — minimal diffs, server-first patterns for agent state.
3. Run `npm test` and `npm run lint` before opening a PR.
4. For MetaMask SDK issues, add findings to [`feedback.md`](./feedback.md).

---

## 🔐 Security Disclosure

Citadel can move **real testnet assets** via delegated permissions. **Do not deploy with mainnet funds without a full security audit.**

- Session private keys must be managed via a secrets manager in production deployments.
- Report vulnerabilities privately — do not open public issues for key-handling flaws.

---

## ⚠️ Known Limitations

- **Sepolia only** — mainnet not configured in this MVP.
- **Session key in env** — acceptable for hackathon; not institutional-grade custody.
- **Off-chain permission revoke** — app-level revoke; on-chain delegation disable needs further integration ([feedback.md](./feedback.md)).
- **MetaMask Flask required** — Advanced Permissions not available in standard extension yet.
- **Scaffold API stubs** — some routes (`/api/compliance`, `/api/defi`, etc.) return 410 or are legacy redirects.

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| Preflight red (Venice) | Set `VENICE_API_KEY` or `E2E_MOCK_VENICE=true` for local tests |
| Permission grant fails | Use MetaMask Flask 13.5+ on Sepolia; upgrade to smart account if prompted |
| `Invalid delegation permission` | Re-grant permission; check `normalize-permission.ts` fields in store |
| Cycle timeout in E2E | Use Postgres + Redis (`npm run infra:up`); Playwright timeout is 120s |
| CFO approve rejected | Connect wallet listed in `CFO_ALLOWED_SIGNERS` |
| Production boot fails | Set all required vars in `.env.local` — see `validateProductionEnv` in `lib/env.ts` |

---

## 📄 License

This repository is distributed under the **MIT License**. See `LICENSE` for details.

---

## 🙌 Credits

- **MetaMask Smart Accounts Kit** — ERC-7715 Advanced Permissions & ERC-7710 delegation
- **Venice AI** — inference, audit, and x402 metering
- **viem / wagmi** — Ethereum TypeScript tooling
- **Next.js** — full-stack application framework

---

<div align="center">

**Built with 🏛️ for autonomous treasuries that earn trust — not assume it.**

[⭐ Star on GitHub](https://github.com/IrrhammCode/citadel) · [MetaMask Feedback (feedback.md)](./feedback.md) · [Venice Integration](#-venice-ai-integration)

</div>
