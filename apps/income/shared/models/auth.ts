import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, decimal, text, boolean } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: text("username"),
  password: text("password"),
  currentLevel: text("current_level").notNull().default('foundation'),
  levelStartedAt: timestamp("level_started_at").defaultNow(),
  dailyGoal: decimal("daily_goal", { precision: 10, scale: 2 }).default('0'),
  weeklyGoal: decimal("weekly_goal", { precision: 10, scale: 2 }).default('0'),
  monthlyGoal: decimal("monthly_goal", { precision: 10, scale: 2 }).default('0'),
  yearlyGoal: decimal("yearly_goal", { precision: 10, scale: 2 }).default('0'),
  primaryGoalType: text("primary_goal_type").notNull().default('weekly'),
  levelTargets: jsonb("level_targets").$type<{
    foundation?: { amount: number; currency: string };
    stability?: { amount: number; currency: string };
    growth?: { amount: number; currency: string };
    legacy?: { amount: number; currency: string };
  }>(),
  highestLevel: text("highest_level").notNull().default('foundation'),
  status: text("status").notNull().default('normal'),
  graceStartAt: timestamp("grace_start_at"),
  downgradeOfferedAt: timestamp("downgrade_offered_at"),
  showManifesto: boolean("show_manifesto").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
