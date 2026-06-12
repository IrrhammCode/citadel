import { NextResponse } from "next/server";
import { AgentEventBus, type AgentEventType } from "@/lib/agent/event-bus";
import { getServerStore, hydrateServerStore } from "@/lib/server/store";
import { subscribeActivity, isRedisConfigured } from "@/lib/server/redis";

export async function GET(request: Request) {
  try {
    await hydrateServerStore();
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get("stream") === "true";

    if (stream) {
      const encoder = new TextEncoder();
      let lastFingerprint = "";
      let closed = false;

      const readable = new ReadableStream({
        start(controller) {
          const send = async () => {
            if (closed) return;
            await hydrateServerStore();
            const store = getServerStore();
            const bus = AgentEventBus.getInstance();
            const payload = {
              activity: store.activity.slice(0, 20),
              events: bus.getRecentEvents(20),
              timestamp: Date.now(),
            };
            const fingerprint = JSON.stringify({
              activityLen: store.activity.length,
              topId: store.activity[0]?.id,
              eventsLen: payload.events.length,
            });

            if (fingerprint !== lastFingerprint) {
              lastFingerprint = fingerprint;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
            }
          };

          void send();
          const interval = setInterval(() => void send(), 5000);

          let unsubscribe = () => {};
          if (isRedisConfigured()) {
            subscribeActivity(() => void send()).then((unsub) => {
              unsubscribe = unsub;
            });
          }

          request.signal.addEventListener("abort", () => {
            closed = true;
            clearInterval(interval);
            unsubscribe();
            controller.close();
          });
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const type = searchParams.get("type") as AgentEventType | null;
    const source = searchParams.get("source");
    const target = searchParams.get("target");
    const since = searchParams.get("since") ? parseInt(searchParams.get("since")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const bus = AgentEventBus.getInstance();
    const events = bus.getEvents({
      type: type || undefined,
      source: source || undefined,
      target: target || undefined,
      since,
      limit,
    });

    return NextResponse.json({ events, stats: bus.getStats() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bus = AgentEventBus.getInstance();
    const event = await bus.emit({
      type: body.type || "custom",
      source: body.source || "api",
      target: body.target,
      data: body.data || {},
    });
    return NextResponse.json({ success: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to emit event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
