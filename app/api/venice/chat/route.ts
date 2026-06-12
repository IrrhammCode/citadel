import { NextResponse } from "next/server";
import { z } from "zod";
import { VeniceService } from "@/lib/venice/service";
import { isVeniceConfigured } from "@/lib/venice/client";
import { apiGuard } from "@/lib/server/api-guard";

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })),
  systemContext: z.string().optional(),
});

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    if (!isVeniceConfigured()) {
      return NextResponse.json({ error: "Venice AI is not configured" }, { status: 503 });
    }

    const body = chatSchema.parse(await request.json());
    const result = await VeniceService.chat(
      [
        ...(body.systemContext ? [{ role: "system" as const, content: body.systemContext }] : []),
        ...body.messages,
      ],
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
    }
    console.error("Venice chat error:", error);
    return NextResponse.json({ error: "Venice chat failed" }, { status: 500 });
  }
}
