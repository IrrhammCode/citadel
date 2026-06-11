import { NextResponse } from "next/server";
import { z } from "zod";

const addKnowledgeSchema = z.object({
  systemId: z.string(),
  type: z.enum(["text", "rule", "document", "url"]),
  title: z.string().optional(),
  content: z.string(),
  url: z.string().optional(),
});

// ── POST — Add knowledge ────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = addKnowledgeSchema.parse(await request.json());

    // In production, this would save to a database
    // For now, return success with extracted rules
    const rules = extractRules(body.content);

    return NextResponse.json({
      success: true,
      id: crypto.randomUUID(),
      systemId: body.systemId,
      type: body.type,
      title: body.title || `Knowledge from ${body.type}`,
      extractedRules: rules,
      message: `Added ${rules.length} rules from ${body.type}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to add knowledge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET — Get knowledge for agent ───────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");

    if (!systemId) {
      return NextResponse.json(
        { error: "systemId is required" },
        { status: 400 },
      );
    }

    // In production, this would fetch from a database
    // For now, return empty array
    return NextResponse.json({
      systemId,
      items: [],
      message: "Knowledge system ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get knowledge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Helper: Extract rules from text ─────────────────────────

function extractRules(content: string): string[] {
  const rules: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isRule =
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("• ") ||
      trimmed.match(/^\d+\.\s/) ||
      trimmed.toLowerCase().includes("must") ||
      trimmed.toLowerCase().includes("should") ||
      trimmed.toLowerCase().includes("always") ||
      trimmed.toLowerCase().includes("never") ||
      trimmed.toLowerCase().includes("limit") ||
      trimmed.toLowerCase().includes("maximum") ||
      trimmed.toLowerCase().includes("minimum") ||
      trimmed.toLowerCase().includes("required") ||
      trimmed.toLowerCase().includes("prohibited");

    if (isRule && trimmed.length > 10) {
      rules.push(trimmed);
    }
  }

  return rules;
}
