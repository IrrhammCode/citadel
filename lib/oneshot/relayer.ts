/**
 * 1Shot API — Permissionless Relayer for gasless EIP-7710 transactions
 * 
 * Features:
 * - Gas abstraction (pay gas in USDC)
 * - EIP-7702 account upgrades
 * - Webhooks for tx status
 * - No signup required (public relayer)
 */

const ONESHOT_RELAYER_URL = "https://relayer.1shotapi.com/v1/rpc";

type OneShotRequest = {
  jsonrpc: "2.0";
  method: string;
  params: unknown[];
  id: number;
};

type OneShotResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
};

/**
 * Send a JSON-RPC request to 1Shot Public Relayer
 */
export async function oneShotRPC(
  method: string,
  params: unknown[],
  apiKey?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // API key is optional for public relayer
  if (apiKey || process.env.ONESHOT_API_KEY) {
    headers["Authorization"] = `Bearer ${apiKey || process.env.ONESHOT_API_KEY}`;
  }

  const request: OneShotRequest = {
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  };

  const response = await fetch(ONESHOT_RELAYER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`1Shot Relayer error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OneShotResponse;
  if (data.error) {
    throw new Error(`1Shot error: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Send a delegated transaction via 1Shot Relayer
 * This replaces direct RPC calls for gasless execution
 */
export async function sendDelegatedTransaction(
  params: {
    from: string;
    to: string;
    data: string;
    chainId: number;
    delegationManager?: string;
    permissionContext?: string;
  },
): Promise<string> {
  const result = await oneShotRPC("eth_sendTransaction", [
    {
      from: params.from,
      to: params.to,
      data: params.data,
      chainId: params.chainId,
      // 1Shot handles gas abstraction
      ...(params.delegationManager && { delegationManager: params.delegationManager }),
      ...(params.permissionContext && { permissionContext: params.permissionContext }),
    },
  ]);

  return result as string;
}

/**
 * Upgrade EOA to Smart Account via EIP-7702 using 1Shot
 */
export async function upgradeToSmartAccount(
  eoaAddress: string,
  chainId: number,
): Promise<{ txHash: string; smartAccountAddress: string }> {
  const result = await oneShotRPC("eth_sendTransaction", [
    {
      from: eoaAddress,
      to: eoaAddress, // Self-delegation for 7702
      data: "0x", // 1Shot handles the 7702 authorization
      chainId,
      type: "0x04", // EIP-7702 transaction type
    },
  ]);

  return {
    txHash: result as string,
    smartAccountAddress: eoaAddress, // After 7702, EOA becomes smart account
  };
}

/**
 * Check transaction status via 1Shot webhook or polling
 */
export async function getTransactionStatus(
  txHash: string,
): Promise<{ status: "pending" | "confirmed" | "failed"; receipt?: unknown }> {
  try {
    const result = await oneShotRPC("eth_getTransactionReceipt", [txHash]);
    if (result) {
      return { status: "confirmed", receipt: result };
    }
    return { status: "pending" };
  } catch {
    return { status: "failed" };
  }
}

/**
 * Get supported chains for 1Shot Relayer
 */
export const ONESHOT_SUPPORTED_CHAINS = [
  { chainId: 1, name: "Ethereum" },
  { chainId: 8453, name: "Base" },
  { chainId: 42161, name: "Arbitrum" },
  { chainId: 10, name: "Optimism" },
  { chainId: 137, name: "Polygon" },
  { chainId: 11155111, name: "Sepolia" },
];
