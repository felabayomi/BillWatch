import {
  Pool,
  neonConfig,
} from "@neondatabase/serverless";

import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

const expenseDatabaseUrl =
  process.env.EXPENSE_DATABASE_URL;

if (!expenseDatabaseUrl) {
  throw new Error(
    "EXPENSE_DATABASE_URL must be set for ExpenseWatch.",
  );
}

export const expensePool = new Pool({
  connectionString: expenseDatabaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 10000,
});

expensePool.on("error", (error) => {
  console.error(
    "[expense-db] Unexpected error on idle client:",
    error,
  );
});

export const expenseDb = drizzle({
  client: expensePool,
  schema,
});

/*
 * Compatibility exports for the existing
 * ExpenseWatch storage layer.
 */
export const pool = expensePool;
export const db = expenseDb;