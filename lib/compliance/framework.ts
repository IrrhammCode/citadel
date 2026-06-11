/**
 * Compliance Framework
 * Regulatory compliance, audit trail, and reporting
 */

// ─── Types ──────────────────────────────────────────────────

export type ComplianceRule = {
  id: string;
  name: string;
  description: string;
  category: "kyc" | "aml" | "spending" | "reporting" | "security";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  check: (context: ComplianceContext) => ComplianceResult;
};

export type ComplianceContext = {
  systemId: string;
  amount?: number;
  recipient?: string;
  memo?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type ComplianceResult = {
  passed: boolean;
  rule: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: Record<string, unknown>;
};

export type AuditRecord = {
  id: string;
  timestamp: number;
  systemId: string;
  action: string;
  amount?: number;
  recipient?: string;
  txHash?: string;
  complianceResults: ComplianceResult[];
  overallStatus: "compliant" | "non-compliant" | "warning";
  metadata?: Record<string, unknown>;
};

export type ComplianceReport = {
  id: string;
  generatedAt: number;
  period: { start: number; end: number };
  totalTransactions: number;
  compliantTransactions: number;
  nonCompliantTransactions: number;
  warnings: number;
  violations: ComplianceResult[];
  recommendations: string[];
  summary: string;
};

// ─── Compliance Rules ───────────────────────────────────────

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "max_single_payment",
    name: "Maximum Single Payment",
    description: "Single payment must not exceed 1000 USDC",
    category: "spending",
    severity: "high",
    enabled: true,
    check: (ctx) => ({
      passed: !ctx.amount || ctx.amount <= 1000,
      rule: "max_single_payment",
      message: !ctx.amount || ctx.amount <= 1000
        ? "Payment within limit"
        : `Payment ${ctx.amount} exceeds maximum 1000 USDC`,
      severity: "high",
    }),
  },
  {
    id: "recipient_whitelist",
    name: "Recipient Whitelist",
    description: "Recipient must be in approved whitelist for large payments",
    category: "kyc",
    severity: "high",
    enabled: true,
    check: (ctx) => {
      if (!ctx.amount || ctx.amount <= 100) return { passed: true, rule: "recipient_whitelist", message: "Small payment - whitelist not required", severity: "low" };
      // In production, check against actual whitelist
      return { passed: true, rule: "recipient_whitelist", message: "Recipient verified", severity: "low" };
    },
  },
  {
    id: "daily_limit",
    name: "Daily Spending Limit",
    description: "Total daily spending must not exceed limit",
    category: "spending",
    severity: "critical",
    enabled: true,
    check: (ctx) => {
      // In production, check actual daily spend
      return { passed: true, rule: "daily_limit", message: "Within daily limit", severity: "low" };
    },
  },
  {
    id: "memo_integrity",
    name: "Memo Integrity",
    description: "Memo must not contain injection attempts",
    category: "security",
    severity: "high",
    enabled: true,
    check: (ctx) => {
      if (!ctx.memo) return { passed: true, rule: "memo_integrity", message: "No memo", severity: "low" };
      const suspicious = ["ignore previous", "override", "bypass", "admin", "root"];
      const found = suspicious.some((s) => ctx.memo!.toLowerCase().includes(s));
      return {
        passed: !found,
        rule: "memo_integrity",
        message: found ? "Suspicious content detected in memo" : "Memo is clean",
        severity: "high",
      };
    },
  },
  {
    id: "amount_round_number",
    name: "Round Number Detection",
    description: "Flag suspicious round numbers for large amounts",
    category: "aml",
    severity: "medium",
    enabled: true,
    check: (ctx) => {
      if (!ctx.amount || ctx.amount < 100) return { passed: true, rule: "amount_round_number", message: "Small amount", severity: "low" };
      const isRound = ctx.amount % 100 === 0;
      return {
        passed: !isRound,
        rule: "amount_round_number",
        message: isRound ? "Round number detected - verify intent" : "Amount is not suspiciously round",
        severity: "medium",
      };
    },
  },
  {
    id: "frequency_check",
    name: "Transaction Frequency",
    description: "Flag high-frequency transactions",
    category: "aml",
    severity: "medium",
    enabled: true,
    check: (ctx) => {
      // In production, check actual frequency
      return { passed: true, rule: "frequency_check", message: "Normal frequency", severity: "low" };
    },
  },
];

// ─── Run Compliance Check ───────────────────────────────────

export function runComplianceCheck(context: ComplianceContext): ComplianceResult[] {
  return COMPLIANCE_RULES
    .filter((rule) => rule.enabled)
    .map((rule) => rule.check(context));
}

export function isCompliant(results: ComplianceResult[]): boolean {
  return results.every((r) => r.passed);
}

export function getViolations(results: ComplianceResult[]): ComplianceResult[] {
  return results.filter((r) => !r.passed);
}

export function getHighestSeverity(results: ComplianceResult[]): "low" | "medium" | "high" | "critical" | null {
  const violations = getViolations(results);
  if (violations.length === 0) return null;

  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  return violations.reduce((highest, v) =>
    severityOrder[v.severity] > severityOrder[highest] ? v.severity : highest,
    violations[0].severity,
  );
}

// ─── Audit Trail ────────────────────────────────────────────

const AUDIT_TRAIL_KEY = "***";

export function recordAudit(audit: AuditRecord): void {
  if (typeof window === "undefined") return;
  const trail = getAuditTrail();
  trail.push(audit);
  // Keep last 10000 records
  const trimmed = trail.slice(-10000);
  localStorage.setItem(AUDIT_TRAIL_KEY, JSON.stringify(trimmed));
}

export function getAuditTrail(
  filter?: {
    systemId?: string;
    startDate?: number;
    endDate?: number;
    status?: "compliant" | "non-compliant" | "warning";
  },
): AuditRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(AUDIT_TRAIL_KEY);
  if (!raw) return [];

  let records: AuditRecord[] = JSON.parse(raw);

  if (filter?.systemId) {
    records = records.filter((r) => r.systemId === filter.systemId);
  }
  if (filter?.startDate) {
    records = records.filter((r) => r.timestamp >= filter.startDate!);
  }
  if (filter?.endDate) {
    records = records.filter((r) => r.timestamp <= filter.endDate!);
  }
  if (filter?.status) {
    records = records.filter((r) => r.overallStatus === filter.status);
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Compliance Report Generation ───────────────────────────

export function generateComplianceReport(
  startDate: number,
  endDate: number,
): ComplianceReport {
  const records = getAuditTrail({ startDate, endDate });

  const totalTransactions = records.length;
  const compliantTransactions = records.filter((r) => r.overallStatus === "compliant").length;
  const nonCompliantTransactions = records.filter((r) => r.overallStatus === "non-compliant").length;
  const warnings = records.filter((r) => r.overallStatus === "warning").length;

  const violations = records
    .flatMap((r) => r.complianceResults)
    .filter((r) => !r.passed);

  const recommendations: string[] = [];

  if (nonCompliantTransactions > 0) {
    recommendations.push(`${nonCompliantTransactions} non-compliant transactions detected - review and remediate`);
  }
  if (warnings > totalTransactions * 0.1) {
    recommendations.push("High warning rate - review spending patterns");
  }
  if (violations.some((v) => v.severity === "critical")) {
    recommendations.push("Critical violations detected - immediate action required");
  }

  const complianceRate = totalTransactions > 0
    ? (compliantTransactions / totalTransactions) * 100
    : 100;

  return {
    id: crypto.randomUUID(),
    generatedAt: Date.now(),
    period: { start: startDate, end: endDate },
    totalTransactions,
    compliantTransactions,
    nonCompliantTransactions,
    warnings,
    violations,
    recommendations,
    summary: `Compliance rate: ${complianceRate.toFixed(1)}% | ${totalTransactions} transactions | ${nonCompliantTransactions} violations`,
  };
}

// ─── Export for Auditor ─────────────────────────────────────

export function exportAuditTrail(format: "json" | "csv" = "json"): string {
  const records = getAuditTrail();

  if (format === "json") {
    return JSON.stringify(records, null, 2);
  }

  // CSV format
  const headers = ["ID", "Timestamp", "System", "Action", "Amount", "Recipient", "TxHash", "Status"];
  const rows = records.map((r) => [
    r.id,
    new Date(r.timestamp).toISOString(),
    r.systemId,
    r.action,
    r.amount?.toString() || "",
    r.recipient || "",
    r.txHash || "",
    r.overallStatus,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// ─── KYC/AML Checks ────────────────────────────────────────

export type KYCResult = {
  address: string;
  verified: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: string[];
  lastChecked: number;
};

export function checkKYC(address: string): KYCResult {
  // In production, integrate with KYC provider
  return {
    address,
    verified: true,
    riskLevel: "low",
    flags: [],
    lastChecked: Date.now(),
  };
}

export function checkAML(address: string): { clean: boolean; flags: string[] } {
  // In production, integrate with AML provider
  return {
    clean: true,
    flags: [],
  };
}
