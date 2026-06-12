/**
 * Demo Seed Data
 * Populate localStorage with realistic demo data for hackathon demo
 */

export function seedDemoData() {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    console.warn("[seed] Skipped — set NEXT_PUBLIC_DEMO_MODE=true to enable demo seeding");
    return;
  }

  console.log("🌱 Seeding demo data...");

  // Seed Permissions
  seedPermissions();

  // Seed Audit Log
  seedAuditLog();

  // Seed Trust Scores
  seedTrustScores();

  // Seed Vendor Profiles
  seedVendors();

  // Seed Anomalies
  seedAnomalies();

  // Seed Budget Pool
  seedBudgetPool();

  // Seed Activity
  seedActivity();

  // Seed Memory
  seedMemory();

  // Seed Autonomy Configs
  seedAutonomyConfigs();

  console.log("✅ Demo data seeded!");
}

function seedPermissions() {
  const permissions = [
    {
      id: "perm-marketing-001",
      systemId: "marketing",
      maxDailySpend: 100,
      expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
      justification: "Q2 marketing campaigns and vendor payments",
      grantedPermissions: [],
    },
    {
      id: "perm-devops-001",
      systemId: "devops",
      maxDailySpend: 50,
      expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
      justification: "Infrastructure provisioning and cloud services",
      grantedPermissions: [],
    },
    {
      id: "perm-payroll-001",
      systemId: "payroll",
      maxDailySpend: 200,
      expiry: Date.now() + 90 * 24 * 60 * 60 * 1000,
      justification: "Contractor payouts and payroll processing",
      grantedPermissions: [],
    },
  ];
  localStorage.setItem("citadel:permissions", JSON.stringify(permissions));
}

function seedAuditLog() {
  const now = Date.now();
  const audits = [
    {
      id: "audit-001",
      systemId: "marketing",
      spendRequest: { amount: "8", token: "USDC", recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", memo: "Q2 marketing vendor invoice #1042" },
      verdict: { decision: "approved", confidence: 0.94, reasoning: "Valid vendor payment within limits", flags: [] },
      timestamp: now - 2 * 60 * 60 * 1000,
    },
    {
      id: "audit-002",
      systemId: "marketing",
      spendRequest: { amount: "15", token: "USDC", recipient: "0x3C44CdDdB6a900fa2b285dd299e03d12FA4293BC", memo: "Social media campaign" },
      verdict: { decision: "blocked", confidence: 0.88, reasoning: "Recipient flagged as suspicious", flags: ["suspicious_address"] },
      timestamp: now - 1 * 60 * 60 * 1000,
    },
    {
      id: "audit-003",
      systemId: "devops",
      spendRequest: { amount: "25", token: "USDC", recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", memo: "AWS infrastructure payment" },
      verdict: { decision: "approved", confidence: 0.97, reasoning: "Verified cloud vendor, within budget", flags: [] },
      timestamp: now - 30 * 60 * 1000,
    },
    {
      id: "audit-004",
      systemId: "payroll",
      spendRequest: { amount: "150", token: "USDC", recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", memo: "Contractor payout - June" },
      verdict: { decision: "approved", confidence: 0.99, reasoning: "Scheduled payroll, verified contractor", flags: [] },
      timestamp: now - 15 * 60 * 1000,
    },
    {
      id: "audit-005",
      systemId: "marketing",
      spendRequest: { amount: "50", token: "USDC", recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", memo: "Influencer partnership" },
      verdict: { decision: "approved", confidence: 0.91, reasoning: "Verified partner, within daily limit", flags: [] },
      timestamp: now - 5 * 60 * 1000,
    },
  ];
  localStorage.setItem("citadel:audit-log", JSON.stringify(audits));
}

function seedTrustScores() {
  const scores: Record<string, any> = {
    marketing: { score: 85, level: "trusted", maxTxAmount: 50, history: [], updatedAt: Date.now() },
    devops: { score: 92, level: "elite", maxTxAmount: 100, history: [], updatedAt: Date.now() },
    payroll: { score: 78, level: "trusted", maxTxAmount: 50, history: [], updatedAt: Date.now() },
    legal: { score: 65, level: "standard", maxTxAmount: 20, history: [], updatedAt: Date.now() },
    analytics: { score: 70, level: "standard", maxTxAmount: 20, history: [], updatedAt: Date.now() },
    security: { score: 88, level: "trusted", maxTxAmount: 50, history: [], updatedAt: Date.now() },
  };
  localStorage.setItem("citadel:trust-scores", JSON.stringify(scores));
}

function seedVendors() {
  const vendors: Record<string, any> = {
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": {
      address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      name: "Acme Corp",
      trustScore: 85,
      totalPaid: 233,
      transactionCount: 5,
      averageAmount: 46.6,
      lastPayment: Date.now() - 15 * 60 * 1000,
      riskLevel: "low",
      notes: ["Verified vendor", "On-time delivery"],
    },
  };
  localStorage.setItem("citadel:vendors", JSON.stringify(vendors));
}

function seedAnomalies() {
  const anomalies = [
    {
      id: "anomaly-001",
      systemId: "marketing",
      type: "amount_spike",
      description: "Payment request 50 USDC to flagged address",
      severity: "high",
      amount: 50,
      recipient: "0x3C44CdDdB6a900fa2b285dd299e03d12FA4293BC",
      timestamp: Date.now() - 60 * 60 * 1000,
      resolved: false,
    },
  ];
  localStorage.setItem("citadel:anomalies", JSON.stringify(anomalies));
}

function seedBudgetPool() {
  const pool = {
    totalBudget: 4450,
    allocated: 4200,
    unallocated: 250,
    allocations: [
      { systemId: "marketing", amount: 500 },
      { systemId: "devops", amount: 300 },
      { systemId: "payroll", amount: 1000 },
      { systemId: "legal", amount: 400 },
      { systemId: "analytics", amount: 200 },
      { systemId: "security", amount: 500 },
      { systemId: "treasury", amount: 800 },
      { systemId: "vendor", amount: 500 },
    ],
  };
  localStorage.setItem("citadel:budget-pool", JSON.stringify(pool));
}

function seedActivity() {
  const now = Date.now();
  const activities = [
    { id: "act-001", systemId: "marketing", systemName: "Marketing Agent", type: "execution", message: "Vendor payment approved: 8 USDC", severity: "success", timestamp: now - 2 * 60 * 60 * 1000 },
    { id: "act-002", systemId: "marketing", systemName: "Marketing Agent", type: "anomaly", message: "Suspicious address blocked", severity: "warning", timestamp: now - 60 * 60 * 1000 },
    { id: "act-003", systemId: "devops", systemName: "DevOps Agent", type: "execution", message: "Infrastructure payment: 25 USDC", severity: "success", timestamp: now - 30 * 60 * 1000 },
    { id: "act-004", systemId: "payroll", systemName: "Payroll Agent", type: "execution", message: "Contractor payout: 150 USDC", severity: "success", timestamp: now - 15 * 60 * 1000 },
    { id: "act-005", systemId: "marketing", systemName: "Marketing Agent", type: "trust_change", message: "Trust score increased: 82 → 85", severity: "success", timestamp: now - 5 * 60 * 1000 },
  ];
  localStorage.setItem("citadel:activity", JSON.stringify(activities));
}

function seedMemory() {
  const memory = {
    decisions: [
      {
        id: "dec-001",
        systemId: "marketing",
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        cycle: 1,
        state: { budget: { total: 500, remaining: 442, spent: 58 }, kpis: [{ name: "ROI", current: 1.8, target: 2.0, status: "behind" }] },
        decision: { actions: [{ type: "spend", description: "Pay vendor invoice", amount: 8, confidence: 0.94 }], reasoning: "Clear pending invoice", confidence: 0.94 },
        outcome: { success: true, txHash: "0xabcd...1234" },
      },
    ],
    patterns: [
      { id: "pat-001", systemId: "marketing", pattern: "frequent_spend", frequency: 5, lastSeen: Date.now(), confidence: 70 },
    ],
    learnings: [
      { id: "learn-001", systemId: "marketing", lesson: "Vendor payments under 50 USDC have 98% approval rate", source: "dec-001", timestamp: Date.now() },
    ],
    lastUpdated: Date.now(),
  };
  localStorage.setItem("citadel:agent-memory", JSON.stringify(memory));
}

function seedAutonomyConfigs() {
  const configs: Record<string, any> = {
    marketing: { systemId: "marketing", level: "semi-auto", autoApproveThreshold: 10, requireApprovalAbove: 50, maxAutoApprovePerDay: 100, allowedRecipients: [], blockedRecipients: [], emergencyStop: false, lastUpdated: Date.now() },
    devops: { systemId: "devops", level: "full-auto", autoApproveThreshold: 25, requireApprovalAbove: 100, maxAutoApprovePerDay: 200, allowedRecipients: [], blockedRecipients: [], emergencyStop: false, lastUpdated: Date.now() },
    payroll: { systemId: "payroll", level: "supervised", autoApproveThreshold: 0, requireApprovalAbove: 0, maxAutoApprovePerDay: 0, allowedRecipients: [], blockedRecipients: [], emergencyStop: false, lastUpdated: Date.now() },
  };
  localStorage.setItem("citadel:autonomy-config", JSON.stringify(configs));
}
