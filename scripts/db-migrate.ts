/**
 * Run: npx tsx scripts/db-migrate.ts
 * Requires DATABASE_URL
 */
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  const sql = readFileSync(
    join(process.cwd(), "scripts/migrations/001_init.sql"),
    "utf-8",
  );
  await pool.query(sql);
  await pool.end();
  console.log("✅ Migration complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
