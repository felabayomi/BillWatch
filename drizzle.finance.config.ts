import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

const financeDatabaseUrl =
  process.env.FINANCE_DATABASE_URL;

if (!financeDatabaseUrl) {
  throw new Error(
    "FINANCE_DATABASE_URL must be set before running FinanceWatch database migrations.",
  );
}

export default defineConfig({
  schema: "./apps/finance/shared/schema.ts",

  out: "./migrations/finance",

  dialect: "postgresql",

  dbCredentials: {
    url: financeDatabaseUrl,
  },

  verbose: true,
  strict: true,
});