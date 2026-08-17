import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, check, jsonb, index, unique, boolean, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  institution: text("institution"),
  type: text("type").notNull(),
  owner: text("owner").notNull(),
  category: text("category").notNull().default("PERSONAL"),
  openingBalanceCents: integer("opening_balance_cents").notNull(),
  openingDate: date("opening_date").notNull(),
  apyPercent: text("apy_percent"),
  aprPercent: text("apr_percent"),
  creditLimitCents: integer("credit_limit_cents"),
  businessName: text("business_name"),
  businessId: varchar("business_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  typeCheck: check("type_check", sql`${table.type} IN ('checking', 'savings', 'credit', 'cash', 'investment', 'rewards', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan', 'other')`),
  ownerCheck: check("owner_check", sql`${table.owner} IN ('personal', 'business')`),
  categoryCheck: check("category_check", sql`${table.category} IN ('PERSONAL', 'CREDIT', 'BUSINESS', 'INVESTMENT', 'SAVINGS')`),
}));

export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  userNameUnique: unique().on(table.userId, table.name),
}));

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
}, (table) => ({
  kindCheck: check("kind_check", sql`${table.kind} IN ('income', 'expense', 'bill', 'debt', 'transfer', 'adjustment', 'investment')`),
  userNameUnique: unique().on(table.userId, table.name),
}));

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  dueDay: integer("due_day"),
  amountCents: integer("amount_cents"),
  accountId: varchar("account_id").references(() => accounts.id),
  categoryId: varchar("category_id").references(() => categories.id),
});

export const accountantLinks = pgTable("accountant_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: varchar("token").unique().notNull().default(sql`gen_random_uuid()`),
  label: text("label").default("Tax Preparer View"),
  filterType: text("filter_type").notNull().default("all"),
  filterYear: text("filter_year").notNull().default("all"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export type AccountantLink = typeof accountantLinks.$inferSelect;

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  txDate: date("tx_date").notNull(),
  accountId: varchar("account_id").references(() => accounts.id),
  amountCents: integer("amount_cents").notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  description: text("description"),
  billId: varchar("bill_id").references(() => bills.id),
  transferId: text("transfer_id"),
  refundOfId: varchar("refund_of_id"),
  isSystemGenerated: boolean("is_system_generated").default(false),
  isBusinessExpense: boolean("is_business_expense").default(false),
  isPersonal: boolean("is_personal").default(false),
  businessId: varchar("business_id").references(() => businesses.id),
  taxOnly: boolean("tax_only").default(false),
  receiptPath: text("receipt_path"),
  externalSourceId: text("external_source_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  refundOfIndex: index("refund_of_idx").on(table.refundOfId),
  refundOfForeignKey: foreignKey({
    columns: [table.refundOfId],
    foreignColumns: [table.id],
    name: "fk_transactions_refund_of"
  }),
}));

export const dailyBalances = pgTable("daily_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  balDate: date("bal_date").notNull(),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  openingCents: integer("opening_cents").notNull(),
  inflowCents: integer("inflow_cents").notNull(),
  outflowCents: integer("outflow_cents").notNull(),
  transferInCents: integer("transfer_in_cents").notNull(),
  transferOutCents: integer("transfer_out_cents").notNull(),
  adjustmentCents: integer("adjustment_cents").notNull(),
  closingCents: integer("closing_cents").notNull(),
});

export const cashFlowEntries = pgTable("cash_flow_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  totalIncome: integer("total_income").notNull(),
  totalExpenses: integer("total_expenses").notNull(),
  totalBillsPaid: integer("total_bills_paid").notNull(),
  netCashFlow: integer("net_cash_flow").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.date),
}));

// Authentication tables
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
  createdAt: true,
  refundOfId: true,  // Security: Only settable through dedicated refund endpoints
  isSystemGenerated: true,  // Security: Only settable internally by system
});

export const insertDailyBalanceSchema = createInsertSchema(dailyBalances).omit({
  id: true,
});

// Insert schemas
export const insertCashFlowSchema = createInsertSchema(cashFlowEntries).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type DailyBalance = typeof dailyBalances.$inferSelect;
export type InsertDailyBalance = z.infer<typeof insertDailyBalanceSchema>;
export type CashFlowEntry = typeof cashFlowEntries.$inferSelect;
export type InsertCashFlowEntry = z.infer<typeof insertCashFlowSchema>;

// Additional types for API responses
export type AccountWithBalance = Account & {
  currentBalanceCents: number;
  dailyChange: number;
};

export type TransactionWithDetails = Transaction & {
  accountName: string;
  accountType: string;
  categoryName: string;
  categoryKind: string;
  billName?: string;
  businessName?: string;
};

export type DailySummary = {
  date: string;
  totalOpeningCents: number;
  totalInflowCents: number;
  totalOutflowCents: number;
  totalTransferInCents: number;
  totalTransferOutCents: number;
  totalAdjustmentCents: number;
  totalClosingCents: number;
  variance: number;
  isBalanced: boolean;
};

// Authentication types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Account category enum
export type AccountCategory = 'PERSONAL' | 'CREDIT' | 'BUSINESS' | 'INVESTMENT' | 'SAVINGS';

// Helper function to infer account category based on account properties
export function inferCategory(account: {
  type: string;
  name: string;
  owner?: string;
  institution?: string;
}): AccountCategory {
  const name = account.name.toLowerCase();
  const type = account.type.toLowerCase();
  
  // Savings accounts
  if (type === 'savings' || 
      name.includes('savings') || 
      name.includes('money market') || 
      name.includes('high yield') || 
      name.includes('hys') ||
      name.includes('performance savings')) {
    return 'SAVINGS';
  }
  
  // Rewards asset accounts (must check before credit to avoid name-based misclassification)
  if (type === 'rewards') {
    return 'PERSONAL';
  }
  
  // Credit card accounts
  if (type === 'credit' || 
      name.includes('quicksilver') || 
      name.includes('platinum') || 
      name.includes('mastercard') || 
      name.includes('visa') || 
      name.includes('amex') || 
      name.includes('discover') || 
      name.includes('capital one') && name.includes('card') ||
      name.includes('secured') && type !== 'savings' ||
      name.includes('credit card') || 
      name.includes('rewards')) {
    return 'CREDIT';
  }
  
  // Investment accounts
  if (type === 'investment' || 
      name.includes('brokerage') || 
      name.includes('ira') || 
      name.includes('401k') || 
      name.includes('roth') || 
      name.includes('rollover') || 
      name.includes('mutual fund') || 
      name.includes('etf') || 
      name.includes('trading') || 
      name.includes('stocks') || 
      name.includes('bonds') || 
      name.includes('portfolio') ||
      name.includes('retirement') ||
      name.includes('fidelity') && (name.includes('investment') || name.includes('brokerage'))) {
    return 'INVESTMENT';
  }
  
  // Business accounts (based on owner field primarily)
  if (account.owner === 'business' || 
      name.includes('business') || 
      name.includes('corp') || 
      name.includes('company') || 
      name.includes('llc') || 
      name.includes('inc') || 
      name.includes('enterprise') || 
      name.includes('commercial')) {
    return 'BUSINESS';
  }
  
  // Default to personal for everything else
  return 'PERSONAL';
}
