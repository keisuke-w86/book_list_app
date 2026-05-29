import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email    = process.env.SEED_EMAIL    ?? "admin@example.com";
  const username = process.env.SEED_USERNAME ?? "admin";
  const password = process.env.SEED_PASSWORD;

  if (!password) {
    console.error("環境変数 SEED_PASSWORD が設定されていません。");
    console.error("例: SEED_PASSWORD=yourpassword npx tsx prisma/seed.ts");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, username, password: hashed },
  });

  const updated = await prisma.book.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });

  console.log(`ユーザー作成: ${user.username} (${user.email})`);
  console.log(`既存の本を紐付け: ${updated.count}冊`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
