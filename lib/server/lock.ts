import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";

const LOCK_DIR = join(process.cwd(), ".data");
const LOCK_FILE = join(LOCK_DIR, ".citadel-lock");
const MAX_SPIN_MS = 15000;
const STALE_MS = 10000;

function sleepSync(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
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

export function acquireStoreLock(): void {
  const start = Date.now();
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
    sleepSync(10);
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

export function withStoreLock<T>(fn: () => T): T {
  acquireStoreLock();
  try {
    return fn();
  } finally {
    releaseStoreLock();
  }
}
