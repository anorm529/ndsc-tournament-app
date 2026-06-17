import { Pool } from "pg";

const globalForMainDb = globalThis as unknown as { mainDbPool?: Pool };

const rawConnectionString = process.env.MAIN_DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("MAIN_DATABASE_URL is not set. Add it to .env.local before using the main database.");
}

const connectionString = rawConnectionString.replace("sslmode=require", "sslmode=verify-full");

export const mainDbPool =
  globalForMainDb.mainDbPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalForMainDb.mainDbPool = mainDbPool;
}
