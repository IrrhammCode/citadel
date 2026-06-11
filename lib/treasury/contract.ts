/**
 * Treasury Contract Integration
 * Real on-chain treasury management via MetaMask Smart Account
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  erc20Abi,
} from "viem";
import { sepolia } from "viem/chains";
import { getSessionAccount } from "@/lib/metamask/session-account";
import { CHAIN, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/constants";
import { getTransactionReceipt } from "@/lib/venice/rpc";

// ─── Types ──────────────────────────────────────────────────

export type TreasuryBalance = {
  usdc: bigint;
  usdcFormatted: string;
  eth: bigint;
  ethFormatted: string;
  lastUpdated: number;
};

export type TreasuryTransaction = {
  id: string;
  type: "deposit" | "withdraw" | "transfer" | "budget_allocation";
  from: string;
  to: string;
  amount: number;
  token: "USDC" | "ETH";
  txHash?: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type BudgetAllocation = {
  systemId: string;
  allocated: number;
  spent: number;
  remaining: number;
  lastUpdated: number;
};

// ─── Get Treasury Balance ───────────────────────────────────

export async function getTreasuryBalance(
  smartAccountAddress: string,
): Promise<TreasuryBalance> {
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(),
  });

  // Get ETH balance
  const ethBalance = await publicClient.getBalance({
    address: smartAccountAddress as `0x${string}`,
  });

  // Get USDC balance
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [smartAccountAddress as `0x${string}`],
  });

  return {
    usdc: usdcBalance,
    usdcFormatted: formatUnits(usdcBalance, USDC_DECIMALS),
    eth: ethBalance,
    ethFormatted: formatUnits(ethBalance, 18),
    lastUpdated: Date.now(),
  };
}

// ─── Transfer USDC ──────────────────────────────────────────

export async function transferUSDC(
  recipient: string,
  amount: number,
  memo: string,
): Promise<{ txHash: string; success: boolean }> {
  const sessionAccount = getSessionAccount();
  const amountWei = parseUnits(amount.toString(), USDC_DECIMALS);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient as `0x${string}`, amountWei],
  });

  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account: sessionAccount,
    chain: CHAIN,
    transport: http(),
  });

  const hash = await walletClient.sendTransaction({
    account: sessionAccount,
    chain: CHAIN,
    to: USDC_ADDRESS,
    data,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    txHash: hash,
    success: receipt.status === "success",
  };
}

// ─── Get Transaction History ────────────────────────────────

export async function getTransactionHistory(
  address: string,
  limit: number = 50,
): Promise<TreasuryTransaction[]> {
  // In production, this would query an indexer or subgraph
  // For now, return from localStorage
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem("citadel_treasury_txs");
  if (!raw) return [];

  const txs: TreasuryTransaction[] = JSON.parse(raw);
  return txs
    .filter((tx) => tx.from === address || tx.to === address)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ─── Record Transaction ─────────────────────────────────────

export function recordTransaction(tx: TreasuryTransaction) {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem("citadel_treasury_txs");
  const txs: TreasuryTransaction[] = raw ? JSON.parse(raw) : [];
  txs.push(tx);
  localStorage.setItem("citadel_treasury_txs", JSON.stringify(txs));
}

// ─── Budget Management ──────────────────────────────────────

export function getBudgetAllocations(): BudgetAllocation[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem("citadel_budget_allocations");
  if (!raw) return [];

  return JSON.parse(raw);
}

export function updateBudgetAllocation(
  systemId: string,
  amount: number,
  operation: "allocate" | "spend" | "refund",
): BudgetAllocation {
  const allocations = getBudgetAllocations();
  const existing = allocations.find((a) => a.systemId === systemId);

  if (existing) {
    switch (operation) {
      case "allocate":
        existing.allocated += amount;
        existing.remaining += amount;
        break;
      case "spend":
        existing.spent += amount;
        existing.remaining -= amount;
        break;
      case "refund":
        existing.spent -= amount;
        existing.remaining += amount;
        break;
    }
    existing.lastUpdated = Date.now();
  } else {
    allocations.push({
      systemId,
      allocated: operation === "allocate" ? amount : 0,
      spent: operation === "spend" ? amount : 0,
      remaining: operation === "allocate" ? amount : 0,
      lastUpdated: Date.now(),
    });
  }

  localStorage.setItem("citadel_budget_allocations", JSON.stringify(allocations));
  return allocations.find((a) => a.systemId === systemId)!;
}

// ─── Treasury Stats ─────────────────────────────────────────

export function getTreasuryStats(): {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  utilizationRate: number;
  agentCount: number;
} {
  const allocations = getBudgetAllocations();
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
  const totalSpent = allocations.reduce((sum, a) => sum + a.spent, 0);
  const totalRemaining = allocations.reduce((sum, a) => sum + a.remaining, 0);

  return {
    totalAllocated,
    totalSpent,
    totalRemaining,
    utilizationRate: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
    agentCount: allocations.length,
  };
}

// ─── Verify On-Chain Transaction ────────────────────────────

export async function verifyTransaction(
  txHash: string,
): Promise<{
  confirmed: boolean;
  blockNumber?: number;
  gasUsed?: string;
  status?: string;
}> {
  try {
    const receipt = await getTransactionReceipt(txHash);
    if (!receipt) return { confirmed: false };

    return {
      confirmed: true,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: String(receipt.gasUsed),
      status: receipt.status === "0x1" ? "success" : "failed",
    };
  } catch {
    return { confirmed: false };
  }
}
