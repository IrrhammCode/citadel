import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  encodeFunctionData,
  erc20Abi,
  type Address,
  type Hash,
} from "viem";
import { sepolia } from "viem/chains";
import { getSessionAccount } from "./session-account";
import { CHAIN, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/constants";
import { getPermissionForSystem } from "@/lib/storage";

// ─── Types ──────────────────────────────────────────────────

export type ExecutionResult = {
  txHash: Hash;
  success: boolean;
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  error?: string;
};

export class ExecutionError extends Error {
  code: string;
  txHash?: Hash;
  receipt?: any;
  cause?: Error;

  constructor(
    code: string,
    message: string,
    options?: { txHash?: Hash; receipt?: any; cause?: Error },
  ) {
    super(message);
    this.code = code;
    this.txHash = options?.txHash;
    this.receipt = options?.receipt;
    this.cause = options?.cause;
  }
}

// ─── Execute Delegated Transfer (REAL) ──────────────────────

export async function executeDelegatedTransfer(
  permission: any,
  recipient: Address,
  amount: number,
  memo: string,
): Promise<ExecutionResult> {
  const sessionAccount = getSessionAccount();
  const amountWei = parseUnits(amount.toString(), USDC_DECIMALS);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amountWei],
  });

  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  const walletClient = createWalletClient({
    account: sessionAccount,
    chain: CHAIN,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  try {
    // Execute via ERC-7710 delegation
    const hash = await walletClient.sendTransactionWithDelegation({
      account: sessionAccount,
      chain: CHAIN,
      to: USDC_ADDRESS,
      data,
      permissionContext: permission.permissionContext as `0x${string}`,
      delegationManager: permission.delegationManager as `0x${string}`,
    });

    // Wait for real confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 300_000, // 5 minutes
    });

    if (receipt.status === "reverted") {
      throw new ExecutionError("REVERTED", "Transaction reverted", {
        txHash: hash,
        receipt,
      });
    }

    return {
      txHash: hash,
      success: true,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
    };
  } catch (error) {
    if (error instanceof ExecutionError) throw error;

    return {
      txHash: "0x" as Hash,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Get USDC Balance (REAL) ────────────────────────────────

export async function getUSDCBalance(address: Address): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  return publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
}
