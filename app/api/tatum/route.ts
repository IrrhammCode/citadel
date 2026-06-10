import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkMaliciousAddress,
  simulateTransaction,
  simulateERC20Transfer,
  getFeeEstimate,
  estimateGas,
  getPortfolio,
  getNativeBalance,
  getTransactionHistory,
  resolveName,
  reverseResolve,
  getExchangeRate,
  getAddressIntelligence,
  subscribeAddressActivity,
  getSubscriptions,
} from "@/lib/tatum/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const address = searchParams.get("address");
  const chain = searchParams.get("chain") || "ETH";

  try {
    switch (action) {
      case "malicious": {
        if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
        const result = await checkMaliciousAddress(address, chain);
        return NextResponse.json(result);
      }

      case "fee": {
        const result = await getFeeEstimate(chain);
        return NextResponse.json(result);
      }

      case "portfolio": {
        if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
        const result = await getPortfolio(address, chain);
        return NextResponse.json({ address, chain, tokens: result });
      }

      case "balance": {
        if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
        const result = await getNativeBalance(address, chain);
        return NextResponse.json({ address, chain, balance: result });
      }

      case "transactions": {
        if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const result = await getTransactionHistory(address, chain, pageSize);
        return NextResponse.json({ address, chain, transactions: result });
      }

      case "resolve": {
        const name = searchParams.get("name");
        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
        const result = await resolveName(name, chain);
        return NextResponse.json(result || { error: "Name not found" });
      }

      case "reverse": {
        if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
        const result = await reverseResolve(address, chain);
        return NextResponse.json({ address, name: result });
      }

      case "rate": {
        const currency = searchParams.get("currency") || "ETH";
        const base = searchParams.get("base") || "USD";
        const result = await getExchangeRate(currency, base);
        return NextResponse.json(result);
      }

      case "intelligence": {
        if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
        const result = await getAddressIntelligence(address, chain);
        return NextResponse.json(result);
      }

      case "subscriptions": {
        const result = await getSubscriptions();
        return NextResponse.json({ subscriptions: result });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tatum API failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "simulate": {
        const schema = z.object({
          chain: z.string(),
          from: z.string(),
          to: z.string(),
          data: z.string(),
          value: z.string().optional(),
        });
        const params = schema.parse(body);
        const result = await simulateTransaction(params);
        return NextResponse.json(result);
      }

      case "simulateERC20": {
        const schema = z.object({
          chain: z.string(),
          from: z.string(),
          to: z.string(),
          amount: z.string(),
          contractAddress: z.string(),
        });
        const params = schema.parse(body);
        const result = await simulateERC20Transfer(params);
        return NextResponse.json(result);
      }

      case "estimateGas": {
        const schema = z.object({
          chain: z.string(),
          from: z.string(),
          to: z.string(),
          amount: z.string(),
          data: z.string().optional(),
        });
        const params = schema.parse(body);
        const result = await estimateGas(params);
        return NextResponse.json(result);
      }

      case "subscribe": {
        const schema = z.object({
          chain: z.string(),
          address: z.string(),
          webhookUrl: z.string(),
        });
        const params = schema.parse(body);
        const result = await subscribeAddressActivity(params);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Tatum API failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
