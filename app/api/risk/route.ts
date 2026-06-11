import { NextResponse } from "next/server";
import {
  assessTransactionRisk,
  getRiskHistory,
  getRiskColor,
} from "@/lib/risk/scoring";
import type { TransactionInput } from "@/lib/risk/scoring";

// ── POST — Assess transaction risk ──────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TransactionInput;

    if (!body.transactionId || !body.systemId || !body.recipientAddress) {
      return NextResponse.json(
        { error: "Missing required fields: transactionId, systemId, recipientAddress" },
        { status: 400 }
      );
    }

    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        { error: "Missing required field: amount" },
        { status: 400 }
      );
    }

    const assessment = assessTransactionRisk(body);

    return NextResponse.json({
      ...assessment,
      color: getRiskColor(assessment.level),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to assess risk", details: String(err) },
      { status: 500 }
    );
  }
}

// ── GET — Risk assessment history ────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");

    if (!systemId) {
      return NextResponse.json(
        { error: "Missing required query param: systemId" },
        { status: 400 }
      );
    }

    const since = searchParams.get("since");
    const limit = searchParams.get("limit");

    const history = getRiskHistory(systemId, {
      since: since ? parseInt(since) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ systemId, count: history.length, history });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to retrieve risk history", details: String(err) },
      { status: 500 }
    );
  }
}
