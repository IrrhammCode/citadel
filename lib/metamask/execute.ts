import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseUnits,
  erc20Abi,
} from "viem";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import type { GetGrantedExecutionPermissionsResult } from "@metamask/smart-accounts-kit/actions";
import { getSessionAccount } from "@/lib/metamask/session-account";
import { CHAIN, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/constants";
import type { SpendRequest } from "@/types/audit";
import { sendDelegatedTransaction } from "@/lib/oneshot/relayer";

/**
 * Execute a delegated transfer using ERC-7710 delegation.
 * 
 * Two execution paths:
 * 1. 1Shot Relayer — gasless execution via permissionless relayer
 * 2. Direct RPC — fallback for local testing
 */
export async function executeDelegatedTransfer(
  spendRequest: SpendRequest,
  grantedPermissions: GetGrantedExecutionPermissionsResult,
  useOneShot: boolean = false,
): Promise<`0x${string}`> {
  const permission = grantedPermissions[0];
  if (!permission) {
    throw new Error("No granted permission context found");
  }

  const sessionAccount = getSessionAccount();
  const amount = parseUnits(spendRequest.amount, USDC_DECIMALS);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [spendRequest.recipient as `0x${string}`, amount],
  });

  // Path 1: 1Shot Relayer (gasless)
  if (useOneShot || process.env.ONESHOT_API_KEY) {
    try {
      const txHash = await sendDelegatedTransaction({
        from: sessionAccount.address,
        to: USDC_ADDRESS,
        data,
        chainId: CHAIN.id,
        delegationManager: permission.delegationManager as string,
        permissionContext: permission.context as string,
      });
      return txHash as `0x${string}`;
    } catch (error) {
      console.warn("1Shot Relayer failed, falling back to direct RPC:", error);
    }
  }

  // Path 2: Direct RPC (fallback)
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account: sessionAccount,
    chain: CHAIN,
    transport: http(),
  }).extend(erc7710WalletActions());

  const hash = await walletClient.sendTransactionWithDelegation({
    account: sessionAccount,
    chain: CHAIN,
    to: USDC_ADDRESS,
    data,
    permissionContext: permission.context,
    delegationManager: permission.delegationManager,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
