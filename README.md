# Citadel

Zero-trust corporate treasury platform for the MetaMask Smart Accounts Kit x 1Shot API x Venice AI hackathon.

Citadel lets CFOs grant granular **ERC-7715 Advanced Permissions** to autonomous systems. Every spend request is audited in real-time by **Venice AI** before optional on-chain execution via **ERC-7710 delegation**.

## Features

- **CFO Dashboard** — Connect MetaMask, manage autonomous systems, grant permissions
- **ERC-7715 Permission Flow** — `requestExecutionPermissions` with scoped USDC daily limits
- **Venice AI Compliance Firewall** — Real API audit with approve/block verdict and reasoning
- **Spend Simulator** — Happy path (8 USDC vendor) and blocked path (50 USDC suspicious)
- **Audit Log** — Full decision history with optional Sepolia tx links

## Tech Stack

- Next.js 15+ (App Router) · TypeScript · Tailwind CSS
- wagmi + viem + `@metamask/smart-accounts-kit`
- Venice AI (OpenAI-compatible API)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:

   | Variable | Description |
   |----------|-------------|
   | `VENICE_API_KEY` | Venice API key from [venice.ai](https://venice.ai) |
   | `SESSION_ACCOUNT_PRIVATE_KEY` | Throwaway EOA private key for session account |

   Generate a session key:

   ```bash
   openssl rand -hex 32
   ```

3. **Run dev server**

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) — landing page first, then **Connect Wallet** to enter the dashboard

## MetaMask Requirements

- Latest MetaMask extension with **Advanced Permissions (ERC-7715)** support
- Connected to **Sepolia** testnet
- User must approve smart account upgrade when granting permissions (ERC-7710 delegation)

## Demo Script (90 seconds)

| Time | Action |
|------|--------|
| 0–15s | Intro: "Citadel — zero-trust treasury for autonomous agents" |
| 15–35s | Landing → Connect Wallet → Dashboard → Grant Permission → **show MetaMask popup** |
| 35–55s | Open Marketing System → "Pay vendor 8 USDC" → Venice approves |
| 55–70s | "Suspicious 50 USDC" → Venice blocks with reasoning |
| 70–90s | Show Audit Log + optional on-chain execution |

## Project Structure

```
app/           # Pages and API routes
components/    # UI, dashboard, permissions, audit
lib/           # wagmi, MetaMask, Venice, storage
hooks/         # usePermissions, useVeniceAudit
types/         # Shared TypeScript types
```

## Hackathon Tracks

- **Best Agent** — Autonomous system → Venice gate → delegation execution
- **Best use of Venice AI** — Venice as core compliance engine in main flow

## License

MIT
