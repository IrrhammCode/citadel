import OpenAI from "openai";
import { z } from "zod";
import type { AuditRequestBody, AuditVerdict } from "@/types/audit";
import {
  buildComplianceUserPrompt,
  COMPLIANCE_SYSTEM_PROMPT,
} from "@/lib/venice/prompts";

const verdictSchema = z.object({
  decision: z.enum(["approved", "blocked"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  flags: z.array(z.string()),
});

function getVeniceClient() {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    throw new Error("VENICE_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.venice.ai/api/v1",
  });
}

function parseVerdict(raw: string): AuditVerdict {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
  const parsed = verdictSchema.parse(JSON.parse(jsonStr));
  return parsed;
}

export async function auditSpendRequest(
  body: AuditRequestBody,
): Promise<AuditVerdict> {
  const client = getVeniceClient();

  const response = await client.chat.completions.create({
    model: process.env.VENICE_MODEL ?? "llama-3.3-70b",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: COMPLIANCE_SYSTEM_PROMPT },
      { role: "user", content: buildComplianceUserPrompt(body) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Venice returned an empty response");
  }

  try {
    return parseVerdict(content);
  } catch {
    // Fallback retry without strict JSON mode
    const retry = await client.chat.completions.create({
      model: process.env.VENICE_MODEL ?? "llama-3.3-70b",
      temperature: 0,
      messages: [
        { role: "system", content: COMPLIANCE_SYSTEM_PROMPT },
        { role: "user", content: buildComplianceUserPrompt(body) },
        {
          role: "user",
          content: "Respond with JSON only. No markdown fences.",
        },
      ],
    });
    const retryContent = retry.choices[0]?.message?.content;
    if (!retryContent) throw new Error("Venice retry returned empty response");
    return parseVerdict(retryContent);
  }
}
