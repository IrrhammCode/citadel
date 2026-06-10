# CITADEL — Maximized Concept Document
# AI-Powered Autonomous Treasury

---

## 1. THE CORE PROBLEM

Current Citadel: "Human creates system → Human grants permission → System requests → AI audits → Done"

This is NOT an agent. This is a firewall with extra steps.

What judges want to see: "Agent has goals, makes decisions, learns, adapts, coordinates with other agents"

---

## 2. THE MAXIMIZED CONCEPT

### Before (Current):
> Citadel lets CFOs grant permissions. Venice audits every spend.

### After (Maximized):
> Citadel is an autonomous treasury where AI agents manage company funds with goals, learning, and multi-agent coordination. CFO sets the strategy. Agents execute. Venice ensures compliance.

---

## 3. THE THREE LAYERS

### Layer 1: CFO Strategy Layer (Human)
- CFO sets company-wide goals: "Q2 marketing budget 500 USDC, target ROI 2x"
- CFO creates agents with mandates: "Marketing Agent — maximize reach within budget"
- CFO reviews weekly AI-generated reports
- CFO can intervene anytime (circuit breaker)

### Layer 2: Agent Execution Layer (Autonomous)
- Each agent has a GOAL, BUDGET, and MANDATE
- Agent PLANS spending based on goals
- Agent REQUESTS transactions
- Agent LEARNS from outcomes
- Agent ADAPTS behavior over time
- Agent NEGOTIATES with other agents for shared resources

### Layer 3: Venice Compliance Layer (AI Firewall)
- Venice audits every transaction (current functionality)
- Venice analyzes spending PATTERNS over time
- Venice detects ANOMALIES
- Venice generates REPORTS
- Venice verifies on-chain data via Crypto RPC

---

## 4. DETAILED FEATURE BREAKDOWN

### 4.1 Agent Goals & KPIs

Each autonomous system gets a GOAL and KPIs:

```
Marketing Agent:
  Goal: "Maximize brand reach in Q2 2026"
  Budget: 500 USDC
  KPIs:
    - ROI target: 2x (spend 1, earn 2)
    - Vendor diversity: minimum 3 vendors
    - Max single payment: 100 USDC
  Status: Active
  Performance: 2.3x ROI (above target)
  Trust Score: 85/100
```

```
DevOps Agent:
  Goal: "Maintain 99.9% uptime"
  Budget: 300 USDC
  KPIs:
    - Uptime target: 99.9%
    - Max single payment: 50 USDC
    - Vendor lock-in: max 70% to single provider
  Status: Active
  Performance: 99.95% uptime (above target)
  Trust Score: 92/100
```

### 4.2 Trust Score System

Agents build trust over time:

```
Trust Score Calculation:
  +1  for each successful transaction
  +5  for meeting KPI target
  +10 for exceeding KPI target by 20%+
  -5  for Venice blocking a transaction
  -20 for suspicious activity flagged
  -50 for exceeding budget without approval

Trust Score Effects:
  0-30:   Restricted (max 5 USDC/tx, manual approval)
  31-60:  Standard (max 20 USDC/tx, Venice audit)
  61-80:  Trusted (max 50 USDC/tx, Venice audit)
  81-100: Elite (max 100 USDC/tx, Venice audit, auto-approve small txns)
```

### 4.3 Agent Learning & Adaptation

Agent tracks history and adapts:

```
Marketing Agent - Decision History:
  Week 1: Paid vendor A 50 USDC → ROI 1.8x → Good
  Week 2: Paid vendor B 80 USDC → ROI 2.5x → Excellent
  Week 3: Paid vendor C 30 USDC → ROI 0.5x → Poor
  Week 4: Agent learns → Stop using vendor C, increase vendor B
  
Adaptation:
  - Vendor A trust: 75/100 (consistent performer)
  - Vendor B trust: 90/100 (best ROI)
  - Vendor C trust: 20/100 (poor ROI, flagged)
  - Suggested budget reallocation: 40% A, 50% B, 10% C
```

### 4.4 Venice AI Enhanced Compliance

Venice does MORE than just approve/block:

```
Transaction Audit (Current):
  "Pay 8 USDC to vendor A" → Venice checks limits → Approved

Enhanced Venice:
  1. COMPLIANCE CHECK: "Pay 8 USDC to vendor A" → Approved
  2. PATTERN ANALYSIS: "This vendor received 3 payments this week, total 24 USDC. Normal pattern."
  3. ANOMALY DETECTION: "This payment is 3x the average for this vendor. Flag for review."
  4. RISK ASSESSMENT: "Vendor address has no on-chain history. Recommend smaller initial payment."
  5. REPORT GENERATION: "Weekly summary: 45 USDC spent across 3 vendors. ROI: 2.1x."
```

### 4.5 Multi-Agent Budget Negotiation

Agents share a budget pool and negotiate:

```
Company Budget Pool: 1000 USDC
  Marketing Agent: 500 USDC allocated
  DevOps Agent: 300 USDC allocated
  Payroll Agent: 200 USDC allocated

Scenario: Marketing needs extra 100 USDC for a big opportunity

Negotiation Flow:
  1. Marketing Agent: "I found a vendor with 4x ROI potential. Need 100 USDC extra."
  2. Venice AI: "Marketing has 2.3x ROI history. Trust score 85. Recommend approval."
  3. DevOps Agent: "I have 50 USDC unused this month. Can lend 50."
  4. Payroll Agent: "I need all 200 USDC this month. Cannot lend."
  5. Result: Marketing gets 50 from DevOps + 50 from unallocated pool
  6. CFO gets notification: "Marketing Agent borrowed 100 USDC. Reason: 4x ROI opportunity. Approved by Venice."
```

### 4.6 AI-Generated Reports (Venice)

Venice generates weekly/monthly reports for CFO:

```
=== CITADEL WEEKLY REPORT ===
Week of June 2-8, 2026

OVERVIEW:
  Total Budget: 1,000 USDC
  Total Spent: 342 USDC (34.2%)
  Remaining: 658 USDC
  Active Agents: 3

MARKETING AGENT:
  Spent: 180 USDC / 500 USDC budget
  ROI: 2.3x (target: 2.0x) ✅
  Top Vendor: Vendor B (90 USDC, ROI 2.5x)
  Trust Score: 85/100 (+5 this week)
  Venice Blocks: 1 (suspicious amount anomaly)
  Recommendation: "Increase Vendor B allocation. Consider dropping Vendor C."

DEVOPS AGENT:
  Spent: 92 USDC / 300 USDC budget
  Uptime: 99.95% (target: 99.9%) ✅
  Top Vendor: CloudProvider X (60 USDC)
  Trust Score: 92/100 (+2 this week)
  Venice Blocks: 0
  Recommendation: "On track. Consider negotiating bulk discount with CloudProvider X."

PAYROLL AGENT:
  Spent: 70 USDC / 200 USDC budget
  Contractors Paid: 3/5
  Trust Score: 78/100 (new agent, still building trust)
  Venice Blocks: 0
  Recommendation: "All payments on schedule. No issues."

ANOMALIES DETECTED:
  1. Marketing - June 5: Payment of 80 USDC to new vendor (3x average)
     Venice verdict: Approved with caution
     Reason: Vendor has no history, but memo checks out
  
  2. DevOps - June 7: Duplicate payment attempt to same vendor
     Venice verdict: Blocked
     Reason: Same amount, same recipient, same day. Likely duplicate.

RECOMMENDATIONS:
  1. Increase Marketing budget by 100 USDC (high ROI opportunity)
  2. Set up recurring payment for DevOps cloud vendor (reduce manual approvals)
  3. Review Payroll Agent trust score after 30 days

=== END REPORT ===
```

### 4.7 Venice Crypto RPC Integration

Venice verifies on-chain data during audits:

```
Audit: "Pay 50 USDC to 0xABC..."

Venice Crypto RPC Check:
  1. eth_getBalance(0xABC) → Balance: 0.001 ETH (new account?)
  2. eth_getLogs(0xABC) → No transfer history (suspicious)
  3. Web search("0xABC vendor") → No results found

Venice Verdict: BLOCKED
  Reason: Recipient has no on-chain history and no web presence.
  Recommendation: Request KYC documentation before proceeding.
```

---

## 5. REVISED USER FLOWS

### Flow 1: Agent Creation & Goal Setting
```
CFO → Dashboard
  → "Create New Agent"
  → Name: "Marketing Agent"
  → Goal: "Maximize Q2 marketing ROI"
  → Budget: 500 USDC
  → KPIs: ROI 2x, vendor diversity 3+
  → Venice generates initial strategy recommendation
  → CFO approves → Agent created
  → MetaMask popup: Grant ERC-7715 permission (500 USDC, 90 days)
```

### Flow 2: Autonomous Agent Operation
```
Marketing Agent (running):
  1. Agent identifies opportunity: "Vendor A offers 3x ROI on 50 USDC spend"
  2. Agent plans: "Request 50 USDC payment to Vendor A"
  3. Agent submits spend request
  4. Venice audits:
     - Compliance: Within budget ✅
     - Pattern: Vendor A has 2 previous successful payments ✅
     - Risk: Address verified on-chain ✅
     - Anomaly: Amount is 2x average but within KPI limits ✅
  5. Venice approves → Execute via ERC-7710 delegation
  6. Agent updates: "Vendor A trust +1, ROI tracking updated"
  7. Agent reports to CFO: "Paid 50 USDC to Vendor A. Expected ROI: 3x."
```

### Flow 3: Multi-Agent Negotiation
```
Marketing Agent: "Need 100 USDC extra for big opportunity"
  → Requests budget increase from pool
  → Venice analyzes: "Marketing trust 85, ROI 2.3x. Recommend approval."
  → DevOps Agent: "I have 50 USDC unused. Can lend."
  → Pool: 50 USDC available
  → Total: 100 USDC secured
  → CFO notification: "Marketing got 100 USDC extra. Venice approved."
  → Marketing Agent: "Executing 100 USDC payment to premium vendor."
```

### Flow 4: Venice Anomaly Detection
```
DevOps Agent: "Request 200 USDC to cloud vendor"
  → Venice audit:
     - Compliance: Within budget ✅
     - Pattern: ⚠️ This is 10x the average DevOps payment
     - Risk: Vendor address is new (first payment)
     - Anomaly: ⚠️ Similar request blocked last week for different agent
  → Venice blocks with reasoning:
     "This payment is 10x the average. New vendor. Recommend:
      1. Start with smaller payment (20 USDC) to verify vendor
      2. Request vendor documentation
      3. Escalate to CFO for manual review"
```

---

## 6. TECHNICAL ARCHITECTURE (REVISED)

```
┌─────────────────────────────────────────────────┐
│                 CFO DASHBOARD                    │
│  Set Goals · Create Agents · Review Reports     │
│  Circuit Breaker · Budget Allocation            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              AGENT LAYER                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Marketing │ │ DevOps   │ │ Payroll  │        │
│  │Agent     │ │ Agent    │ │ Agent    │        │
│  │          │ │          │ │          │        │
│  │ Goals    │ │ Goals    │ │ Goals    │        │
│  │ Budget   │ │ Budget   │ │ Budget   │        │
│  │ Trust    │ │ Trust    │ │ Trust    │        │
│  │ History  │ │ History  │ │ History  │        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       │             │             │              │
│       └─────────────┼─────────────┘              │
│                     │                            │
│              ┌──────▼──────┐                     │
│              │  NEGOTIATE  │ ← Multi-agent       │
│              │  Budget     │   coordination      │
│              └──────┬──────┘                     │
└─────────────────────┼────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│              VENICE AI LAYER                      │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Compliance  │  │  Pattern    │  │ Reports  │ │
│  │ Check       │  │  Analysis   │  │ Generate │ │
│  │ (Current)   │  │  (NEW)      │  │ (NEW)    │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Anomaly    │  │  Crypto     │  │ Web      │ │
│  │  Detection  │  │  RPC Verify │  │ Search   │ │
│  │  (NEW)      │  │  (NEW)      │  │ (NEW)    │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│              EXECUTION LAYER                      │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ 1Shot       │  │ ERC-7710    │  │ x402     │ │
│  │ Relayer     │  │ Delegation  │  │ Payment  │ │
│  │ (Gasless)   │  │ (Permission)│  │ (Venice) │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│              ON-CHAIN (Sepolia)                    │
│  USDC · Delegation Manager · Smart Accounts      │
└──────────────────────────────────────────────────┘
```

---

## 7. WHAT THIS CHANGES FOR JUDGES

| Before | After |
|--------|-------|
| "Cool compliance checker" | "Autonomous AI treasury manager" |
| Venice = approve/block | Venice = compliance + patterns + reports + anomaly detection |
| Static permissions | Dynamic trust-based permissions |
| 3 independent systems | 3 coordinated agents with negotiation |
| Human does everything | Agents do the work, human sets strategy |
| One demo path | Multiple compelling demo scenarios |

---

## 8. DEMO SCRIPT (REVISED, 3 MIN)

### Scene 1: CFO Dashboard (30s)
> "This is Citadel. An AI-powered autonomous treasury. The CFO sets goals and budgets. Three AI agents manage the money."

### Scene 2: Agent Creation (30s)
> "I'm creating a Marketing Agent. Goal: maximize Q2 ROI. Budget: 500 USDC. Venice generates an initial strategy."
> [MetaMask ERC-7715 popup]

### Scene 3: Agent Autonomous Operation (45s)
> "The agent found a vendor with 3x ROI potential. It requests 50 USDC. Venice checks compliance, verifies the vendor on-chain, and approves."
> [Show Venice audit details]

### Scene 4: Anomaly Detection (30s)
> "Now the agent tries a suspicious payment — 200 USDC to an unknown address. Venice blocks it. The agent learns and adjusts."
> [Show Venice block reasoning]

### Scene 5: Multi-Agent Negotiation (30s)
> "Marketing needs extra budget. DevOps has unused funds. They negotiate through Venice. The CFO gets a notification."
> [Show negotiation flow]

### Scene 6: AI Report (15s)
> "Venice generates a weekly report. Marketing ROI: 2.3x. All agents performing above target."
> [Show report]

---

## 9. IMPLEMENTATION PRIORITY

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| P0 | Agent Goals + KPIs | 🔥🔥🔥 | 2h |
| P0 | Trust Score System | 🔥🔥🔥 | 3h |
| P0 | Venice Pattern Analysis | 🔥🔥🔥 | 2h |
| P0 | Venice Anomaly Detection | 🔥🔥🔥 | 2h |
| P1 | AI Reports | 🔥🔥 | 3h |
| P1 | Multi-Agent Negotiation | 🔥🔥🔥 | 4h |
| P1 | Venice Crypto RPC | 🔥🔥 | 2h |
| P2 | 1Shot Relayer | 🔥 | 3h |
| P2 | x402 Venice Auth | 🔥 | 3h |

Total: ~24 hours of work

---

## 10. WINNING FORMULA

```
Best Agent ($3K):
  ✅ Autonomous agents with goals, learning, adaptation
  ✅ Multi-agent coordination and negotiation
  ✅ Venice AI as core compliance + intelligence engine

Best use of Venice AI ($3K):
  ✅ Venice compliance check (current)
  ✅ Venice pattern analysis (new)
  ✅ Venice anomaly detection (new)
  ✅ Venice report generation (new)
  ✅ Venice crypto RPC for on-chain verification (new)
  ✅ Venice x402 auth (new)

Best Use of 1Shot ($1K):
  ✅ 1Shot Relayer for gasless execution (new)

Total potential: $7K
```
