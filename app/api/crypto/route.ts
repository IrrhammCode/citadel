import { NextResponse } from "next/server";
import { getETHBalance, getUSDCBalance, verifyAddressOnChain, getBlockNumber, SUPPORTED_NETWORKS } from "@/lib/venice/rpc";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const address = searchParams.get("address");
  const network = searchParams.get("network") || "ethereum-sepolia";

  try {
    switch (action) {
      case "balance": {
        if (!address) {
          return NextResponse.json({ error: "Address required" }, { status: 400 });
        }
        const balance = await getETHBalance(address, network);
        return NextResponse.json({ address, network, balance });
      }

      case "usdc": {
        if (!address) {
          return NextResponse.json({ error: "Address required" }, { status: 400 });
        }
        const balance = await getUSDCBalance(address, undefined, network);
        return NextResponse.json({ address, network, usdcBalance: balance });
      }

      case "verify": {
        if (!address) {
          return NextResponse.json({ error: "Address required" }, { status: 400 });
        }
        const verification = await verifyAddressOnChain(address, network);
        return NextResponse.json({ address, network, ...verification });
      }

      case "block": {
        const blockNumber = await getBlockNumber(network);
        return NextResponse.json({ network, blockNumber });
      }

      case "networks": {
        return NextResponse.json({ networks: SUPPORTED_NETWORKS });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
