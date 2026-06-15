# Citadel — MetaMask Smart Accounts Kit Feedback

> **Track:** Best Feedback  
> **Project:** [Citadel](https://github.com/IrrhammCode/citadel) — zero-trust corporate treasury (MetaMask Smart Accounts × Venice AI)  
> **Kit version tested:** `@metamask/smart-accounts-kit@^1.6.0` · `venice-x402-client@^0.2.0`  
> **Chain:** Ethereum Sepolia  
> **Last updated:** 2026-06-07  

---

## Executive Summary

While building Citadel — a multi-agent treasury where CFOs grant **ERC-7715 Advanced Permissions** and agents execute via **ERC-7710 delegation**, with every spend gated by **Venice AI** — we successfully shipped a production-oriented flow (register → run → audit → approve → execute). However, documentation gaps, SDK ergonomics issues, and wallet/AI UX frictions added **days of reverse-engineering** that could have been avoided with clearer end-to-end guidance.

This document lists **observed issues** for **MetaMask Smart Accounts Kit** and **Venice AI**, with reproduction context, official references, and Citadel workarounds backed by file-level evidence.

---

## Environment & Reproduction

| Item | Value |
|------|--------|
| MetaMask | Flask **13.5.0+** required for Advanced Permissions ([docs](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/)) |
| Network | Sepolia (`chainId: 11155111`) |
| USDC (Sepolia) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` ([kit constants](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)) |
| Session account | Server-side EOA (`SESSION_ACCOUNT_PRIVATE_KEY`) as ERC-7715 `to` recipient |
| Citadel flow | `/register-agent` → `/agent-dashboard` → `/dashboard` → `/audit-log` |
| Live demo | `/demo` → **Run Live Pipeline** |

**Official entry points we relied on:**

- [Advanced Permissions concept](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/)
- [Execute on MetaMask user's behalf (full guide)](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)
- [ERC-7715 Wallet Client reference — `requestExecutionPermissions`](https://docs.metamask.io/smart-accounts-kit/reference/advanced-permissions/wallet-client/)
- [ERC-7710 Wallet Client reference — `sendTransactionWithDelegation`](https://docs.metamask.io/smart-accounts-kit/reference/erc7710/wallet-client/)
- [EIP-7715 specification](https://eips.ethereum.org/EIPS/eip-7715)
- [EIP-7710 specification](https://eips.ethereum.org/EIPS/eip-7710)
- [MetaMask Advanced Permissions announcement](https://metamask.io/news/introducing-advanced-permissions)

**Venice AI entry points we relied on:**

- [Venice AI](https://venice.ai/) · [Venice API docs](https://docs.venice.ai/)
- [venice-x402-client (npm)](https://www.npmjs.com/package/venice-x402-client)
- OpenAI-compatible base URL: `https://api.venice.ai/api/v1`
- Crypto RPC: `https://api.venice.ai/api/v1/crypto/rpc`

---

## Feedback Summary — MetaMask Smart Accounts Kit

| # | Category | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| 1 | Documentation | Grant → redeem lifecycle not connected in one runnable example | **High** | Open |
| 2 | Documentation | `permissionContext` / `delegationManager` extraction ambiguous at persistence boundary | **High** | Open |
| 3 | SDK | No structured error taxonomy for grant/redeem failures | Medium | Open |
| 4 | SDK | Return types exist but downstream persistence still requires defensive parsing | Medium | Open |
| 5 | DX | Flask + smart-account upgrade prerequisites easy to miss | Medium | Open |
| 6 | DX | No zero-to-working Sepolia treasury scaffold | Medium | Open |
| 7 | Security | On-chain revocation / disable-delegation path not documented for app developers | **High** | Open |
| 8 | Composability | Multi-agent permission inventory (`getGrantedExecutionPermissions`) under-documented | Medium | Open |
| 9 | Documentation | Conflicting / outdated permission request shapes across examples | **High** | Open |
| 10 | Wallet UX | Advanced Permissions prompt does not surface scope clearly to non-technical signers | Medium | Open |
| 11 | ERC-7715 | `dependencies[]` for undeployed accounts not handled in app examples | Medium | Open |
| 12 | Documentation | EOA session vs smart-account session — two redemption paths unclear | **High** | Open |
| 13 | DX | Split wallet clients (CFO MetaMask vs server session EOA) easy to miswire | Medium | Open |
| 14 | SDK | No delegation preflight / simulate before `sendTransactionWithDelegation` | Medium | Open |

## Feedback Summary — Venice AI

| # | Category | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| V1 | Documentation | No reference architecture for fail-closed treasury audit gates | **High** | Open |
| V2 | SDK / x402 | Token usage opaque on x402 path — billing requires heuristics | Medium | Open |
| V3 | Reliability | JSON schema drift forces multi-layer parse/retry in app code | Medium | Open |
| V4 | API surface | Enhanced compliance verdict schema is DIY (pattern + vendor + on-chain) | Medium | Open |
| V5 | Documentation | Crypto RPC is a separate surface from chat completions | Medium | Open |
| V6 | SDK | Web search not exposed as first-class API — apps fake it via chat | Medium | Open |
| V7 | API surface | Image generation (`flux-dev`) uses a different endpoint than chat | Low | Open |
| V8 | API design | `agentThink` throws but `audit` fail-closes — inconsistent zero-trust modes | Medium | Open |
| V9 | Documentation | No guide for multi-step agent → audit → human approval orchestration | **High** | Open |
| V10 | Ecosystem | No documented fallback / degraded-mode pattern for production agents | Medium | Open |

---

## MetaMask Smart Accounts Kit — Detailed Feedback

### 1. Grant → Redeem Lifecycle Not Connected End-to-End

**Category:** Documentation  
**Severity:** High  
**Component:** Smart Accounts Kit guides + ERC-7710 reference  

**Issue:**  
Official docs cover **requesting** permissions ([ERC-7715 guide](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)) and **redeeming** them ([ERC-7710 reference](https://docs.metamask.io/smart-accounts-kit/reference/erc7710/wallet-client/)) separately. There is no single, copy-pasteable repo path showing:

1. CFO grants `erc20-token-periodic` to a **session EOA**
2. App persists the grant response
3. Session EOA calls `sendTransactionWithDelegation` with extracted fields
4. App handles revert, expiry, and user rejection

**What we expected (per ERC-7710 reference):**

```typescript
// Docs state these must come from the permission response:
const permissionContext = permissionsResponse[0].context;
const delegationManager = permissionsResponse[0].delegationManager;

await walletClient.sendTransactionWithDelegation({
  chain,
  to: USDC_ADDRESS,
  data,
  permissionContext,
  delegationManager,
});
```

**What we had to build:**  
A full normalization layer because persisted/stored objects did not always expose `context` at the top level after JSON round-trips and array nesting.

**Citadel evidence:**

- Grant (correct kit shape): `components/agent/register-agent-wizard.tsx` (lines 86–103)
- Normalize grant response: `lib/metamask/normalize-permission.ts` (lines 10–44)
- Redeem via delegation: `lib/metamask/execute.ts` (lines 52–99)

**Suggestion:**  
Publish one **"Agent Treasury"** reference implementation: grant on MetaMask → store → redeem from session EOA → verify USDC transfer on Sepolia, with failure modes documented.

**Impact:**  
Blocks hackathon teams from shipping working delegations without reading SDK source and experimenting on-chain.

---

### 2. `permissionContext` / `delegationManager` Extraction at Persistence Boundary

**Category:** Documentation + SDK  
**Severity:** High  
**Component:** `GetGrantedExecutionPermissionsResult`, `sendTransactionWithDelegation`  

**Issue:**  
The kit types define the grant response as:

```typescript
// @metamask/smart-accounts-kit — PermissionResponse
{
  chainId, to, permission, /* ... */
  context: Hex;
  delegationManager: Address;
  dependencies: { factory, factoryData }[];
}
```

(Source: `node_modules/@metamask/smart-accounts-kit/dist/index-DUJmm8Wz.d.ts`, lines 129–136)

However, when we persist `grantedPermissions` to Postgres/localStorage and reload, we encountered multiple field shapes (`context`, `permissionContext`, nested `permission.context`, `delegationManagerAddress`). The ERC-7710 action expects `permissionContext` + `delegationManager` ([reference](https://docs.metamask.io/smart-accounts-kit/reference/erc7710/wallet-client/)).

**Citadel workaround:**

```typescript
// lib/metamask/normalize-permission.ts
const permissionContext =
  p.permissionContext || p.context || p.permission?.context;
const delegationManager =
  p.delegationManager || p.delegationManagerAddress;
```

**Failure mode we surface to users:**

```
Invalid delegation permission — missing permissionContext or delegationManager
```

(`lib/metamask/execute.ts`, lines 58–64)

**Suggestion:**

- Export a first-party helper: `extractDelegationFields(grant: PermissionResponse)`
- Document serialization rules (what is safe to `JSON.stringify` and reload)
- Document `dependencies[]` handling when session/smart accounts are not yet deployed ([EIP-7715 `dependencies`](https://eips.ethereum.org/EIPS/eip-7715))

**Impact:**  
Silent failures after app restart — permissions appear granted in UI but execution fails.

---

### 3. SDK Error Handling Gaps

**Category:** SDK  
**Severity:** Medium  
**Component:** `requestExecutionPermissions`, `sendTransactionWithDelegation`  

**Issue:**  
Errors from grant/redeem flows arrive as generic `Error` messages or JSON-RPC codes (`4001`, `-32002`, `-32603`). There is no typed discriminator for:

- User rejected permission
- Permission expired
- Invalid / revoked delegation
- Insufficient USDC balance
- Wrong session account
- Caveat enforcer revert

**Citadel workaround:**  
We implemented application-level error handling:

- `ExecutionError` with `code` field — `lib/metamask/execute.ts` (lines 28–45)
- `ResilienceCircuitBreaker` + retry — `lib/metamask/execute.ts` (lines 47–48, 88–102)
- MetaMask RPC code mapping — `lib/resilience/error-handler.ts` (lines 221–237)

**Suggestion:**  
Export `SmartAccountKitError` enum + `parseSmartAccountError(unknown)` consistent with [viem's `BaseError` pattern](https://viem.sh/docs/glossary/errors).

**Impact:**  
Hard to build CFO-friendly UX and automated retry without fragile string matching.

---

### 4. TypeScript Types vs Runtime Persistence

**Category:** SDK  
**Severity:** Medium  
**Component:** `@metamask/smart-accounts-kit/actions`  

**Issue:**  
The kit exports `GetGrantedExecutionPermissionsResult` and we use it in `types/permission.ts`. In practice, persistence and normalization still require `unknown` + manual casts because:

- Stored permissions are nested inside app-specific `StoredPermission` objects
- Array vs single-object grant responses differ by code path
- Legacy helper code used `walletClient: any` (`lib/metamask/permissions.ts`, line 38)

**Citadel evidence:**

- Typed import: `types/permission.ts` (line 1–12)
- Defensive cast: `lib/metamask/normalize-permission.ts` (line 13)
- `any` wallet client: `lib/metamask/permissions.ts` (line 37–38)

**Suggestion:**  
Ship `StoredPermission` / `SerializablePermissionResponse` types and a `serializePermissionResponse()` / `deserializePermissionResponse()` pair in the kit.

**Impact:**  
Type safety ends at the MetaMask popup; everything after is `as` casts and hope.

---

### 5. Local Development Prerequisites (Flask + Smart Account Upgrade)

**Category:** DX  
**Severity:** Medium  
**Component:** MetaMask Flask, Smart Account upgrade  

**Issue:**  
Advanced Permissions require MetaMask Flask **13.5.0+** ([docs](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/)). Flask **13.9.0+** can auto-upgrade users to a smart account during the permission flow; earlier versions require explicit upgrade first ([guide note](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)).

Citadel onboarding requires:

1. Install Flask (not production MetaMask extension)
2. Add Sepolia + fund ETH
3. Configure `SESSION_ACCOUNT_PRIVATE_KEY`
4. Fund session account with Sepolia USDC for delegated transfers
5. Extend viem client with `erc7715ProviderActions` + `erc7710WalletActions`

**Citadel evidence:**

- Wallet client setup: `lib/metamask/wallet-client.ts` (lines 18–29)
- Env template: `.env.local.example`
- Optional EIP-7702 upgrade UI: `components/agent/upgrade-7702.tsx`

**Suggestion:**  
`npx create-smart-account-app` with Flask detection, Sepolia faucet links, session key generator, and a health-check page.

**Impact:**  
First successful permission grant took **multiple hours** across Flask versions and upgrade sequencing.

---

### 6. Sepolia Faucet & Test Asset Friction

**Category:** DX  
**Severity:** Low  
**Component:** Testnet tooling  

**Issue:**  
Delegated USDC transfers require:

- Sepolia ETH (gas) on session EOA **or** relayer path
- Sepolia USDC in the **delegator's** MetaMask account

No kit-level guidance links Sepolia USDC faucet + minimum balances for a working demo.

**Suggestion:**  
Document minimum balances and link Sepolia USDC faucet in the Advanced Permissions quickstart.

---

### 7. Permission Revocation & Lifecycle (Security)

**Category:** Security / Documentation  
**Severity:** High  
**Component:** ERC-7710 `disableDelegation`, ERC-7715 expiry  

**Issue:**  
It is unclear from app-developer docs how to:

- Revoke a single agent permission without revoking others
- Disable an active delegation on-chain
- Determine whether a stored permission is still redeemable before execution
- Handle in-flight delegations after revocation

The kit exposes delegation manager actions in typings (`simulateDisableDelegation`, `executeDisableDelegation` in SDK dist), but Citadel could not find a clear **application-level** revocation recipe in the public guides.

**Citadel workaround (off-chain only):**

```typescript
// lib/metamask/permissions.ts — marks status locally; does NOT revoke on-chain
export function revokePermission(permission: GrantedPermission): GrantedPermission {
  return { ...permission, status: "revoked" };
}
```

We also added server-side lifecycle actions (`/api/agent/lifecycle`) for stop / emergency stop / revoke in app store — not on-chain revocation.

**Suggestion:**  
Document: **Grant → List (`getGrantedExecutionPermissions`) → Redeem → Expire → Disable delegation on-chain**, with code for `wallet_getGrantedExecutionPermissions` ([EIP-7715](https://eips.ethereum.org/EIPS/eip-7715)).

**Impact:**  
Security-critical gap for enterprise treasury — off-chain `"revoked"` is not sufficient for production.

---

### 8. Multi-Agent Permission Management

**Category:** Composability  
**Severity:** Medium  
**Component:** `getGrantedExecutionPermissions`, app-level namespacing  

**Issue:**  
Citadel runs **multiple autonomous agents** (marketing, devops, payroll, custom agents). Each needs:

- Distinct spending limits
- Mapping `systemId` → granted permission blob
- Audit trail per agent

The kit provides `getGrantedExecutionPermissions()` in `erc7715ProviderActions` ([Wallet Client reference](https://docs.metamask.io/smart-accounts-kit/reference/advanced-permissions/wallet-client/)), but there is no pattern for **namespaced permissions per agent** or correlating redeems to an app-level agent ID.

**Citadel evidence:**

- Per-agent mapping in `StoredPermission.systemId` — `types/permission.ts`
- Multi-agent store — `lib/server/store-types.ts` (`permissions[]`, `customSystems[]`)
- Lifecycle panel — `components/agent/agent-lifecycle-panel.tsx`

**Suggestion:**  
"Multi-agent treasury" guide: permission naming metadata, per-agent session accounts vs shared session account tradeoffs, bulk revoke.

---

### 9. Conflicting Permission Request Shapes in the Wild

**Category:** Documentation  
**Severity:** High  
**Component:** `requestExecutionPermissions` parameter schema  

**Issue:**  
The **official** request shape uses `chainId`, `expiry`, `to`, and `permission: { type: 'erc20-token-periodic', data: {...} }` ([reference](https://docs.metamask.io/smart-accounts-kit/reference/advanced-permissions/wallet-client/)).

Citadel initially implemented an **incorrect** alternative schema in `lib/metamask/permissions.ts`:

```typescript
// ❌ Does NOT match official kit API — our early mistake
{
  requiredMethods: ["eth_sendTransaction"],
  expiry: ...,
  permissions: [{ type: "contract-call", data: { ... } }],
  limits: { maxAmountPerTransaction, maxAmountPerDay },
  metadata: { systemId, systemName },
}
```

(`lib/metamask/permissions.ts`, lines 42–73)

The **working** implementation matches official docs in `register-agent-wizard.tsx`:

```typescript
// ✅ Matches official kit API
await walletClient.requestExecutionPermissions([{
  chainId: CHAIN_ID,
  expiry,
  to: sessionAddress,
  permission: {
    type: "erc20-token-periodic",
    data: { tokenAddress, periodAmount, periodDuration, justification },
    isAdjustmentAllowed: true,
  },
}]);
```

(`components/agent/register-agent-wizard.tsx`, lines 86–103)

**Root cause:**  
Without a single canonical schema in docs + starter templates, developers infer incorrect shapes from partial examples, blog posts, or pre-release snippets.

**Suggestion:**  
- Mark deprecated shapes clearly  
- Add JSON Schema validation errors client-side in the kit when `requestExecutionPermissions` params are malformed  

**Impact:**  
We lost time debugging permissions that never matched the Flask RPC handler.

---

### 10. Advanced Permissions Wallet UX for CFO Signers

**Category:** Wallet UX  
**Severity:** Medium  
**Component:** MetaMask Flask permission confirmation UI  

**Issue:**  
MetaMask's Advanced Permissions UI does not always present daily USDC limits, expiry, and recipient scope in a way non-technical CFOs can audit before signing ([product intent](https://metamask.io/news/introducing-advanced-permissions) vs on-screen clarity).

**Citadel workaround:**  
We built a **pre-flight wizard** that explains limits *before* the MetaMask popup:

- `components/agent/register-agent-wizard.tsx` — 5-step Identity → Mandate → Policy → Authorize → Activate
- Human-readable justification string passed to `permission.data.justification`

**Suggestion:**  
Permission confirmation screen should mirror wizard fields: **daily limit, token, period, expiry date, session account address, revocability**.

**Impact:**  
Enterprise adoption requires finance stakeholders to trust what they sign.

---

### 11. ERC-7715 `dependencies[]` Not Addressed in App Flows

**Category:** ERC-7715 spec / SDK  
**Severity:** Medium  
**Component:** `PermissionResponse.dependencies`  

**Issue:**  
[EIP-7715](https://eips.ethereum.org/EIPS/eip-7715) requires wallets to return a `dependencies[]` array when accounts involved in redemption are not yet deployed (`factory` + `factoryData`). Official kit types include this field ([`PermissionResponse`](https://github.com/IrrhammCode/citadel/blob/main/node_modules/@metamask/smart-accounts-kit/dist/index-DUJmm8Wz.d.ts) — `dependencies: { factory, factoryData }[]`), but guides focus on the happy path where the session account already exists.

Citadel grants to a **server-side session EOA** that must already be funded — we never handle `dependencies` deployment before first redemption.

**Citadel evidence:**

- Session account is a plain EOA — [`session-account.ts` (L13)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/session-account.ts#L13)
- Grant stores raw `grantedPermissions` without processing `dependencies` — [`register-agent-wizard.tsx` (L114)](https://github.com/IrrhammCode/citadel/blob/main/components/agent/register-agent-wizard.tsx#L114)
- Normalizer only extracts `context` / `delegationManager` — [`normalize-permission.ts` (L15)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/normalize-permission.ts#L15)

**Suggestion:**  
Document: when `dependencies.length > 0`, call bundler/deploy helper **before** first `sendTransactionWithDelegation`. Provide a typed `deployDependenciesIfNeeded(grant)` utility.

**Impact:**  
First redemption can fail opaquely on fresh session accounts if factory deployment was required but skipped.

---

### 12. EOA Session vs Smart Account Session — Two Redemption Paths

**Category:** Documentation  
**Severity:** High  
**Component:** `sendTransactionWithDelegation` vs `sendUserOperationWithDelegation`  

**Issue:**  
MetaMask docs state redemption depends on session account type: **EOA** uses `erc7710WalletActions` + `sendTransactionWithDelegation`; **smart account** uses bundler + `sendUserOperationWithDelegation` ([execute guide](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)).

Citadel uses a **server-side EOA session** only. Teams building smart-account sessions must maintain two execution stacks — the kit does not help choose or abstract this fork.

**Citadel evidence:**

- Session path: EOA + `sendTransactionWithDelegation` — [`execute.ts` (L81–99)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L81)
- CFO path: MetaMask provider + `erc7715ProviderActions` — [`wallet-client.ts` (L28)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/wallet-client.ts#L28)
- No bundler / userOp path implemented in repo

**Suggestion:**  
Decision tree in docs: *If session is EOA → X. If session is smart account → Y.* Include one repo example for each.

**Impact:**  
Developers pick the wrong redemption API and get confusing revert / RPC errors.

---

### 13. Split Wallet Clients (CFO vs Session) Wiring Complexity

**Category:** DX  
**Severity:** Medium  
**Component:** viem client extensions  

**Issue:**  
A full treasury app needs **two** differently extended clients:

| Role | Client | Extensions |
|------|--------|------------|
| CFO (browser) | MetaMask provider | `erc7715ProviderActions` + `erc7710WalletActions` |
| Session (server) | Private-key EOA | `erc7710WalletActions` only |

Misplacing extensions (e.g. calling `requestExecutionPermissions` from server) fails at runtime with unclear errors.

**Citadel evidence:**

- Browser client — [`wallet-client.ts` (L18–29)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/wallet-client.ts#L18)
- Server execution client — [`execute.ts` (L81–85)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L81)
- Legacy module still uses `walletClient: any` — [`permissions.ts` (L38)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/permissions.ts#L38)

**Suggestion:**  
Export `createCfoWalletClient()` and `createSessionExecutionClient()` from the kit with compile-time guards.

---

### 14. No Delegation Preflight Before Spend

**Category:** SDK  
**Severity:** Medium  
**Component:** `sendTransactionWithDelegation`  

**Issue:**  
Before moving treasury funds, apps need to know if delegation will revert (expired permission, wrong manager, insufficient delegator balance). The kit exposes delegation manager **simulate** helpers in typings (`simulateRedeemDelegations` in SDK dist) but Citadel found no clear **application-level** recipe tying simulate → `sendTransactionWithDelegation`.

**Citadel evidence:**

- We execute directly and handle revert post-hoc — [`execute.ts` (L106–117)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L106)
- Circuit breaker on repeated failures — [`execute.ts` (L47–48)](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts#L47)
- Venice audit runs pre-chain, MetaMask simulate does not — [`server-cycle.ts` (L203)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L203)

**Suggestion:**  
`preflightDelegatedTransfer({ permissionContext, delegationManager, call })` returning `{ ok, reason, gas }` before broadcast.

---

## Venice AI — Detailed Feedback

### V1. No Reference Architecture for Fail-Closed Treasury Audit

**Category:** Documentation  
**Severity:** High  
**Component:** Venice inference + compliance  

**Issue:**  
Financial agent systems need a documented **fail-closed** pattern: *if AI audit unavailable → block spend*. Venice docs cover chat completions and models, but not **autonomous treasury gates** where `blocked` is the safe default.

Citadel built this pattern from scratch in `VeniceService.audit()` — returning `decision: "blocked"` instead of throwing, so the agent cycle can continue without moving funds.

**Citadel evidence:**

- Fail-closed verdict builder — [`service.ts` (L50)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L50)
- Audit blocks when unconfigured — [`service.ts` (L94)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L94)
- Audit blocks on Venice error — [`service.ts` (L120)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L120)
- Wired in agent cycle before execution — [`server-cycle.ts` (L203)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L203)
- Unit test — [`service.test.ts` (L25)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.test.ts#L25)
- Compliance system prompt — [`prompts.ts` (L3)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/prompts.ts#L3)

**Suggestion:**  
Publish **"Zero-trust agent treasury with Venice"** guide: think → audit (fail-closed) → human approval → execute.

**Official refs:** [Venice docs](https://docs.venice.ai/) · [Venice AI](https://venice.ai/)

---

### V2. x402 Token Usage Opaque — Billing Requires Heuristics

**Category:** SDK / x402  
**Severity:** Medium  
**Component:** `venice-x402-client`  

**Issue:**  
When using `X402_WALLET_KEY`, Venice chat responses do not consistently expose `usage.total_tokens` in a way our stack could meter. Citadel falls back to **character-length / 4 estimates** or records `tokens: 0`.

**Citadel evidence:**

- x402 chat path returns raw string — [`x402.ts` (L46–59)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/x402.ts#L46)
- `veniceChatJSON` sets `tokens: 0` on x402 — [`inference.ts` (L103)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/inference.ts#L103)
- Brain estimates tokens from string length — [`brain.ts` (L259)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L259)
- Hardcoded report token estimate — [`service.ts` (L193)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L193) (`2500` tokens)
- Budget gate uses wallet USD balance — [`inference.ts` (L15)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/inference.ts#L15)
- Billing API surfaces x402 balance — [`app/api/billing/route.ts` (L18)](https://github.com/IrrhammCode/citadel/blob/main/app/api/billing/route.ts#L18)

**Suggestion:**  
x402 responses should include normalized `usage: { prompt_tokens, completion_tokens, total_tokens, cost_usd }` compatible with OpenAI schema.

---

### V3. JSON Schema Drift Forces Multi-Layer Parse/Retry

**Category:** Reliability  
**Severity:** Medium  
**Component:** Chat completions + `response_format: json_object`  

**Issue:**  
Venice models occasionally return markdown fences, truncated JSON, or extra prose despite `json_object` mode. Citadel implements **three** retry layers:

1. `VeniceClient.chatJSON` — parse fail → retry prompt ([`client.ts` (L291–317)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L291))
2. `parseDecision` — Zod fail → fix-up call ([`brain.ts` (L284–305)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L284))
3. B.AI fallback parse with regex JSON extract — [`service.ts` (L172)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L172)

**Citadel evidence:**

- Zod schemas for audit + agent decisions — [`client.ts` (L450)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L450) · [`brain.ts` (L75)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L75)
- Enhanced verdict schema — [`client.ts` (L487)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L487)

**Suggestion:**  
Ship `veniceStructuredOutput(schema)` with server-side schema enforcement (similar to OpenAI strict mode) for financial JSON contracts.

---

### V4. Enhanced Compliance Verdict Schema Is DIY

**Category:** API surface  
**Severity:** Medium  
**Component:** `auditEnhanced`  

**Issue:**  
For treasury use cases we needed more than `{ decision, reasoning, flags }` — we added `patternAnalysis`, `vendorRisk`, on-chain verification, Tatum intel, and tx simulation in one prompt. None of this is a documented Venice product primitive; we composed it manually.

**Citadel evidence:**

- Enhanced schema — [`client.ts` (L487–502)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L487)
- On-chain enrich via Venice Crypto RPC — [`client.ts` (L518–527)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L518)
- Tatum malicious check — [`client.ts` (L529–545)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L529)
- ERC-20 simulate — [`client.ts` (L547–563)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L547)
- Public API — [`app/api/audit-enhanced/route.ts` (L41)](https://github.com/IrrhammCode/citadel/blob/main/app/api/audit-enhanced/route.ts#L41)
- Legacy `/api/audit` returns 410 → migration — [`app/api/audit/route.ts` (L4)](https://github.com/IrrhammCode/citadel/blob/main/app/api/audit/route.ts#L4)

**Suggestion:**  
Offer a **Treasury Audit** template / JSON schema with optional enrichment hooks (address risk, simulation).

---

### V5. Crypto RPC Is a Separate Surface from Chat

**Category:** Documentation  
**Severity:** Medium  
**Component:** `https://api.venice.ai/api/v1/crypto/rpc`  

**Issue:**  
Venice Crypto RPC is powerful for audit enrichment but lives on a **different path and auth model** than chat completions. We discovered it through experimentation, not a unified SDK entry point.

**Citadel evidence:**

- RPC module — [`lib/venice/rpc.ts` (L7)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L7)
- `verifyAddressOnChain` used inside audit — [`rpc.ts` (L117)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L117)
- Supported networks list — [`rpc.ts` (L146)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L146)
- Requires `VENICE_API_KEY` (not x402 in our impl) — [`rpc.ts` (L32)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts#L32)

**Suggestion:**  
Single `@venice/sdk` with `chat()`, `rpc()`, `image()` and shared auth (API key + x402).

---

### V6. Web Search Not First-Class — Apps Simulate via Chat

**Category:** SDK  
**Severity:** Medium  
**Component:** Vendor risk / web search  

**Issue:**  
Citadel needs vendor legitimacy checks. Venice markets privacy-preserving search, but we found no stable typed search SDK — so we call `chat.completions.create` with a search prompt and cast `as never` to satisfy OpenAI types.

**Citadel evidence:**

- [`lib/venice/search.ts` (L33–58)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/search.ts#L33) — chat-as-search workaround
- Duplicate `searchVendor` in [`client.ts` (L905)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L905)
- Used in agent brain enrichment — [`brain.ts` (L4)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/brain.ts#L4)

**Suggestion:**  
Expose `venice.search({ query, mode: 'vendor' | 'address' })` returning `{ summary, sources, riskLevel }`.

---

### V7. Image API Separate from Chat Completions

**Category:** API surface  
**Severity:** Low  
**Component:** `POST /image/generations`  

**Issue:**  
Treasury visual reports use `flux-dev` via a **raw fetch** to `/api/v1/image/generations`, separate from the OpenAI client used for text.

**Citadel evidence:**

- [`client.ts` (L982–1018)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L982) — `generateTreasuryVisual`
- [`VeniceService.generateVisual` (L247)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L247)

**Suggestion:**  
Unify image generation under the same client with `client.images.generate({ model: 'flux-dev', ... })`.

---

### V8. Inconsistent Failure Modes — `agentThink` Throws vs `audit` Fail-Closes

**Category:** API design  
**Severity:** Medium  
**Component:** `VeniceService`  

**Issue:**  
For zero-trust treasuries, downstream code must know: *does this method throw or return a safe blocked state?*

| Method | On Venice outage |
|--------|------------------|
| `audit()` | Returns `decision: "blocked"` |
| `agentThink()` | **Throws** — cycle aborts |
| `chat()` | **Throws** — UI shows error |

**Citadel evidence:**

- Audit fail-closed — [`service.ts` (L90–125)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L90)
- Think throws if unconfigured — [`service.ts` (L140)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L140)
- Cycle calls think before audit — [`server-cycle.ts` (L469)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L469)
- E2E mock only for think — [`e2e-mock.ts` (L13)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/e2e-mock.ts#L13)

**Suggestion:**  
Document recommended patterns per method, or offer `VeniceService.safeThink()` returning `{ ok, decision?, error? }` mirroring audit.

---

### V9. No Orchestration Guide for Agent → Audit → Human Approval

**Category:** Documentation  
**Severity:** High  
**Component:** Multi-step agent pipelines  

**Issue:**  
Real treasuries need: **propose** (think) → **compliance** (audit) → **policy** (autonomy) → **human** (EIP-712) → **chain** (delegation). Venice docs do not show how inference steps compose with non-AI gates.

**Citadel evidence — full pipeline in one file:**

- [`server-cycle.ts` (L463)](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L463) — `runServerCycle`
- Think — [L469](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L469)
- Audit per spend action — [L158–218](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L158)
- Autonomy / approval queue — imports [`autonomy-server.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/autonomy-server.ts)
- CFO-approved path skips re-audit — [L423–437](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts#L423)
- Execute — [`execute.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/metamask/execute.ts)
- E2E test — [`e2e/pipeline.spec.ts` (L14)](https://github.com/IrrhammCode/citadel/blob/main/e2e/pipeline.spec.ts#L14)

**Suggestion:**  
Reference architecture diagram: Venice as **stateless compliance oracle** between agent planner and on-chain executor.

---

### V10. No Documented Fallback / Degraded-Mode Pattern

**Category:** Ecosystem  
**Severity:** Medium  
**Component:** Production reliability  

**Issue:**  
When Venice rate-limits or errors, production agents need a policy: block all spends (Citadel default) vs failover to secondary LLM. Venice does not document this; Citadel built **B.AI fallback** manually.

**Citadel evidence:**

- B.AI fallback module — [`lib/fallback/bai.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/fallback/bai.ts)
- Wired in audit — [`service.ts` (L109)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L109)
- Wired in think — [`service.ts` (L162)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts#L162)
- Settings UI documents fallback key — [`app/settings/page.tsx` (L105)](https://github.com/IrrhammCode/citadel/blob/main/app/settings/page.tsx#L105)
- Generic `veniceWithFallback` wrapper — [`error-handler.ts` (L207)](https://github.com/IrrhammCode/citadel/blob/main/lib/resilience/error-handler.ts#L207)

**Suggestion:**  
Document **supported degraded modes** for financial workloads: `fail_closed` (recommended), `fail_open` (discouraged), `secondary_provider`.

---

## Citadel Architecture (for context)

```
CFO MetaMask (delegator)
    │  requestExecutionPermissions (ERC-7715)
    ▼
Session EOA (SERVER)  ──►  sendTransactionWithDelegation (ERC-7710)
    │                              │
    ▼                              ▼
Citadel Store (Postgres)     USDC transfer on Sepolia
    │
    ▼
Venice AI audit gate (fail-closed) → CFO EIP-712 approval → execute
```

**Key files:**

| Concern | File |
|---------|------|
| MetaMask wallet client extensions | `lib/metamask/wallet-client.ts` |
| Permission grant (production path) | `components/agent/register-agent-wizard.tsx` |
| Permission normalization | `lib/metamask/normalize-permission.ts` |
| Delegated execution | `lib/metamask/execute.ts` |
| Session account | `lib/metamask/session-account.ts` |
| EIP-7702 upgrade (1Shot) | `components/agent/upgrade-7702.tsx`, `app/api/upgrade-7702/route.ts` |
| Agent lifecycle (app-level) | `app/api/agent/lifecycle/route.ts` |

---

## What Works Well (Positive Feedback)

1. **ERC-7715 mental model** — Scoped, expiring, human-readable permissions are the right primitive for AI agent treasuries ([concept doc](https://docs.metamask.io/smart-accounts-kit/concepts/advanced-permissions/)).
2. **viem integration** — `.extend(erc7715ProviderActions())` / `.extend(erc7710WalletActions())` fits our stack cleanly.
3. **Sepolia support** — USDC address documented and works with kit examples.
4. **ERC-7710 delegation** — Enables session-account execution without custody transfer ([EIP-7710](https://eips.ethereum.org/EIPS/eip-7710)).
5. **Vision alignment** — [Advanced Permissions announcement](https://metamask.io/news/introducing-advanced-permissions) matches Citadel's CFO + agent use case directly.

### What Works Well — Venice AI

1. **OpenAI-compatible API** — Drop-in with existing `openai` SDK ([`client.ts` (L179)](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts#L179)).
2. **x402 wallet auth** — Permissionless inference billing via [`venice-x402-client`](https://www.npmjs.com/package/venice-x402-client) ([`x402.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/x402.ts)).
3. **Unified gateway pattern** — We could centralize 8+ operations behind `VeniceService` ([`service.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts)).
4. **Crypto RPC** — Useful for recipient verification during audit ([`rpc.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/rpc.ts)).
5. **Model choice** — `llama-3.3-70b` works for structured JSON compliance verdicts at reasonable latency.

---

## Recommended Roadmap (Actionable)

### MetaMask — short-term (documentation)

- [ ] Single **Agent Treasury** example: grant → persist → redeem → verify balance
- [ ] Document `context` → `permissionContext` mapping explicitly
- [ ] Document on-chain revocation via delegation manager
- [ ] Flask version matrix (13.5 vs 13.9 smart-account auto-upgrade)
- [ ] Sepolia USDC + ETH minimum balances
- [ ] EOA vs smart-account session decision tree
- [ ] `dependencies[]` deployment recipe

### MetaMask — medium-term (SDK)

- [ ] `extractDelegationFields()` helper
- [ ] Structured error types for grant/redeem
- [ ] Serializable permission types for app storage
- [ ] `create-smart-account-app` CLI scaffold
- [ ] `preflightDelegatedTransfer()` simulate helper

### MetaMask — long-term (ecosystem)

- [ ] Multi-agent treasury pattern guide
- [ ] Permission health dashboard (`getGrantedExecutionPermissions` wrapper)
- [ ] CFO-facing permission summary component (embeddable)

### Venice AI — short-term

- [ ] **Fail-closed treasury audit** reference guide
- [ ] Normalized `usage` + `cost_usd` on x402 responses
- [ ] `veniceStructuredOutput(zodSchema)` helper
- [ ] Treasury audit JSON template (pattern + vendor risk)

### Venice AI — medium-term

- [ ] Unified SDK: `chat` + `rpc` + `search` + `images`
- [ ] Document `safeThink` / consistent error contracts
- [ ] Agent → audit → approval orchestration diagram

### Venice AI — long-term

- [ ] First-class vendor / address web search API
- [ ] Documented degraded-mode policies for financial agents

---

## Reproduction Checklist (for MetaMask team)

To reproduce Citadel's top issues in ~30 minutes:

1. Clone https://github.com/IrrhammCode/citadel
2. `cp .env.local.example .env.local` — set `VENICE_API_KEY`, `SESSION_ACCOUNT_PRIVATE_KEY`
3. `npm run infra:up && npm run db:migrate && npm run dev`
4. Install **MetaMask Flask 13.5+** on Sepolia
5. Open `/register-agent` — grant permission to session address
6. Inspect stored `grantedPermissions` in `GET /api/store`
7. Run `PATCH /api/agent/loop` from `/agent-dashboard`
8. Observe whether `executeDelegatedTransfer` succeeds or returns normalization error
9. Compare `lib/metamask/permissions.ts` (legacy shape) vs `register-agent-wizard.tsx` (correct shape)

---

## Reproduction Checklist (for Venice team)

To reproduce Citadel's Venice integration pain points in ~20 minutes:

1. Clone https://github.com/IrrhammCode/citadel
2. Set `VENICE_API_KEY` in `.env.local` (or `X402_WALLET_KEY` for x402 path)
3. `npm run dev` → open `/api/env/preflight` — confirm Venice health
4. `POST /api/audit-enhanced` with sample spend body — inspect enhanced verdict shape
5. Run agent cycle: `PATCH /api/agent/loop` with `{ systemId }` — trace `VeniceService.agentThink` → `VeniceService.audit` in logs
6. Unset `VENICE_API_KEY` → re-run audit — confirm **blocked** not throw ([`service.test.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.test.ts))
7. Set `E2E_MOCK_VENICE=true` → `npm run test:e2e` — CI path without live API
8. Open `/billing` — compare API key token counts vs x402 `tokens: 0` entries

**Key files:** [`lib/venice/service.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/service.ts) · [`lib/venice/client.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/venice/client.ts) · [`lib/agent/server-cycle.ts`](https://github.com/IrrhammCode/citadel/blob/main/lib/agent/server-cycle.ts)

---

## Contact

| Field | Value |
|-------|--------|
| **Project** | Citadel — Zero-Trust Corporate Treasury |
| **Team** | Irham ([@aydencryptoo](https://github.com/IrrhammCode)) |
| **Repository** | https://github.com/IrrhammCode/citadel |
| **Feedback file** | `feedback.md` (this document) |

---

*This feedback reflects hands-on implementation experience building a multi-agent, Venice-AI-gated treasury on Sepolia using MetaMask Advanced Permissions (ERC-7715), delegation redemption (ERC-7710), and Venice AI as a fail-closed compliance layer. We are enthusiastic about both ecosystems and hope these specifics help improve developer and CFO experiences.*
