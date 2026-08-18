import {
  Pool,
  neonConfig,
} from "@neondatabase/serverless";

import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

const financeDatabaseUrl =
  process.env.FINANCE_DATABASE_URL;

if (!financeDatabaseUrl) {
  throw new Error(
    "FINANCE_DATABASE_URL must be set for FinanceWatch.",
  );
}

export const financePool = new Pool({
  connectionString: financeDatabaseUrl,

  max: 5,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 5000,

  maxUses: 10000,
});

financePool.on("error", (error) => {
  console.error(
    "[finance-db] Unexpected error on idle client:",
    error,
  );
});

export const financeDb = drizzle({
  client: financePool,
  schema,
});

/*
 * Compatibility exports.
 *
 * The existing FinanceWatch storage layer imports
 * `db` and possibly `pool`, so keep these aliases
 * while the app is being integrated into Financial OS.
 */
export const pool = financePool;
export const db = financeDb;
