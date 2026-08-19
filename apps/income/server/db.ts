import {
  Pool,
  neonConfig,
} from "@neondatabase/serverless";

import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../shared/schema.js";

neonConfig.webSocketConstructor = ws;

const incomeDatabaseUrl =
  process.env.INCOME_DATABASE_URL;

if (!incomeDatabaseUrl) {
  throw new Error(
    "INCOME_DATABASE_URL must be set for IncomeLift.",
  );
}

export const incomePool = new Pool({
  connectionString: incomeDatabaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 10000,
});

incomePool.on("error", (error) => {
  console.error(
    "[income-db] Unexpected error on idle client:",
    error,
  );
});

export const incomeDb = drizzle({
  client: incomePool,
  schema,
});

/*
 * Compatibility aliases for the imported
 * IncomeLift storage/routes layer.
 */
export const pool = incomePool;
export const db = incomeDb;