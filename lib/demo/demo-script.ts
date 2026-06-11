/**
 * Demo Script
 * Step-by-step demo flow for hackathon presentation
 */

export type DemoStep = {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  action: () => Promise<void>;
  expected: string;
};

export class DemoRunner {
  private currentStep = 0;
  private isRunning = false;
  private onComplete?: () => void;
  private onStepChange?: (step: number, total: number) => void;

  constructor(
    private steps: DemoStep[],
    callbacks?: {
      onComplete?: () => void;
      onStepChange?: (step: number, total: number) => void;
    },
  ) {
    this.onComplete = callbacks?.onComplete;
    this.onStepChange = callbacks?.onStepChange;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;

    for (const step of this.steps) {
      if (!this.isRunning) break;

      this.onStepChange?.(this.currentStep + 1, this.steps.length);

      try {
        await step.action();
        await this.wait(step.duration * 1000);
      } catch (error) {
        console.error(`Demo step failed: ${step.title}`, error);
      }

      this.currentStep++;
    }

    this.isRunning = false;
    this.onComplete?.();
  }

  stop() {
    this.isRunning = false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Demo Steps ─────────────────────────────────────────────

export function createDemoSteps(): DemoStep[] {
  return [
    {
      id: "connect",
      title: "Connect MetaMask",
      description: "CFO connects MetaMask wallet to Citadel",
      duration: 3,
      action: async () => {
        console.log("Step 1: Connect MetaMask");
        // In real demo, this triggers MetaMask connection
      },
      expected: "Wallet connected, address displayed",
    },
    {
      id: "dashboard",
      title: "View Dashboard",
      description: "CFO sees overview of all autonomous agents",
      duration: 5,
      action: async () => {
        console.log("Step 2: View Dashboard");
        // Navigate to dashboard
      },
      expected: "Dashboard shows 26 agents, budget pool, recent activity",
    },
    {
      id: "grant-permission",
      title: "Grant Permission",
      description: "CFO grants ERC-7715 permission to Marketing Agent",
      duration: 8,
      action: async () => {
        console.log("Step 3: Grant Permission");
        // MetaMask popup appears for permission grant
      },
      expected: "MetaMask popup, permission granted, stored on-chain",
    },
    {
      id: "agent-spend",
      title: "Agent Requests Spend",
      description: "Marketing Agent requests to pay vendor 8 USDC",
      duration: 5,
      action: async () => {
        console.log("Step 4: Agent Spend Request");
        // Agent submits spend request
      },
      expected: "Spend request submitted to Venice AI audit",
    },
    {
      id: "venice-audit",
      title: "Venice AI Audit",
      description: "AI compliance firewall reviews the request",
      duration: 5,
      action: async () => {
        console.log("Step 5: Venice AI Audit");
        // Venice AI processes the request
      },
      expected: "Venice AI approves with 94% confidence",
    },
    {
      id: "execute",
      title: "Execute Transaction",
      description: "Approved transaction executes on-chain via ERC-7710",
      duration: 8,
      action: async () => {
        console.log("Step 6: Execute Transaction");
        // Execute on-chain
      },
      expected: "USDC transferred, tx hash displayed",
    },
    {
      id: "blocked",
      title: "Block Suspicious Request",
      description: "Agent tries to send to suspicious address, Venice blocks",
      duration: 5,
      action: async () => {
        console.log("Step 7: Block Suspicious");
        // Submit suspicious request
      },
      expected: "Venice AI blocks with reasoning, anomaly logged",
    },
    {
      id: "trust-update",
      title: "Trust Score Update",
      description: "Agent trust score updates based on performance",
      duration: 3,
      action: async () => {
        console.log("Step 8: Trust Update");
        // Show trust score change
      },
      expected: "Trust score increased, KPI progress shown",
    },
    {
      id: "agent-brain",
      title: "Agent Brain Decision",
      description: "Agent autonomously decides next action using Venice AI",
      duration: 8,
      action: async () => {
        console.log("Step 9: Agent Brain");
        // Trigger agent brain decision
      },
      expected: "Agent thinks, decides, acts autonomously",
    },
    {
      id: "complete",
      title: "Demo Complete",
      description: "Full zero-trust treasury flow demonstrated",
      duration: 3,
      action: async () => {
        console.log("Step 10: Complete");
        // Show summary
      },
      expected: "All features demonstrated successfully",
    },
  ];
}
