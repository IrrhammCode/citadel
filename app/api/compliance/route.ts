import { NextResponse } from "next/server";
import { runComplianceCheck, getAuditTrail, generateComplianceReport, exportAuditTrail } from "@/lib/compliance/framework";

// ── GET — Get compliance info ───────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "trail";

    switch (type) {
      case "trail":
        const systemId = searchParams.get("systemId") || undefined;
        const limit = parseInt(searchParams.get("limit") || "100");
        const records = getAuditTrail({ systemId });
        return NextResponse.json(records.slice(0, limit));

      case "report":
        const startDate = parseInt(searchParams.get("startDate") || "0");
        const endDate = parseInt(searchParams.get("endDate") || String(Date.now()));
        return NextResponse.json(generateComplianceReport(startDate, endDate));

      case "export":
        const format = (searchParams.get("format") as "json" | "csv") || "json";
        return new NextResponse(exportAuditTrail(format), {
          headers: {
            "Content-Type": format === "json" ? "application/json" : "text/csv",
            "Content-Disposition": `attachment; filename=compliance-export.${format}`,
          },
        });

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get compliance info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Run compliance check ─────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "check") {
      const results = runComplianceCheck({
        systemId: body.systemId,
        amount: body.amount,
        recipient: body.recipient,
        memo: body.memo,
        timestamp: Date.now(),
      });
      return NextResponse.json({
        results,
        compliant: results.every((r) => r.passed),
        violations: results.filter((r) => !r.passed),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run compliance check";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
