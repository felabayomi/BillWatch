import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./apps/expense/shared/schema.ts",
  out: "./drizzle/expense",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.EXPENSE_DATABASE_URL!,
  },
});