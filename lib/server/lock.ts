import { existsSync, writeFileSync, unlinkSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

const LOCK_DIR = join(process.cwd(), ".data");
const LOCK_FILE = join(LOCK_DIR, ".citadel-lock");
const MAX_SPIN_MS = 15000;
const STALE_MS = 10000;

function sleepAsync(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStale(): boolean {
  try {
    if (!existsSync(LOCK_FILE)) return true;
    const raw = readFileSync(LOCK_FILE, "utf-8");
    const ts = parseInt(raw, 10);
    return Number.isNaN(ts) || Date.now() - ts > STALE_MS;
  } catch {
    return true;
  }
}

export async function acquireStoreLock(): Promise<void> {
  const start = Date.now();
  if (!existsSync(LOCK_DIR)) {
    try {
      mkdirSync(LOCK_DIR, { recursive: true });
    } catch {}
  }
  
  while (Date.now() - start < MAX_SPIN_MS) {
    if (!existsSync(LOCK_FILE) || isStale()) {
      try {
        writeFileSync(LOCK_FILE, String(Date.now()), { flag: "wx" });
        return;
      } catch {
        if (isStale()) {
          try {
            unlinkSync(LOCK_FILE);
          } catch {
            /* ignore */
          }
        }
      }
    }
    await sleepAsync(50);
  }
  throw new Error("[store-lock] Could not acquire lock within timeout");
}

export function releaseStoreLock(): void {
  try {
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
  } catch {
    /* ignore */
  }
}

export async function withStoreLock<T>(fn: () => T | Promise<T>): Promise<T> {
  await acquireStoreLock();
  try {
    return await fn();
  } finally {
    releaseStoreLock();
  }
}
