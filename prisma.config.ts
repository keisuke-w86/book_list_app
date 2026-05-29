import path from "node:path";
import { defineConfig } from "prisma/config";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${dbPath}`,
  },
});
