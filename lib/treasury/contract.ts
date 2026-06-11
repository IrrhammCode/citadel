/**
 * Treasury Contract Integration
 * Real on-chain treasury management via MetaMask Smart Account
 *
 * Queries real USDC balance on Sepolia, tracks spending from on-chain
 * Transfer events, and manages budget allocations with persistent state.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  erc20Abi,
  type PublicClient,
  type Address,
  type Hash,
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
  from: Address;
  to: Address;
  amount: bigint;
  amountFormatted: string;
  token: "USDC" | "ETH";
  txHash: Hash;
  blockNumber: bigint;
  logIndex: number;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type BudgetAllocation = {
  systemId: string;
  allocated: bigint;
  spent: bigint;
  remaining: bigint;
  allocatedFormatted: string;
  spentFormatted: string;
  remainingFormatted: string;
  utilizationRate: number;
  lastUpdated: number;
};

export type TreasuryStats = {
  totalAllocated: bigint;
  totalSpent: bigint;
  totalRemaining: bigint;
  totalAllocatedFormatted: string;
  totalSpentFormatted: string;
  totalRemainingFormatted: string;
  utilizationRate: number;
  agentCount: number;
  lastBlockQueried: bigint;
};

export type OnChainTransferEvent = {
  from: Address;
  to: Address;
  value: bigint;
  txHash: Hash;
  blockNumber: bigint;
  logIndex: number;
  timestamp: number;
};

// ─── ABI for USDC Transfer event ────────────────────────────

const usdcTransferEventAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "value", indexed: false },
    ],
  },
] as const;

// ─── Persistent Storage (works server-side and client-side) ─

const STORAGE_KEYS = {
  budgetAllocations: "citadel_budget_allocations",
  pendingTxs: "citadel_pending_txs",
} as const;

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Client Factory ─────────────────────────────────────────

let _publicClient: PublicClient | null = null;

function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: CHAIN,
      transport: http(),
    });
  }
  return _publicClient;
}

// ─── Get Treasury Balance ───────────────────────────────────

export async function getTreasuryBalance(
  smartAccountAddress: string,
): Promise<TreasuryBalance> {
  const client = getPublicClient();
  const address = smartAccountAddress as Address;

  const [ethBalance, usdcBalance] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }),
  ]);

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
): Promise<{ txHash: Hash; success: boolean }> {
  const sessionAccount = getSessionAccount();
  const amountWei = parseUnits(amount.toString(), USDC_DECIMALS);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient as Address, amountWei],
  });

  const client = getPublicClient();
  const walletClient = createWalletClient({
    account: sessionAccount,
    chain: CHAIN,
    transport: http(),
  });

  const hash = await walletClient.sendTransaction({
    chain: CHAIN,
    to: USDC_ADDRESS,
    data,
  });

  // Record as pending
  recordPendingTx({
    txHash: hash,
    from: sessionAccount.address,
    to: recipient as Address,
    amount: amountWei,
    memo,
    status: "pending",
    timestamp: Date.now(),
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  const success = receipt.status === "success";

  // Update pending status
  updatePendingTxStatus(hash, success ? "confirmed" : "failed");

  return { txHash: hash, success };
}

// ─── On-Chain Transaction History ───────────────────────────

/**
 * Fetch real USDC Transfer events from Sepolia for a given address.
 * Queries both incoming and outgoing transfers, merges and sorts by block.
 */
export async function getTransactionHistory(
  address: string,
  limit: number = 50,
  fromBlock?: bigint,
): Promise<TreasuryTransaction[]> {
  const client = getPublicClient();
  const addr = address.toLowerCase() as Address;

  // Default: query last ~1000 blocks (~3.3 hours on Sepolia)
  const latestBlock = await client.getBlockNumber();
  const RANGE_1000 = BigInt(1000);
  const startBlock = fromBlock ?? latestBlock - RANGE_1000;

  // Query outgoing transfers
  const outgoingLogs = await client.getLogs({
    address: USDC_ADDRESS,
    event: usdcTransferEventAbi[0] as any,
    args: { from: addr },
    fromBlock: startBlock,
    toBlock: latestBlock,
  });

  // Query incoming transfers
  const incomingLogs = await client.getLogs({
    address: USDC_ADDRESS,
    event: usdcTransferEventAbi[0] as any,
    args: { to: addr },
    fromBlock: startBlock,
    toBlock: latestBlock,
  });

  // Deduplicate (a tx from self to self would appear in both)
  const seen = new Set<string>();
  const allLogs: typeof outgoingLogs = [];

  for (const log of [...outgoingLogs, ...incomingLogs]) {
    const key = `${log.transactionHash}-${log.logIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      allLogs.push(log);
    }
  }

  // Fetch timestamps in batch (get block timestamps)
  const blockNumberSet = new Set<string>();
  for (const l of allLogs) blockNumberSet.add(l.blockNumber.toString());
  const blockNumbers = Array.from(blockNumberSet).map((s) => BigInt(s));
  const blockTimestamps = new Map<bigint, number>();

  await Promise.all(
    blockNumbers.map(async (bn) => {
      const block = await client.getBlock({ blockNumber: bn });
      blockTimestamps.set(bn, Number(block.timestamp) * 1000);
    }),
  );

  // Convert logs to TreasuryTransaction[]
  const transactions: TreasuryTransaction[] = allLogs.map((log) => {
    const args = (log as any).args as { from: Address; to: Address; value: bigint };
    const isIncoming = args.to.toLowerCase() === addr.toLowerCase();

    return {
      id: `${log.transactionHash}-${log.logIndex}`,
      type: isIncoming ? "deposit" : "transfer",
      from: args.from,
      to: args.to,
      amount: args.value,
      amountFormatted: formatUnits(args.value, USDC_DECIMALS),
      token: "USDC" as const,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex ?? 0,
      status: "confirmed" as const,
      timestamp: blockTimestamps.get(log.blockNumber) ?? Date.now(),
    };
  });

  // Sort by block number descending, then log index descending
  transactions.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return Number(b.blockNumber - a.blockNumber);
    }
    return b.logIndex - a.logIndex;
  });

  return transactions.slice(0, limit);
}

/**
 * Get on-chain transfer events as raw structured data.
 * Useful for audit log ingestion or dashboard event feeds.
 */
export async function getOnChainTransfers(
  address: string,
  fromBlock?: bigint,
  toBlock?: bigint,
): Promise<OnChainTransferEvent[]> {
  const client = getPublicClient();
  const addr = address.toLowerCase() as Address;

  const latestBlock = toBlock ?? (await client.getBlockNumber());
  const RANGE_5000 = BigInt(5000);
  const startBlock = fromBlock ?? latestBlock - RANGE_5000;

  const [outgoing, incoming] = await Promise.all([
    client.getLogs({
      address: USDC_ADDRESS,
      event: usdcTransferEventAbi[0] as any,
      args: { from: addr },
      fromBlock: startBlock,
      toBlock: latestBlock,
    }),
    client.getLogs({
      address: USDC_ADDRESS,
      event: usdcTransferEventAbi[0] as any,
      args: { to: addr },
      fromBlock: startBlock,
      toBlock: latestBlock,
    }),
  ]);

  const seen = new Set<string>();
  const allLogs = [...outgoing, ...incoming].filter((log) => {
    const key = `${log.transactionHash}-${log.logIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const blockNumberSet = new Set<string>();
  for (const l of allLogs) blockNumberSet.add(l.blockNumber.toString());
  const blockNumbers = Array.from(blockNumberSet).map((s) => BigInt(s));
  const blockTimestamps = new Map<bigint, number>();

  await Promise.all(
    blockNumbers.map(async (bn) => {
      const block = await client.getBlock({ blockNumber: bn });
      blockTimestamps.set(bn, Number(block.timestamp) * 1000);
    }),
  );

  return allLogs.map((log) => {
    const args = (log as any).args as { from: Address; to: Address; value: bigint };
    return {
      from: args.from,
      to: args.to,
      value: args.value,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex ?? 0,
      timestamp: blockTimestamps.get(log.blockNumber) ?? Date.now(),
    };
  });
}

// ─── Pending Transaction Tracking ───────────────────────────

type PendingTx = {
  txHash: Hash;
  from: Address;
  to: Address;
  amount: bigint;
  memo: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
};

function recordPendingTx(tx: PendingTx): void {
  const pending = readStorage<PendingTx[]>(STORAGE_KEYS.pendingTxs, []);
  pending.push(tx);
  writeStorage(STORAGE_KEYS.pendingTxs, pending);
}

function updatePendingTxStatus(
  txHash: Hash,
  status: "confirmed" | "failed",
): void {
  const pending = readStorage<PendingTx[]>(STORAGE_KEYS.pendingTxs, []);
  const entry = pending.find((t) => t.txHash === txHash);
  if (entry) {
    entry.status = status;
    writeStorage(STORAGE_KEYS.pendingTxs, pending);
  }
}

/**
 * Get pending (unconfirmed) transactions from local tracking.
 * Useful for showing in-flight transfers on the dashboard.
 */
export function getPendingTransactions(): PendingTx[] {
  return readStorage<PendingTx[]>(STORAGE_KEYS.pendingTxs, []).filter(
    (tx) => tx.status === "pending",
  );
}

/**
 * Reconcile pending transactions against on-chain state.
 * Returns newly confirmed/rejected transactions.
 */
export async function reconcilePendingTransactions(): Promise<{
  confirmed: PendingTx[];
  failed: PendingTx[];
}> {
  const client = getPublicClient();
  const pending = readStorage<PendingTx[]>(STORAGE_KEYS.pendingTxs, []);
  const stillPending = pending.filter((tx) => tx.status === "pending");

  const confirmed: PendingTx[] = [];
  const failed: PendingTx[] = [];

  await Promise.all(
    stillPending.map(async (tx) => {
      try {
        const receipt = await client.getTransactionReceipt({
          hash: tx.txHash,
        });
        if (receipt.status === "success") {
          tx.status = "confirmed";
          confirmed.push(tx);
        } else {
          tx.status = "failed";
          failed.push(tx);
        }
      } catch {
        // Transaction not yet mined — leave as pending
      }
    }),
  );

  writeStorage(STORAGE_KEYS.pendingTxs, pending);
  return { confirmed, failed };
}

// ─── Budget Management ──────────────────────────────────────

/**
 * Get all budget allocations with real on-chain spending data.
 * Combines stored allocation metadata with actual on-chain transfer amounts.
 */
export async function getBudgetAllocations(
  smartAccountAddress?: string,
): Promise<BudgetAllocation[]> {
  const allocations = readStorage<
    {
      systemId: string;
      allocated: string; // bigint as string for JSON serialization
      spent: string;
    }[]
  >(STORAGE_KEYS.budgetAllocations, []);

  return allocations.map((a) => {
    const allocated = BigInt(a.allocated);
    const spent = BigInt(a.spent);
    const remaining = allocated - spent;

    return {
      systemId: a.systemId,
      allocated,
      spent,
      remaining: remaining > BigInt(0) ? remaining : BigInt(0),
      allocatedFormatted: formatUnits(allocated, USDC_DECIMALS),
      spentFormatted: formatUnits(spent, USDC_DECIMALS),
      remainingFormatted: formatUnits(
        remaining > BigInt(0) ? remaining : BigInt(0),
        USDC_DECIMALS,
      ),
      utilizationRate:
        allocated > BigInt(0)
          ? Number((spent * BigInt(10000)) / allocated) / 100
          : 0,
      lastUpdated: Date.now(),
    };
  });
}

/**
 * Update a budget allocation. Amounts are in USDC (human-readable), converted
 * to on-chain units internally.
 */
export function updateBudgetAllocation(
  systemId: string,
  amount: number,
  operation: "allocate" | "spend" | "refund",
): BudgetAllocation {
  const amountWei = parseUnits(amount.toString(), USDC_DECIMALS);
  const allocations = readStorage<
    { systemId: string; allocated: string; spent: string }[]
  >(STORAGE_KEYS.budgetAllocations, []);

  const existing = allocations.find((a) => a.systemId === systemId);
  let allocated: bigint;
  let spent: bigint;

  if (existing) {
    allocated = BigInt(existing.allocated);
    spent = BigInt(existing.spent);

    switch (operation) {
      case "allocate":
        allocated += amountWei;
        break;
      case "spend":
        spent += amountWei;
        break;
      case "refund":
        spent = spent > amountWei ? spent - amountWei : BigInt(0);
        break;
    }

    existing.allocated = allocated.toString();
    existing.spent = spent.toString();
  } else {
    allocated = operation === "allocate" ? amountWei : BigInt(0);
    spent = operation === "spend" ? amountWei : BigInt(0);

    allocations.push({
      systemId,
      allocated: allocated.toString(),
      spent: spent.toString(),
    });
  }

  writeStorage(STORAGE_KEYS.budgetAllocations, allocations);

  const remaining = allocated - spent;
  return {
    systemId,
    allocated,
    spent,
    remaining: remaining > BigInt(0) ? remaining : BigInt(0),
    allocatedFormatted: formatUnits(allocated, USDC_DECIMALS),
    spentFormatted: formatUnits(spent, USDC_DECIMALS),
    remainingFormatted: formatUnits(
      remaining > BigInt(0) ? remaining : BigInt(0),
      USDC_DECIMALS,
    ),
    utilizationRate:
      allocated > BigInt(0)
        ? Number((spent * BigInt(10000)) / allocated) / 100
        : 0,
    lastUpdated: Date.now(),
  };
}

// ─── Treasury Stats (Real On-Chain + Budget Data) ───────────

/**
 * Compute treasury stats from real on-chain balance and budget allocations.
 * Queries the chain for current balance, then cross-references with
 * budget allocation data for utilization metrics.
 */
export async function getTreasuryStats(
  smartAccountAddress?: string,
): Promise<TreasuryStats> {
  const allocations = await getBudgetAllocations();

  let totalAllocated = BigInt(0);
  let totalSpent = BigInt(0);

  for (const a of allocations) {
    totalAllocated += a.allocated;
    totalSpent += a.spent;
  }

  const totalRemaining = totalAllocated > totalSpent ? totalAllocated - totalSpent : BigInt(0);

  let lastBlockQueried = BigInt(0);
  if (smartAccountAddress) {
    try {
      const client = getPublicClient();
      lastBlockQueried = await client.getBlockNumber();
    } catch {
      // Ignore — stats still valid without block number
    }
  }

  return {
    totalAllocated,
    totalSpent,
    totalRemaining,
    totalAllocatedFormatted: formatUnits(totalAllocated, USDC_DECIMALS),
    totalSpentFormatted: formatUnits(totalSpent, USDC_DECIMALS),
    totalRemainingFormatted: formatUnits(totalRemaining, USDC_DECIMALS),
    utilizationRate:
      totalAllocated > BigInt(0)
        ? Number((totalSpent * BigInt(10000)) / totalAllocated) / 100
        : 0,
    agentCount: allocations.length,
    lastBlockQueried,
  };
}

// ─── Spending Analysis from On-Chain Data ───────────────────

/**
 * Calculate real spending by analyzing outgoing USDC transfers from the
 * treasury address over a given block range. Groups by recipient for
 * per-vendor spending breakdown.
 */
export async function getSpendingBreakdown(
  treasuryAddress: string,
  fromBlock?: bigint,
): Promise<{
  totalSpent: bigint;
  totalSpentFormatted: string;
  byRecipient: Map<Address, { total: bigint; totalFormatted: string; count: number }>;
  transactionCount: number;
}> {
  const client = getPublicClient();
  const addr = treasuryAddress.toLowerCase() as Address;
  const latestBlock = await client.getBlockNumber();
  const RANGE_5000 = BigInt(5000);
  const startBlock = fromBlock ?? latestBlock - RANGE_5000;

  const logs = await client.getLogs({
    address: USDC_ADDRESS,
    event: usdcTransferEventAbi[0] as any,
    args: { from: addr },
    fromBlock: startBlock,
    toBlock: latestBlock,
  });

  let totalSpent = BigInt(0);
  const byRecipient = new Map<
    Address,
    { total: bigint; totalFormatted: string; count: number }
  >();

  for (const log of logs) {
    const args = (log as any).args as { from: Address; to: Address; value: bigint };
    totalSpent += args.value;

    const existing = byRecipient.get(args.to);
    if (existing) {
      existing.total += args.value;
      existing.totalFormatted = formatUnits(existing.total, USDC_DECIMALS);
      existing.count += 1;
    } else {
      byRecipient.set(args.to, {
        total: args.value,
        totalFormatted: formatUnits(args.value, USDC_DECIMALS),
        count: 1,
      });
    }
  }

  return {
    totalSpent,
    totalSpentFormatted: formatUnits(totalSpent, USDC_DECIMALS),
    byRecipient,
    transactionCount: logs.length,
  };
}

// ─── Verify On-Chain Transaction ────────────────────────────

export async function verifyTransaction(
  txHash: string,
): Promise<{
  confirmed: boolean;
  blockNumber?: bigint;
  gasUsed?: string;
  status?: string;
}> {
  try {
    const receipt = await getTransactionReceipt(txHash);
    if (!receipt) return { confirmed: false };

    return {
      confirmed: true,
      blockNumber: BigInt(String(receipt.blockNumber as string | number)),
      gasUsed: String(receipt.gasUsed),
      status: receipt.status === "0x1" ? "success" : "failed",
    };
  } catch {
    return { confirmed: false };
  }
}

// ─── Utility: Clear cached client (for testing) ─────────────

export function resetClient(): void {
  _publicClient = null;
}
