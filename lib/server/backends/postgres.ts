import type { CitadelStore } from "@/lib/server/store-types";
import { DEFAULT_STORE } from "@/lib/server/store-types";
import type { StoreBackend } from "@/lib/server/backends/types";

let pool: import("pg").Pool | null = null;

async function getPool(): Promise<import("pg").Pool> {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  const { Pool } = await import("pg");
  pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  return pool;
}

export const postgresBackend: StoreBackend = {
  name: "postgres",

  async load() {
    const client = await getPool();
    const res = await client.query<{ data: CitadelStore; version: string }>(
      "SELECT data, version FROM citadel_store WHERE id = $1",
      ["main"],
    );
    if (res.rows.length === 0) {
      await client.query(
        "INSERT INTO citadel_store (id, data) VALUES ($1, $2::jsonb) ON CONFLICT DO NOTHING",
        ["main", JSON.stringify(DEFAULT_STORE)],
      );
      return { store: { ...DEFAULT_STORE }, version: 1 };
    }
    return {
      store: { ...DEFAULT_STORE, ...res.rows[0].data },
      version: Number(res.rows[0].version) || 1,
    };
  },

  async save(store, expectedVersion) {
    const client = await getPool();
    const res = await client.query<{ version: string }>(
      `UPDATE citadel_store
       SET data = $1::jsonb, version = version + 1, updated_at = NOW()
       WHERE id = $2 AND version = $3
       RETURNING version`,
      [JSON.stringify(store), "main", expectedVersion],
    );
    if (res.rowCount === 0) return "conflict";
    return { version: Number(res.rows[0].version) };
  },
};
