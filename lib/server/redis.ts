import "server-only";

const ACTIVITY_CHANNEL = "citadel:activity";
const SCHEDULE_KEY = "citadel:agent:schedule";
const RATE_PREFIX = "citadel:ratelimit:";

type RedisClient = import("ioredis").default;

let redis: RedisClient | null = null;
let redisDisabled = false;

export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL && !redisDisabled;
}

export async function getRedis(): Promise<RedisClient | null> {
  if (!process.env.REDIS_URL || redisDisabled) return null;
  if (redis) return redis;
  try {
    const { default: Redis } = await import("ioredis");
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    await redis.connect();
    return redis;
  } catch (err) {
    console.error("[redis] connect failed:", err);
    redisDisabled = true;
    return null;
  }
}

export async function publishActivityUpdate(payload: {
  activityLen: number;
  topId?: string;
}): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  await client.publish(ACTIVITY_CHANNEL, JSON.stringify(payload));
}

export async function subscribeActivity(
  onMessage: (payload: { activityLen: number; topId?: string }) => void,
): Promise<() => void> {
  const client = await getRedis();
  if (!client) return () => {};

  const sub = client.duplicate();
  await sub.connect();
  await sub.subscribe(ACTIVITY_CHANNEL);
  sub.on("message", (_ch, msg) => {
    try {
      onMessage(JSON.parse(msg));
    } catch {
      /* ignore */
    }
  });
  return () => {
    sub.unsubscribe().catch(() => {});
    sub.quit().catch(() => {});
  };
}

export async function checkRateLimit(
  key: string,
  limit = 120,
  windowSec = 60,
): Promise<{ allowed: boolean; remaining: number }> {
  const client = await getRedis();
  if (!client) return { allowed: true, remaining: limit };

  const bucket = `${RATE_PREFIX}${key}`;
  const count = await client.incr(bucket);
  if (count === 1) await client.expire(bucket, windowSec);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

// ─── Agent schedule (Redis ZSET) ────────────────────────────

export async function scheduleAgentRun(
  systemId: string,
  intervalMinutes: number,
  runAtMs?: number,
): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  const next = runAtMs ?? Date.now() + intervalMinutes * 60 * 1000;
  await client.zadd(SCHEDULE_KEY, next, systemId);
  await client.hset(`citadel:agent:meta:${systemId}`, {
    intervalMinutes: String(intervalMinutes),
    isRunning: "true",
  });
}

export async function unscheduleAgentRun(systemId: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  await client.zrem(SCHEDULE_KEY, systemId);
  await client.hset(`citadel:agent:meta:${systemId}`, "isRunning", "false");
}

export async function getDueAgentIds(now = Date.now()): Promise<string[]> {
  const client = await getRedis();
  if (!client) return [];
  return client.zrangebyscore(SCHEDULE_KEY, 0, now);
}

export async function rescheduleAgent(systemId: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  const meta = await client.hgetall(`citadel:agent:meta:${systemId}`);
  if (meta.isRunning !== "true") {
    await client.zrem(SCHEDULE_KEY, systemId);
    return;
  }
  const intervalMinutes = parseInt(meta.intervalMinutes ?? "60", 10);
  await client.zadd(
    SCHEDULE_KEY,
    Date.now() + intervalMinutes * 60 * 1000,
    systemId,
  );
}
