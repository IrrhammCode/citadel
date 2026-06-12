import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appendServerKnowledge,
  getServerKnowledgeItems,
  removeServerKnowledge,
} from "@/lib/agent/knowledge-server";
import { extractRulesFromText } from "@/lib/agent/knowledge";
import { apiGuard } from "@/lib/server/api-guard";

const addKnowledgeSchema = z.object({
  id: z.string().optional(),
  systemId: z.string(),
  type: z.enum(["text", "rule", "document", "url"]),
  title: z.string().optional(),
  content: z.string(),
  url: z.string().optional(),
  extractedRules: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = addKnowledgeSchema.parse(await request.json());
    const rules = body.extractedRules?.length
      ? body.extractedRules
      : extractRulesFromText(body.content);

    const item = appendServerKnowledge({
      id: body.id,
      systemId: body.systemId,
      type: body.type,
      title: body.title || `Knowledge from ${body.type}`,
      content: body.content,
      extractedRules: rules,
    });

    return NextResponse.json({
      success: true,
      item,
      message: `Persisted ${rules.length} rules for ${body.systemId}`,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");

    if (!systemId) {
      return NextResponse.json({ error: "systemId is required" }, { status: 400 });
    }

    const items = getServerKnowledgeItems(systemId);
    return NextResponse.json({ systemId, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get knowledge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const removed = removeServerKnowledge(id);
    return NextResponse.json({ success: removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete knowledge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
