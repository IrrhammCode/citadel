export type AgentGoal = {
  id: string;
  systemId: string;
  description: string;
  budget: number; // USDC
  spent: number; // USDC
  kpis: KPI[];
  startDate: number;
  endDate: number;
  status: "active" | "completed" | "paused";
};

export type KPI = {
  name: string;
  target: number;
  current: number;
  unit: string; // "x", "%", "usdc", "count"
  isHigherBetter: boolean;
};

export type TrustScore = {
  score: number; // 0-100
  level: "restricted" | "standard" | "trusted" | "elite";
  maxTxAmount: number; // USDC
  history: TrustEvent[];
  updatedAt: number;
};

export type TrustEvent = {
  type: "success" | "kpi_met" | "kpi_exceeded" | "blocked" | "suspicious" | "overbudget";
  description: string;
  points: number;
  timestamp: number;
};

export type VendorProfile = {
  address: string;
  name: string;
  trustScore: number; // 0-100
  totalPaid: number;
  transactionCount: number;
  averageAmount: number;
  lastPayment: number;
  riskLevel: "low" | "medium" | "high";
  notes: string[];
};

export type SpendingPattern = {
  metric: string;
  trend: "increasing" | "decreasing" | "stable" | "anomaly";
  changePercent: number;
  description: string;
  severity: "info" | "warning" | "critical";
};

export type Anomaly = {
  id: string;
  systemId: string;
  type: "amount_spike" | "new_vendor" | "frequency_spike" | "duplicate_attempt" | "budget_exceed";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  amount: number;
  recipient: string;
  timestamp: number;
  resolved: boolean;
  resolution?: string;
};

export type AgentReport = {
  id: string;
  systemId: string;
  systemName: string;
  period: "weekly" | "monthly";
  startDate: number;
  endDate: number;
  totalSpent: number;
  budget: number;
  roi: number;
  kpiSummary: { name: string; target: number; actual: number; status: "met" | "missed" | "exceeded" }[];
  topVendors: { address: string; name: string; amount: number; roi?: number }[];
  anomalies: Anomaly[];
  recommendations: string[];
  trustScoreChange: number;
  generatedAt: number;
};

export type NegotiationRequest = {
  id: string;
  fromSystemId: string;
  toSystemId: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "countered";
  counterAmount?: number;
  veniceVerdict?: string;
  timestamp: number;
  resolvedAt?: number;
};

export type BudgetPool = {
  totalBudget: number;
  allocated: number;
  unallocated: number;
  allocations: { systemId: string; amount: number }[];
};
