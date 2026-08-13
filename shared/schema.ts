import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// Persistent server-side sessions for OpenID Connect authentication.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// User profiles populated from OpenID Connect claims.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  reminderPreferences: jsonb("reminder_preferences").$type<{
    twoWeeks: boolean;
    oneWeek: boolean;
    threeDays: boolean;
    oneDay: boolean;
    sameDay: boolean;
    notificationTime: string;
  }>(),
  customCategories: text("custom_categories").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  company: text("company").notNull(),
  accountNumber: text("account_number"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  minimumPayment: decimal("minimum_payment", { precision: 10, scale: 2 }),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").$type<"upcoming" | "due_soon" | "overdue" | "paid" | "archived">().notNull().default("upcoming"),
  category: text("category"), // electricity, internet, gas, etc.
  description: text("description"),
  documentPath: text("document_path"), // path to uploaded document
  extractedData: jsonb("extracted_data").$type<{
    originalText?: string;
    confidence?: number;
    extractedFields?: Record<string, any>;
  }>(),
  paidDate: timestamp("paid_date"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }),
  // Payment tracking fields
  paymentMethod: text("payment_method"), // bank/card used for payment
  paymentType: text("payment_type").$type<"manual" | "automatic" | "real_payment" | "billcom_complete" | "billcom_partial" | "billcom_invoice">(), // how payment was made
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID for real payments
  // BILL.com integration fields for direct creditor payments
  billComVendorId: text("billcom_vendor_id"), // BILL.com vendor ID for this creditor
  creditorRoutingNumber: text("creditor_routing_number"), // Bank routing number for ACH payments
  creditorAccountNumber: text("creditor_account_number"), // Bank account number for ACH payments  
  creditorPaymentAddress: jsonb("creditor_payment_address").$type<{
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }>(), // Mailing address for check payments
  creditorPaymentMethod: text("creditor_payment_method").$type<"ach" | "check" | "wire">().default("ach"), // Preferred payment method
  billComPaymentId: text("billcom_payment_id"), // BILL.com payment ID for tracking
  billComInvoiceId: text("billcom_invoice_id"), // BILL.com invoice ID for payment collection
  billComCustomerId: text("billcom_customer_id"), // BILL.com customer ID for the payer
  // Recurring bill fields
  isRecurring: boolean("is_recurring").default(false),
  seriesId: varchar("series_id"), // Groups related bills in a payment plan
  installmentNumber: integer("installment_number"), // Which payment in the series (1, 2, 3, etc.)
  totalInstallments: integer("total_installments"), // Total number of payments in series
  recurringType: text("recurring_type").$type<"payment_plan" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannually" | "yearly" | "custom">(),
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }), // Total amount owed across all installments
  // Bill classification fields
  billType: text("bill_type").$type<"personal" | "business">().default("personal"), // Bill classification
  businessName: text("business_name"), // Business name for business bills
  // Bill reminder tracking
  remindersSent: text("reminders_sent").array().default(sql`ARRAY[]::text[]`), // Track which reminder types have been sent: ['14-day', '7-day']
  invoiceUrl: text("invoice_url"),
  receiptUrl: text("receipt_url"),
  financeWatchSynced: boolean("finance_watch_synced").default(false),
  financeWatchSyncedAt: timestamp("finance_watch_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id),
  reminderDate: timestamp("reminder_date").notNull(),
  reminderType: text("reminder_type").$type<"two_weeks" | "one_week" | "three_days" | "one_day" | "same_day">().notNull(),
  sent: boolean("sent").default(false),
  snoozedUntil: timestamp("snoozed_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response").notNull(),
  messageType: text("message_type").$type<"general" | "bill_add" | "bill_query" | "bill_update" | "financial_insight" | "reminder_request">().default("general"),
  actionTaken: jsonb("action_taken").$type<{
    billCreated?: string; // bill ID if created
    billUpdated?: string; // bill ID if updated
    reminderSet?: string; // reminder ID if set
    query?: string; // query performed
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billPayments = pgTable("bill_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentType: text("payment_type").$type<"manual" | "automatic" | "real_payment" | "billcom_complete" | "billcom_partial" | "billcom_invoice">().notNull(),
  status: text("status").$type<"pending" | "processing" | "succeeded" | "failed" | "cancelled">().notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  billComPaymentId: text("billcom_payment_id"),
  billComInvoiceId: text("billcom_invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bill_payments_bill_id").on(table.billId),
  index("idx_bill_payments_stripe_payment_intent_id").on(table.stripePaymentIntentId),
]);

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").$type<"checking" | "savings" | "credit_card" | "other">().default("checking"),
  importedFromFinanceWatch: boolean("imported_from_finance_watch").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export const billsRelations = relations(bills, ({ one, many }) => ({
  user: one(users, {
    fields: [bills.userId],
    references: [users.id],
  }),
  reminders: many(reminders),
  payments: many(billPayments),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  bill: one(bills, {
    fields: [reminders.billId],
    references: [bills.id],
  }),
}));

export const billPaymentsRelations = relations(billPayments, ({ one }) => ({
  bill: one(bills, {
    fields: [billPayments.billId],
    references: [bills.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bills: many(bills),
  conversations: many(conversations),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  reminderPreferences: true,
});

export type UpsertUser = typeof users.$inferInsert;

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
}).extend({
  dueDate: z.union([z.date(), z.string().transform(str => new Date(str))])
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export const updateBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  userId: true,
  dueDate: true, // Remove original dueDate field
  amount: true, // Remove original amount field
  minimumPayment: true, // Remove original minimumPayment field
}).partial().extend({
  dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  paidDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
  paidAmount: z.union([z.string(), z.number().transform(val => val.toString())]).optional(),
  // Handle numeric fields that might be empty strings
  amount: z.union([
    z.string().transform(val => val.trim() === "" ? "0" : val),
    z.number().transform(val => val.toString())
  ]).optional(),
  minimumPayment: z.union([
    z.string().transform(val => val.trim() === "" ? "0" : val),
    z.number().transform(val => val.toString())
  ]).optional(),
});

// Schema for updating payment tracking information
export const updatePaymentSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentType: z.enum(["manual", "automatic", "real_payment", "billcom_complete", "billcom_partial", "billcom_invoice"]),
  paidAmount: z.string().optional(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export const insertBillPaymentSchema = createInsertSchema(billPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return num.toString();
  }),
  paidAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
}).refine((data) => {
  if (data.status === 'succeeded' && !data.paidAt) {
    return false;
  }
  return true;
}, {
  message: 'paidAt is required when status is succeeded',
  path: ['paidAt']
});

export const updateBillPaymentSchema = createInsertSchema(billPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  billId: true,
}).partial().extend({
  amount: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return num.toString();
  }).optional(),
  paidAt: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
}).refine((data) => {
  if (data.status === 'succeeded' && !data.paidAt) {
    return false;
  }
  return true;
}, {
  message: 'paidAt is required when status is succeeded',
  path: ['paidAt']
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type UpdateBill = z.infer<typeof updateBillSchema>;
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type BillPayment = typeof billPayments.$inferSelect;
export type UpdateBillPayment = z.infer<typeof updateBillPaymentSchema>;
