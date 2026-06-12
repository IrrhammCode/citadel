import type { StoreBackend } from "@/lib/server/backends/types";
import { fileBackend } from "@/lib/server/backends/file";
import { postgresBackend } from "@/lib/server/backends/postgres";

let backend: StoreBackend | null = null;

export function getStoreBackend(): StoreBackend {
  if (backend) return backend;
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("[store] Production requires DATABASE_URL — file backend is dev-only");
  }
  backend = process.env.DATABASE_URL ? postgresBackend : fileBackend;
  return backend;
}

export function getStoreBackendName(): "postgres" | "file" {
  return getStoreBackend().name;
}
