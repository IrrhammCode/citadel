# Citadel — MetaMask Smart Accounts Kit Feedback

> **Track:** Best Feedback  
> **Project:** [Citadel](https://github.com/IrrhammCode/citadel) — zero-trust corporate treasury (MetaMask Smart Accounts × Venice AI)  
> **Kit version tested:** `@metamask/smart-accounts-kit@^1.6.0`  
> **Chain:** Ethereum Sepolia  
> **Last updated:** 2026-06-07  

---

## Executive Summary

While building Citadel — a multi-agent treasury where CFOs grant **ERC-7715 Advanced Permissions** and agents execute via **ERC-7710 delegation** — we successfully shipped a production-oriented flow (register → run → audit → approve → execute). However, several documentation gaps, SDK ergonomics issues, and wallet UX frictions added **days of reverse-engineering** that could have been avoided with clearer end-to-end guidance.

This document lists **observed issues**, **reproduction context**, **official references**, and **Citadel workarounds** with file-level evidence.

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

---

## Feedback Summary

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

---

## Detailed Feedback

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

---

## Recommended Roadmap (Actionable)

### Short-term (documentation)

- [ ] Single **Agent Treasury** example: grant → persist → redeem → verify balance
- [ ] Document `context` → `permissionContext` mapping explicitly
- [ ] Document on-chain revocation via delegation manager
- [ ] Flask version matrix (13.5 vs 13.9 smart-account auto-upgrade)
- [ ] Sepolia USDC + ETH minimum balances

### Medium-term (SDK)

- [ ] `extractDelegationFields()` helper
- [ ] Structured error types for grant/redeem
- [ ] Serializable permission types for app storage
- [ ] `create-smart-account-app` CLI scaffold

### Long-term (ecosystem)

- [ ] Multi-agent treasury pattern guide
- [ ] Permission health dashboard (`getGrantedExecutionPermissions` wrapper)
- [ ] CFO-facing permission summary component (embeddable)

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

## Contact

| Field | Value |
|-------|--------|
| **Project** | Citadel — Zero-Trust Corporate Treasury |
| **Team** | Irham ([@aydencryptoo](https://github.com/IrrhammCode)) |
| **Repository** | https://github.com/IrrhammCode/citadel |
| **Feedback file** | `feedback.md` (this document) |

---

*This feedback reflects hands-on implementation experience building a multi-agent, Venice-AI-gated treasury on Sepolia using MetaMask Advanced Permissions (ERC-7715) and delegation redemption (ERC-7710). We are enthusiastic about the direction and hope these specifics help improve developer and CFO experiences.*
