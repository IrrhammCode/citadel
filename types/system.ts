export type AutonomousSystem = {
  id: string;
  name: string;
  description: string;
  category: "marketing" | "devops" | "payroll" | string;
  status: "active" | "idle" | "restricted";
  customPrompt?: string;
  isCustom?: boolean;
};

export const AUTONOMOUS_SYSTEMS: AutonomousSystem[] = [
  {
    id: "marketing",
    name: "Marketing System",
    description: "Autonomous ad spend and vendor payments for growth campaigns.",
    category: "marketing",
    status: "active",
  },
  {
    id: "devops",
    name: "DevOps System",
    description: "Infrastructure provisioning and cloud vendor settlements.",
    category: "devops",
    status: "idle",
  },
  {
    id: "payroll",
    name: "Payroll Agent",
    description: "Scheduled contractor payouts with compliance guardrails.",
    category: "payroll",
    status: "restricted",
  },
];
