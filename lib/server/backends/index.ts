import type { StoreBackend } from "@/lib/server/backends/types";
import { fileBackend } from "@/lib/server/backends/file";
import { postgresBackend } from "@/lib/server/backends/postgres";

let backend: StoreBackend | null = null;

export function getStoreBackend(): StoreBackend {
  if (backend) return backend;
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    console.warn("[store] Running in production without DATABASE_URL — using ephemeral file backend in /tmp");
  }
  backend = process.env.DATABASE_URL ? postgresBackend : fileBackend;
  return backend;
}

export function getStoreBackendName(): "postgres" | "file" {
  return getStoreBackend().name;
}
