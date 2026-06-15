import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { CitadelStore } from "@/lib/server/store-types";
import { DEFAULT_STORE } from "@/lib/server/store-types";
import type { StoreBackend } from "@/lib/server/backends/types";
import { withStoreLock } from "@/lib/server/lock";

const isProd = process.env.NODE_ENV === "production";
const STORE_DIR = isProd ? "/tmp" : join(process.cwd(), ".data");
const STORE_FILE = join(STORE_DIR, "citadel-store.json");

type FileEnvelope = {
  version: number;
  store: CitadelStore;
};

function readEnvelope(): FileEnvelope {
  if (!existsSync(STORE_FILE)) {
    return { version: 1, store: { ...DEFAULT_STORE } };
  }
  try {
    const raw = readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw, (key, val) =>
      val && val.$type === "bigint" ? BigInt(val.value) : val
    ) as FileEnvelope | CitadelStore;
    if (parsed && typeof parsed === "object" && "version" in parsed && "store" in parsed) {
      return {
        version: Number((parsed as FileEnvelope).version) || 1,
        store: { ...DEFAULT_STORE, ...(parsed as FileEnvelope).store },
      };
    }
    return { version: 1, store: { ...DEFAULT_STORE, ...(parsed as CitadelStore) } };
  } catch {
    return { version: 1, store: { ...DEFAULT_STORE } };
  }
}

export const fileBackend: StoreBackend = {
  name: "file",

  async load() {
    return withStoreLock(() => readEnvelope());
  },

  async save(store, expectedVersion) {
    return withStoreLock(() => {
      const current = readEnvelope();
      if (current.version !== expectedVersion) return "conflict" as const;
      const nextVersion = expectedVersion + 1;
      try {
        if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
        const envelope: FileEnvelope = { version: nextVersion, store };
        writeFileSync(
          STORE_FILE,
          JSON.stringify(envelope, (key, val) => (typeof val === "bigint" ? { $type: "bigint", value: val.toString() } : val), 2),
          "utf-8"
        );
        return { version: nextVersion };
      } catch (err) {
        console.error("[file-backend] persist failed:", err);
        return "conflict" as const;
      }
    });
  },
};
