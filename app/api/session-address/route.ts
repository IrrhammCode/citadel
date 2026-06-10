import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/metamask/session-account";

export async function GET() {
  try {
    const address = getSessionAddress();
    return NextResponse.json({ address });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Session account unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
