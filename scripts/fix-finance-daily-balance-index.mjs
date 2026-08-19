import dotenv from "dotenv";
import {
  Pool,
  neonConfig,
} from "@neondatabase/serverless";
import ws from "ws";

dotenv.config({
  path: ".env.local",
});

neonConfig.webSocketConstructor = ws;

const connectionString =
  process.env.FINANCE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "FINANCE_DATABASE_URL is not set",
  );
}

const pool = new Pool({
  connectionString,
});

try {
  console.log(
    "Checking FinanceWatch daily balance index...",
  );

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      daily_balances_user_account_date_unique_idx
    ON daily_balances (
      user_id,
      account_id,
      bal_date
    );
  `);

  console.log(
    "✅ FinanceWatch daily balance unique index is ready.",
  );
} finally {
  await pool.end();
}