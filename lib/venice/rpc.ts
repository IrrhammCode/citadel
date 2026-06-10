/**
 * Venice Crypto RPC — Blockchain RPC access via Venice AI
 * Supports Ethereum, Base, Arbitrum, Optimism, Polygon, etc.
 * Auth: API key or x402 wallet
 */

const VENICE_RPC_BASE = "https://api.venice.ai/api/v1/crypto/rpc";

type RPCRequest = {
  jsonrpc: "2.0";
  method: string;
  params: unknown[];
  id: number;
};

type RPCResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
};

/**
 * Send a JSON-RPC request via Venice Crypto RPC
 */
export async function veniceRPC(
  network: string,
  method: string,
  params: unknown[],
  apiKey?: string,
): Promise<unknown> {
  const key = apiKey || process.env.VENICE_API_KEY;
  if (!key) throw new Error("VENICE_API_KEY not configured");

  const request: RPCRequest = {
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  };

  const response = await fetch(`${VENICE_RPC_BASE}/${network}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Venice RPC error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RPCResponse;
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Get ETH balance via Venice Crypto RPC
 */
export async function getETHBalance(
  address: string,
  network: string = "ethereum-sepolia",
): Promise<string> {
  const balance = await veniceRPC(network, "eth_getBalance", [address, "latest"]);
  return balance as string;
}

/**
 * Get transaction receipt via Venice Crypto RPC
 */
export async function getTransactionReceipt(
  txHash: string,
  network: string = "ethereum-sepolia",
): Promise<Record<string, unknown> | null> {
  const receipt = await veniceRPC(network, "eth_getTransactionReceipt", [txHash]);
  return receipt as Record<string, unknown> | null;
}

/**
 * Get USDC balance via Venice Crypto RPC (ERC-20 balanceOf)
 */
export async function getUSDCBalance(
  address: string,
  usdcAddress: string = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  network: string = "ethereum-sepolia",
): Promise<string> {
  // balanceOf(address) selector: 0x70a08231
  const data = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;

  const result = await veniceRPC(network, "eth_call", [
    { to: usdcAddress, data },
    "latest",
  ]);

  return result as string;
}

/**
 * Get block number via Venice Crypto RPC
 */
export async function getBlockNumber(
  network: string = "ethereum-sepolia",
): Promise<number> {
  const blockNum = await veniceRPC(network, "eth_blockNumber", []);
  return parseInt(blockNum as string, 16);
}

/**
 * Verify address has on-chain activity via Venice Crypto RPC
 */
export async function verifyAddressOnChain(
  address: string,
  network: string = "ethereum-sepolia",
): Promise<{
  balance: string;
  hasActivity: boolean;
  riskLevel: "low" | "medium" | "high";
}> {
  try {
    const balance = await getETHBalance(address, network);
    const balanceNum = parseInt(balance, 16) / 1e18;

    // Check if address has any transaction history
    // Simple heuristic: if balance > 0, likely has activity
    const hasActivity = balanceNum > 0;

    let riskLevel: "low" | "medium" | "high" = "medium";
    if (balanceNum > 0.01) riskLevel = "low";
    else if (balanceNum === 0) riskLevel = "high";

    return { balance, hasActivity, riskLevel };
  } catch {
    return { balance: "0x0", hasActivity: false, riskLevel: "high" };
  }
}

/**
 * List supported Venice Crypto RPC networks
 */
export const SUPPORTED_NETWORKS = [
  { id: "ethereum-mainnet", name: "Ethereum Mainnet", chainId: 1 },
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: 11155111 },
  { id: "base-mainnet", name: "Base Mainnet", chainId: 8453 },
  { id: "base-sepolia", name: "Base Sepolia", chainId: 84532 },
  { id: "arbitrum-mainnet", name: "Arbitrum Mainnet", chainId: 42161 },
  { id: "optimism-mainnet", name: "Optimism Mainnet", chainId: 10 },
  { id: "polygon-mainnet", name: "Polygon Mainnet", chainId: 137 },
];
