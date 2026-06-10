export type ActivityEvent = {
  id: string;
  type: "audit" | "trust_change" | "anomaly" | "negotiation" | "report" | "execution" | "goal_progress" | "vendor_update";
  systemId: string;
  systemName: string;
  message: string;
  details?: string;
  severity: "info" | "success" | "warning" | "error";
  timestamp: number;
  metadata?: Record<string, unknown>;
};
