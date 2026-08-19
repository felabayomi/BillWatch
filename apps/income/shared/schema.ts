import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

export const levelHistory = pgTable("level_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  level: text("level").notNull(),
  enteredAt: timestamp("entered_at").notNull(),
  achievedAt: timestamp("achieved_at"),
  targetAtEntry: integer("target_at_entry").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incomeEntries = pgTable("income_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  source: text("source").notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quickCashSuggestions = pgTable("quick_cash_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  earningsMin: integer("earnings_min").notNull(),
  earningsMax: integer("earnings_max").notNull(),
  payoutSpeed: text("payout_speed").notNull(),
  timeRequired: text("time_required").notNull(),
  requires: jsonb("requires").notNull().$type<{
    transport: string;
    people: string;
    heavy: boolean;
    indoor: boolean;
  }>(),
  tags: jsonb("tags").$type<string[]>().default([]),
  fits: jsonb("fits").notNull().$type<{
    skillsAny: string[];
    assetsAny: string[];
    locationAny: string[];
    onlineOk: boolean;
  }>(),
  notes: text("notes"),
  howToStart: jsonb("how_to_start").$type<string[]>().default([]),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  level: text("level").notNull(),
  milestone: text("milestone").notNull(),
  achievedAt: timestamp("achieved_at").defaultNow(),
});

export const userAccounts = pgTable("user_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("checking"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userReflections = pgTable("user_reflections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStart: timestamp("week_start").notNull(),
  reflection: text("reflection"),
  strategy: text("strategy"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertIncomeEntrySchema = createInsertSchema(incomeEntries).pick({
  amount: true,
  source: true,
  notes: true,
  date: true,
}).extend({
  date: z.union([z.string(), z.date()]).optional().transform(val => 
    val ? (typeof val === 'string' ? new Date(val) : val) : undefined
  ),
});

export const insertQuickCashSuggestionSchema = createInsertSchema(quickCashSuggestions).omit({
  id: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  level: true,
  milestone: true,
});

export const insertUserReflectionSchema = createInsertSchema(userReflections).pick({
  weekStart: true,
  reflection: true,
  strategy: true,
});

export const insertLevelHistorySchema = createInsertSchema(levelHistory).omit({
  id: true,
  createdAt: true,
});

export const insertUserAccountSchema = createInsertSchema(userAccounts).pick({
  name: true,
  type: true,
  isDefault: true,
});

export const levelTargetsSchema = z.object({
  foundation: z.object({
    amount: z.number().min(0),
    currency: z.string().default("USD"),
  }).optional(),
  stability: z.object({
    amount: z.number().min(0),
    currency: z.string().default("USD"),
  }).optional(),
  growth: z.object({
    amount: z.number().min(0),
    currency: z.string().default("USD"),
  }).optional(),
  legacy: z.object({
    amount: z.number().min(0),
    currency: z.string().default("USD"),
  }).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertIncomeEntry = z.infer<typeof insertIncomeEntrySchema>;
export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type InsertQuickCashSuggestion = z.infer<typeof insertQuickCashSuggestionSchema>;
export type QuickCashSuggestion = typeof quickCashSuggestions.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgressEntry = typeof userProgress.$inferSelect;
export type InsertUserReflection = z.infer<typeof insertUserReflectionSchema>;
export type UserReflection = typeof userReflections.$inferSelect;
export type InsertLevelHistory = z.infer<typeof insertLevelHistorySchema>;
export type LevelHistoryEntry = typeof levelHistory.$inferSelect;
export type InsertUserAccount = z.infer<typeof insertUserAccountSchema>;
export type UserAccount = typeof userAccounts.$inferSelect;
export type LevelTargets = z.infer<typeof levelTargetsSchema>;
