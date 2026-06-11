import { NextRequest, NextResponse } from "next/server";
import {
  createAutomationRule,
  evaluateRules,
  executeRule,
  getAutomationRules,
  toggleRule,
  type RuleCondition,
  type RuleAction,
} from "@/lib/automation/smart-rules";

export async function GET() {
  const rules = getAutomationRules();
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Evaluate rules against provided state
  if (body.action === "evaluate") {
    const state: Record<string, number> = body.state ?? {};
    const triggered = evaluateRules(state);

    // Auto-execute if requested
    if (body.autoExecute) {
      const results = triggered.map((r) =>
        executeRule(r.id, state as Record<string, unknown>),
      );
      return NextResponse.json({ triggered, results });
    }

    return NextResponse.json({ triggered });
  }

  // Execute a specific rule
  if (body.action === "execute") {
    const result = executeRule(body.ruleId, body.state ?? {});
    return NextResponse.json(result);
  }

  // Create a new rule
  if (!body.name || !body.condition || !body.action || !body.targetSystem) {
    return NextResponse.json(
      { error: "Missing required fields: name, condition, action, targetSystem" },
      { status: 400 },
    );
  }

  const rule = createAutomationRule(
    body.name,
    body.condition as RuleCondition,
    body.action as RuleAction,
    body.targetSystem,
    body.enabled ?? true,
  );

  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (!body.ruleId) {
    return NextResponse.json({ error: "Missing ruleId" }, { status: 400 });
  }

  const rule = toggleRule(body.ruleId, body.enabled);
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json({ rule });
}
