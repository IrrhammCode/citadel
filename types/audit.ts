export type AuditDecision = "approved" | "blocked";

export type AuditVerdict = {
  decision: AuditDecision;
  confidence: number;
  reasoning: string;
  flags: string[];
};

export type SpendRequest = {
  amount: string;
  token: string;
  recipient: string;
  memo: string;
};

export type AuditRecord = {
  id: string;
  systemId: string;
  systemName: string;
  spendRequest: SpendRequest;
  verdict: AuditVerdict;
  timestamp: number;
  txHash?: string;
};

export type AuditRequestBody = {
  systemId: string;
  spendRequest: SpendRequest;
  permission: {
    maxDailySpend: string;
    expiry: number;
    justification: string;
  };
  priorSpendToday?: string;
  customPrompt?: string;
};
