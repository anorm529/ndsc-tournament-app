import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local before using the database.");
}

const connectionString = rawConnectionString.replace("sslmode=require", "sslmode=verify-full");

const pool = globalForPrisma.prismaPool ?? new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const cachedPrisma = globalForPrisma.prisma;
const cachedClientIsCurrent = cachedPrisma && "adminUser" in cachedPrisma;

export const prisma =
  (cachedClientIsCurrent ? cachedPrisma : undefined) ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = prisma;
}
