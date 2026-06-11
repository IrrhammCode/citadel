import { NextRequest, NextResponse } from "next/server";
import {
  getChainBalances,
  getBridgeHistory,
  initiateBridge,
  getSupportedChains,
  getOptimalBridgeRoute,
} from "@/lib/treasury/cross-chain";

/** GET /api/treasury/cross-chain
 *  Query params: address, action (balances|history|chains|route), fromChain, toChain, token, status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get("action") ?? "balances";

    switch (action) {
      case "balances": {
        const address = searchParams.get("address");
        if (!address) {
          return NextResponse.json({ error: "address is required" }, { status: 400 });
        }
        const balances = await getChainBalances(address);
        return NextResponse.json({ balances });
      }

      case "history": {
        const status = searchParams.get("status") as "pending" | "completed" | "failed" | undefined;
        const chain = searchParams.get("chain") ?? undefined;
        const history = getBridgeHistory({ status, chain });
        return NextResponse.json({ history });
      }

      case "chains": {
        const chains = getSupportedChains();
        return NextResponse.json({ chains });
      }

      case "route": {
        const fromChain = searchParams.get("fromChain");
        const toChain = searchParams.get("toChain");
        const token = searchParams.get("token") ?? "ETH";
        if (!fromChain || !toChain) {
          return NextResponse.json({ error: "fromChain and toChain are required" }, { status: 400 });
        }
        const route = getOptimalBridgeRoute(fromChain, toChain, token);
        if (!route) {
          return NextResponse.json({ error: "No route found" }, { status: 404 });
        }
        return NextResponse.json({ route });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/treasury/cross-chain
 *  Body: { fromChain, toChain, token, amount }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromChain, toChain, token, amount } = body;

    if (!fromChain || !toChain || !token || amount == null) {
      return NextResponse.json(
        { error: "fromChain, toChain, token, and amount are required" },
        { status: 400 }
      );
    }

    const tx = await initiateBridge({ fromChain, toChain, token, amount });
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
