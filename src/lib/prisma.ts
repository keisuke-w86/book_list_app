import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
