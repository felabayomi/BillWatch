import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const incomeDatabaseUrl =
  process.env.INCOME_DATABASE_URL;

if (!incomeDatabaseUrl) {
  throw new Error(
    "INCOME_DATABASE_URL must be set for IncomeLift.",
  );
}

export default defineConfig({
  out: "./migrations-income",
  schema: "./apps/income/shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: incomeDatabaseUrl,
  },
});