import { NextResponse } from "next/server";
import { z } from "zod";
import { apiGuard } from "@/lib/server/api-guard";

const schema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const { url } = schema.parse(await request.json());

    const res = await fetch(url, {
      headers: { "User-Agent": "Citadel-Knowledge-Bot/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "";
    let content: string;

    if (contentType.includes("application/json")) {
      content = JSON.stringify(await res.json(), null, 2);
    } else {
      const html = await res.text();
      content = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
    }

    return NextResponse.json({ content, url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
