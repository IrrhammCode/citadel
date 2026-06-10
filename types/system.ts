export type AutonomousSystem = {
  id: string;
  name: string;
  description: string;
  category: "marketing" | "devops" | "payroll" | string;
  status: "active" | "idle" | "restricted";
  goal?: string;
  budget?: number;
  kpiTargets?: { name: string; target: number; unit: string; isHigherBetter: boolean }[];
  customPrompt?: string;
  isCustom?: boolean;
};

export const AUTONOMOUS_SYSTEMS: AutonomousSystem[] = [
  {
    id: "marketing",
    name: "Marketing Agent",
    description: "Autonomous ad spend and vendor payments for growth campaigns.",
    category: "marketing",
    status: "active",
    goal: "Maximize Q2 marketing ROI with targeted vendor payments",
    budget: 500,
    kpiTargets: [
      { name: "ROI", target: 2.0, unit: "x", isHigherBetter: true },
      { name: "Vendor Diversity", target: 3, unit: "count", isHigherBetter: true },
      { name: "Max Single Payment", target: 100, unit: "usdc", isHigherBetter: false },
    ],
  },
  {
    id: "devops",
    name: "DevOps Agent",
    description: "Infrastructure provisioning and cloud vendor settlements.",
    category: "devops",
    status: "active",
    goal: "Maintain 99.9% uptime with cost-efficient infrastructure",
    budget: 300,
    kpiTargets: [
      { name: "Uptime", target: 99.9, unit: "%", isHigherBetter: true },
      { name: "Max Single Payment", target: 50, unit: "usdc", isHigherBetter: false },
      { name: "Vendor Lock-in", target: 70, unit: "%", isHigherBetter: false },
    ],
  },
  {
    id: "payroll",
    name: "Payroll Agent",
    description: "Scheduled contractor payouts with compliance guardrails.",
    category: "payroll",
    status: "active",
    goal: "Process contractor payments on time, every time",
    budget: 200,
    kpiTargets: [
      { name: "On-time Payments", target: 100, unit: "%", isHigherBetter: true },
      { name: "Contractors Paid", target: 5, unit: "count", isHigherBetter: true },
    ],
  },
];
