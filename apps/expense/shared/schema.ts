import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (Required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  reminderPreferences: jsonb("reminder_preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  expenseDate: timestamp("expense_date").notNull(),
  paymentMethod: text("payment_method"),
  location: text("location"),
  notes: text("notes"),
  tags: text("tags").array().notNull().default(sql`'{}'`),
  type: text("type").notNull().default("personal"), // personal | business
  businessName: text("business_name"),
  scannedData: jsonb("scanned_data"),
  receiptImageUrl: text("receipt_image_url"),
  financeWatchAccount: text("finance_watch_account"),
  financeWatchCategory: text("finance_watch_category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Drafts table (OCR scanned expenses awaiting confirmation)
export const drafts = pgTable("drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  description: text("description"),
  category: text("category"),
  subcategory: text("subcategory"),
  expenseDate: timestamp("expense_date"),
  paymentMethod: text("payment_method"),
  location: text("location"),
  notes: text("notes"),
  tags: text("tags").array().default(sql`'{}'`),
  type: text("type").default("personal"),
  businessName: text("business_name"),
  financeWatchAccount: text("finance_watch_account"),
  financeWatchCategory: text("finance_watch_category"),
  originalText: text("original_text"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  source: text("source").notNull().default("manual"), // ocr | manual
  receiptImageUrl: text("receipt_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  billId: varchar("bill_id").references(() => expenses.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sent: boolean("sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Budgets table
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  month: varchar("month", { length: 2 }).notNull(), // 01-12
  year: varchar("year", { length: 4 }).notNull(), // YYYY
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint required for upsert operation
  uniqueIndex("unique_budget_per_user_month").on(table.userId, table.month, table.year)
]);

// Categories table (user customizable expense categories)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // slug like "groceries", "dining-out"
  label: varchar("label").notNull(), // display name like "Groceries", "Dining Out"
  emoji: varchar("emoji").notNull(), // emoji icon like "🥦", "🍽️"
  color: varchar("color").notNull(), // tailwind classes like "bg-green-100 text-green-800"
  isDefault: boolean("is_default").notNull().default(false), // true for system defaults
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Unique constraint to prevent duplicate category names per user
  uniqueIndex("unique_category_per_user").on(table.userId, table.name)
]);

// Accounts table for sync matching
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // checking, savings, credit, etc.
  isDefault: boolean("is_default").notNull().default(false),
  financeWatchAccount: varchar("finance_watch_account"), // Link to exact name in FW
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses),
  drafts: many(drafts),
  reminders: many(reminders),
  budgets: many(budgets),
  categories: many(categories),
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  reminders: many(reminders),
}));

export const draftsRelations = relations(drafts, ({ one }) => ({
  user: one(users, {
    fields: [drafts.userId],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  expense: one(expenses, {
    fields: [reminders.billId],
    references: [expenses.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  expenseDate: z.preprocess((arg) => {
    if (typeof arg === "string") {
      return new Date(arg);
    }
    return arg;
  }, z.date())
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  expenseDate: z.preprocess((arg) => {
    if (typeof arg === "string") {
      return new Date(arg);
    }
    return arg;
  }, z.date()).optional()
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  month: z.string().transform((val) => {
    const monthNum = parseInt(val, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error("Month must be between 1 and 12");
    }
    return monthNum.toString().padStart(2, '0');
  }),
  year: z.string().refine((val) => {
    const yearNum = parseInt(val, 10);
    return !isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2100;
  }, {
    message: "Year must be a valid 4-digit year between 1900 and 2100"
  })
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  isDefault: true,
}).extend({
  name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Name must be lowercase letters, numbers, and hyphens only"
  }),
  label: z.string().min(1).max(50),
  emoji: z.string().min(1).max(10),
  color: z.string().min(1).max(100),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof drafts.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Categories with emojis
export const EXPENSE_CATEGORIES = {
  groceries: { emoji: "🥦", label: "Groceries", color: "bg-green-100 text-green-800" },
  "dining-out": { emoji: "🍽️", label: "Dining Out", color: "bg-red-100 text-red-800" },
  transportation: { emoji: "🚗", label: "Transportation", color: "bg-blue-100 text-blue-800" },
  entertainment: { emoji: "🎬", label: "Entertainment", color: "bg-purple-100 text-purple-800" },
  shopping: { emoji: "🛍️", label: "Shopping", color: "bg-yellow-100 text-yellow-800" },
  health: { emoji: "🏥", label: "Health & Wellness", color: "bg-pink-100 text-pink-800" },
  "self-care": { emoji: "💇‍♀️", label: "Self Care", color: "bg-indigo-100 text-indigo-800" },
  hobbies: { emoji: "🎨", label: "Hobbies", color: "bg-orange-100 text-orange-800" },
  gifts: { emoji: "🎁", label: "Gifts", color: "bg-rose-100 text-rose-800" },
  charity: { emoji: "🙏", label: "Charity", color: "bg-teal-100 text-teal-800" },
  "household-supplies": { emoji: "🧴", label: "Household Supplies", color: "bg-cyan-100 text-cyan-800" },
  subscriptions: { emoji: "💳", label: "Subscriptions", color: "bg-violet-100 text-violet-800" },
  education: { emoji: "📚", label: "Education", color: "bg-emerald-100 text-emerald-800" },
  travel: { emoji: "✈️", label: "Travel", color: "bg-sky-100 text-sky-800" },
  utilities: { emoji: "⚡", label: "Utilities", color: "bg-amber-100 text-amber-800" },
  other: { emoji: "📦", label: "Other", color: "bg-gray-100 text-gray-800" },
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

// Currency definitions
export const CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  GHS: { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand" },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  CHF: { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  EGP: { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
