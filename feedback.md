# 📝 Citadel — MetaMask Smart Accounts Kit Feedback

> **Track:** Best Feedback ($100 each, 5 winners)
> **Judging Criteria:** Usefulness, Clarity, Specificity, Relevance, Actionable Value
> **Last Updated:** 2026-06-11

---

## 📊 Feedback Summary

| # | Category | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| 1 | Documentation | ERC-7715 flow unclear | High | Open |
| 2 | Documentation | ERC-7710 delegation examples missing | High | Open |
| 3 | SDK | Error handling gaps | Medium | Open |
| 4 | SDK | TypeScript types incomplete | Medium | Open |
| 5 | DX | Local dev setup friction | Medium | Open |
| 6 | DX | Sepolia testnet faucet integration | Low | Open |
| 7 | Security | Permission revocation flow unclear | High | Open |
| 8 | Composability | Multi-agent permission management | Medium | Open |

---

## 🔍 Detailed Feedback

### 1. ERC-7715 Flow Documentation

**Category:** Documentation
**Severity:** High
**Component:** `@metamask/smart-accounts-kit`

**Issue:**
The `requestExecutionPermissions` flow lacks clear documentation on:
- How to structure permission objects
- What fields are required vs optional
- How to handle permission expiry
- Best practices for scoped permissions

**Current State:**
```typescript
// Documentation says:
await wallet.requestExecutionPermissions([{
  // ???
}]);

// But doesn't explain:
// 1. What goes inside the permission object
// 2. How to scope to specific contracts/amounts
// 3. How to set expiry
// 4. How to handle revocation
```

**Suggestion:**
Add a comprehensive guide with:
1. Permission object schema with all fields explained
2. Common patterns (daily limits, contract-scoped, time-bound)
3. Error handling best practices
4. Security considerations

**Impact:**
Without clear docs, developers spend hours reverse-engineering the permission format. This blocks adoption.

---

### 2. ERC-7710 Delegation Examples

**Category:** Documentation
**Severity:** High
**Component:** `@metamask/smart-accounts-kit/actions`

**Issue:**
The `sendTransactionWithDelegation` function works but lacks:
- End-to-end examples showing permission grant → delegation → execution
- How to pass `permissionContext` and `delegationManager`
- How to handle delegation failures gracefully
- Gas estimation for delegated transactions

**Current State:**
```typescript
// We had to reverse-engineer this:
const hash = await walletClient.sendTransactionWithDelegation({
  account: sessionAccount,
  chain: CHAIN,
  to: USDC_ADDRESS,
  data,
  permissionContext: permission.context,      // Where does this come from?
  delegationManager: permission.delegationManager, // How to get this?
});

// No docs on:
// 1. How to obtain permissionContext from grant flow
// 2. What delegationManager is and how to configure it
// 3. How to handle failures (reverts, insufficient gas, etc.)
```

**Suggestion:**
Create a "Quick Start" guide with:
1. Full working example (grant → delegate → execute)
2. Permission context extraction pattern
3. Error handling patterns
4. Gas optimization tips

**Impact:**
Developers can't build working integrations without understanding the full delegation lifecycle.

---

### 3. SDK Error Handling

**Category:** SDK
**Severity:** Medium
**Component:** `@metamask/smart-accounts-kit`

**Issue:**
SDK functions throw generic errors without structured error codes. This makes it hard to:
- Distinguish between user rejection vs system error
- Implement retry logic
- Show meaningful error messages to users

**Current State:**
```typescript
try {
  await wallet.requestExecutionPermissions([...]);
} catch (error) {
  // Is this user rejection?
  // Is this network error?
  // Is this invalid permission?
  // No way to tell programmatically
  console.error(error.message); // Generic message
}
```

**Suggestion:**
Add structured error types:
```typescript
enum SmartAccountError {
  USER_REJECTED = 'USER_REJECTED',
  INVALID_PERMISSION = 'INVALID_PERMISSION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PERMISSION_EXPIRED = 'PERMISSION_EXPIRED',
}
```

**Impact:**
Better error handling leads to better UX and easier debugging.

---

### 4. TypeScript Types

**Category:** SDK
**Severity:** Medium
**Component:** `@metamask/smart-accounts-kit`

**Issue:**
Some TypeScript types are incomplete or generic:
- Permission objects typed as `Record<string, unknown>`
- Response types don't include all fields
- Missing type exports for common patterns

**Current State:**
```typescript
// Permission object is loosely typed
type Permission = Record<string, unknown>;

// We need:
type Permission = {
  id: string;
  target: Address;
  amount: bigint;
  expiry: number;
  scope: 'daily' | 'per-transaction' | 'lifetime';
  // ... etc
};
```

**Suggestion:**
Export comprehensive TypeScript types for all permission objects and responses.

**Impact:**
Better types = better DX, fewer bugs, faster development.

---

### 5. Local Development Setup

**Category:** DX
**Severity:** Medium
**Component:** Development Environment

**Issue:**
Setting up local development with MetaMask Smart Accounts Kit is friction-heavy:
- Need MetaMask Flask for ERC-7715 support
- Need to configure Sepolia testnet manually
- No clear "zero-to-working" tutorial
- Hardhat/viem integration not documented

**Current State:**
```bash
# What we had to figure out:
1. Install MetaMask Flask (not regular MetaMask)
2. Add Sepolia network manually
3. Get Sepolia ETH from faucet
4. Configure session account private key
5. Set up viem + smart accounts kit
6. ... and more
```

**Suggestion:**
Create a CLI scaffold or starter template:
```bash
npx create-smart-account-app my-app
# Automatically sets up:
# - MetaMask Flask integration
# - Sepolia testnet config
# - Session account generation
# - Sample permission flow
```

**Impact:**
Reduces onboarding time from hours to minutes.

---

### 6. Sepolia Faucet Integration

**Category:** DX
**Severity:** Low
**Component:** Development Environment

**Issue:**
No built-in faucet integration for Sepolia testnet ETH. Developers need to:
- Find external faucets
- Wait for manual approval
- Handle rate limits

**Suggestion:**
Integrate with Sepolia faucet or provide a dev faucet endpoint.

**Impact:**
Minor but improves developer experience.

---

### 7. Permission Revocation Flow

**Category:** Security
**Severity:** High
**Component:** `@metamask/smart-accounts-kit`

**Issue:**
Documentation doesn't clearly explain:
- How to revoke granted permissions
- What happens to in-flight delegations after revocation
- How to check if a permission is still valid
- Emergency revocation patterns

**Current State:**
```typescript
// How to revoke?
await wallet.revokePermission(permissionId); // ???

// What happens to pending delegations?
// How to check validity?
// No docs on this
```

**Suggestion:**
Document the full permission lifecycle:
1. Grant → Use → Expire → Revoke
2. Revocation patterns (immediate, graceful)
3. Status checking APIs
4. Emergency revocation

**Impact:**
Critical for security. Without clear revocation docs, developers may leave permissions open.

---

### 8. Multi-Agent Permission Management

**Category:** Composability
**Severity:** Medium
**Component:** `@metamask/smart-accounts-kit`

**Issue:**
No clear pattern for managing permissions across multiple autonomous agents:
- How to grant different permissions to different agents
- How to track which agent used which permission
- How to set per-agent spending limits
- How to audit agent activity

**Current State:**
```typescript
// We have 26 agents, each needs different permissions:
// Marketing: 10 USDC/day
// DevOps: 5 USDC/day
// Payroll: 20 USDC/day

// How to manage this?
// No pattern for multi-agent permission scoping
```

**Suggestion:**
Add a "Multi-Agent Treasury" guide:
1. Permission namespacing per agent
2. Per-agent spending limits
3. Activity audit trail
4. Bulk permission management

**Impact:**
Essential for enterprise use cases with multiple autonomous systems.

---

## 🎯 Positive Feedback

### What Works Well

1. **ERC-7715 Concept** — Granular permissions for autonomous agents is powerful
2. **MetaMask Integration** — Familiar wallet experience for users
3. **Sepolia Support** — Testnet works well for development
4. **viem Compatibility** — Works with existing viem/wagmi stack

### What's Impressive

1. **Vision** — The idea of wallet-native permissions for AI agents is forward-thinking
2. **Security Model** — Scoped permissions with expiry is well-designed
3. **Composability** — ERC-7710 delegation enables complex permission patterns

---

## 📈 Improvement Roadmap

### Short-term (Documentation)
- [ ] Complete ERC-7715 permission object reference
- [ ] Add end-to-end delegation example
- [ ] Document permission revocation flow
- [ ] Add error handling guide

### Medium-term (SDK)
- [ ] Export comprehensive TypeScript types
- [ ] Add structured error codes
- [ ] Create CLI scaffold
- [ ] Add multi-agent permission patterns

### Long-term (Ecosystem)
- [ ] Create permission template library
- [ ] Add permission analytics dashboard
- [ ] Integrate with popular frameworks (Next.js, Hardhat)
- [ ] Create permission testing utilities

---

## 📞 Contact

**Project:** Citadel — Zero-Trust Corporate Treasury
**Team:** Irham (@aydencryptoo)
**Repo:** https://github.com/IrrhammCode/citadel

---

*This feedback is based on our experience building Citadel, a zero-trust corporate treasury platform that uses ERC-7715 Advanced Permissions to grant granular spending authority to autonomous AI agents.*
