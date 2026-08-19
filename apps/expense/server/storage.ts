import {
  users,
  expenses,
  drafts,
  reminders,
  budgets,
  categories,
  type User,
  type UpsertUser,
  type Expense,
  type InsertExpense,
  type Draft,
  type InsertDraft,
  type Reminder,
  type InsertReminder,
  type Budget,
  type InsertBudget,
  type Category,
  type InsertCategory,
  type Account,
  type InsertAccount,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, isNull, or, sql, ilike, isNotNull } from "drizzle-orm";
import { users, expenses, drafts, reminders, budgets, categories, accounts } from "../shared/schema";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCurrency(userId: string, currency: string): Promise<User | undefined>;
  
  // Expense operations
  getExpenses(userId: string, filters?: {
    month?: number;
    year?: number;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }): Promise<Expense[]>;
  createExpense(userId: string, expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, userId: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string, userId: string): Promise<boolean>;
  getExpenseById(id: string, userId: string): Promise<Expense | undefined>;
  getExpenseStats(userId: string, month: number, year: number): Promise<{
    total: number;
    categoryBreakdown: Record<string, number>;
    dailySpending: Record<string, number>;
  }>;
  getExpenseMonths(userId: string): Promise<{ month: number; year: number; count: number }[]>;
  
  // Draft operations
  getDrafts(userId: string): Promise<Draft[]>;
  createDraft(userId: string, draft: InsertDraft): Promise<Draft>;
  updateDraft(id: string, userId: string, draft: Partial<InsertDraft>): Promise<Draft | undefined>;
  deleteDraft(id: string, userId: string): Promise<boolean>;
  
  // Reminder operations
  getReminders(userId: string): Promise<Reminder[]>;
  createReminder(userId: string, reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, userId: string, reminder: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string, userId: string): Promise<boolean>;
  
  // Budget operations
  getBudget(userId: string, month: string, year: string): Promise<Budget | undefined>;
  upsertBudget(userId: string, budget: InsertBudget): Promise<Budget>;
  deleteBudget(id: string, userId: string): Promise<boolean>;
  
  // Category operations
  getCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, category: InsertCategory): Promise<Category>;
  updateCategory(id: string, userId: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string, userId: string): Promise<boolean>;

  // Account operations
  getAccounts(userId: string): Promise<Account[]>;
  createAccount(userId: string, account: InsertAccount): Promise<Account>;
  updateAccount(id: string, userId: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Account operations
  async getAccounts(userId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .orderBy(desc(accounts.createdAt));
  }

  async createAccount(userId: string, account: InsertAccount): Promise<Account> {
    const [created] = await db
      .insert(accounts)
      .values({ ...account, userId })
      .returning();
    return created;
  }

  async updateAccount(id: string, userId: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db
      .update(accounts)
      .set({ ...account, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .returning();
    return updated;
  }

  async deleteAccount(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(accounts)
      .set({ deletedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)));
    return (result.rowCount || 0) > 0;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCurrency(userId: string, currency: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ currency, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Expense operations
  async getExpenses(userId: string, filters?: {
    month?: number;
    year?: number;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }): Promise<Expense[]> {
    const conditions = [eq(expenses.userId, userId), isNull(expenses.deletedAt)];
    
    if (filters?.category) {
      conditions.push(eq(expenses.category, filters.category));
    }
    
    if (filters?.startDate) {
      conditions.push(gte(expenses.expenseDate, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(expenses.expenseDate, filters.endDate));
    }
    
    if (filters?.month && filters?.year) {
      const paddedMonth = filters.month.toString().padStart(2, '0');
      const startDate = `${filters.year}-${paddedMonth}-01`;
      const endDay = new Date(filters.year, filters.month, 0).getDate();
      const endDate = `${filters.year}-${paddedMonth}-${endDay.toString().padStart(2, '0')} 23:59:59`;
      conditions.push(sql`expense_date >= ${startDate}::timestamp`);
      conditions.push(sql`expense_date <= ${endDate}::timestamp`);
    }
    
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(expenses.description, term),
          ilike(expenses.category, term),
          and(isNotNull(expenses.location), ilike(expenses.location, term)),
          and(isNotNull(expenses.notes), ilike(expenses.notes, term))
        )
      );
    }

    return await db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt));
  }

  async createExpense(userId: string, expense: InsertExpense): Promise<Expense> {
    const [created] = await db
      .insert(expenses)
      .values({ ...expense, userId })
      .returning();
    return created;
  }

  async updateExpense(id: string, userId: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId), isNull(expenses.deletedAt)))
      .returning();
    return updated;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(expenses)
      .set({ deletedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId), isNull(expenses.deletedAt)));
    return (result.rowCount || 0) > 0;
  }

  async getExpenseById(id: string, userId: string): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId), isNull(expenses.deletedAt)));
    return expense;
  }

  async getExpenseStats(userId: string, month: number, year: number): Promise<{
    total: number;
    categoryBreakdown: Record<string, number>;
    dailySpending: Record<string, number>;
  }> {
    const paddedMonth = month.toString().padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${paddedMonth}-${endDay.toString().padStart(2, '0')} 23:59:59`;
    
    const monthlyExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.userId, userId),
        isNull(expenses.deletedAt),
        sql`expense_date >= ${startDate}::timestamp`,
        sql`expense_date <= ${endDate}::timestamp`
      ));

    const total = monthlyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
    const categoryBreakdown: Record<string, number> = {};
    const dailySpending: Record<string, number> = {};
    
    monthlyExpenses.forEach(expense => {
      const category = expense.category;
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + parseFloat(expense.amount);
      
      const day = expense.expenseDate.toISOString().split('T')[0];
      dailySpending[day] = (dailySpending[day] || 0) + parseFloat(expense.amount);
    });

    return { total, categoryBreakdown, dailySpending };
  }

  async getExpenseMonths(userId: string): Promise<{ month: number; year: number; count: number }[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const endOfCurrentMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()} 23:59:59`;
    
    const result = await db.execute(sql`
      SELECT 
        EXTRACT(MONTH FROM expense_date)::int as month,
        EXTRACT(YEAR FROM expense_date)::int as year,
        COUNT(*)::int as count
      FROM expenses 
      WHERE user_id = ${userId} AND deleted_at IS NULL
        AND expense_date <= ${endOfCurrentMonth}::timestamp
      GROUP BY EXTRACT(MONTH FROM expense_date), EXTRACT(YEAR FROM expense_date)
      ORDER BY year DESC, month DESC
    `);
    return result.rows as { month: number; year: number; count: number }[];
  }

  // Draft operations
  async getDrafts(userId: string): Promise<Draft[]> {
    return await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.userId, userId), isNull(drafts.deletedAt)))
      .orderBy(desc(drafts.updatedAt));
  }

  async createDraft(userId: string, draft: InsertDraft): Promise<Draft> {
    const [created] = await db
      .insert(drafts)
      .values({ ...draft, userId })
      .returning();
    return created;
  }

  async updateDraft(id: string, userId: string, draft: Partial<InsertDraft>): Promise<Draft | undefined> {
    const [updated] = await db
      .update(drafts)
      .set({ ...draft, updatedAt: new Date() })
      .where(and(eq(drafts.id, id), eq(drafts.userId, userId), isNull(drafts.deletedAt)))
      .returning();
    return updated;
  }

  async deleteDraft(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(drafts)
      .set({ deletedAt: new Date() })
      .where(and(eq(drafts.id, id), eq(drafts.userId, userId), isNull(drafts.deletedAt)));
    return (result.rowCount || 0) > 0;
  }

  // Reminder operations
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.scheduledFor));
  }

  async createReminder(userId: string, reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db
      .insert(reminders)
      .values({ ...reminder, userId })
      .returning();
    return created;
  }

  async updateReminder(id: string, userId: string, reminder: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(reminder)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return updated;
  }

  async deleteReminder(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Budget operations
  async getBudget(userId: string, month: string, year: string): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.userId, userId),
        eq(budgets.month, month),
        eq(budgets.year, year)
      ));
    return budget;
  }

  async upsertBudget(userId: string, budget: InsertBudget): Promise<Budget> {
    const [upserted] = await db
      .insert(budgets)
      .values({ ...budget, userId })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month, budgets.year],
        set: {
          amount: budget.amount,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  async deleteBudget(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Category operations
  async getCategories(userId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
      .orderBy(desc(categories.createdAt));
  }

  async createCategory(userId: string, category: InsertCategory): Promise<Category> {
    const [created] = await db
      .insert(categories)
      .values({ ...category, userId })
      .returning();
    return created;
  }

  async updateCategory(id: string, userId: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)))
      .returning();
    return updated;
  }

  async deleteCategory(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)));
    return (result.rowCount || 0) > 0;
  }

  async seedDefaultCategories(userId: string): Promise<void> {
    const defaultCategories = [
      { name: "groceries", label: "Groceries", emoji: "🥦", color: "bg-green-100 text-green-800" },
      { name: "dining-out", label: "Dining Out", emoji: "🍽️", color: "bg-red-100 text-red-800" },
      { name: "transportation", label: "Transportation", emoji: "🚗", color: "bg-blue-100 text-blue-800" },
      { name: "entertainment", label: "Entertainment", emoji: "🎬", color: "bg-purple-100 text-purple-800" },
      { name: "shopping", label: "Shopping", emoji: "🛍️", color: "bg-yellow-100 text-yellow-800" },
      { name: "health", label: "Health & Wellness", emoji: "🏥", color: "bg-pink-100 text-pink-800" },
      { name: "self-care", label: "Self Care", emoji: "💇‍♀️", color: "bg-indigo-100 text-indigo-800" },
      { name: "hobbies", label: "Hobbies", emoji: "🎨", color: "bg-orange-100 text-orange-800" },
      { name: "gifts", label: "Gifts", emoji: "🎁", color: "bg-rose-100 text-rose-800" },
      { name: "charity", label: "Charity", emoji: "🙏", color: "bg-teal-100 text-teal-800" },
      { name: "household-supplies", label: "Household Supplies", emoji: "🧴", color: "bg-cyan-100 text-cyan-800" },
      { name: "subscriptions", label: "Subscriptions", emoji: "💳", color: "bg-violet-100 text-violet-800" },
      { name: "education", label: "Education", emoji: "📚", color: "bg-emerald-100 text-emerald-800" },
      { name: "travel", label: "Travel", emoji: "✈️", color: "bg-sky-100 text-sky-800" },
      { name: "utilities", label: "Utilities", emoji: "⚡", color: "bg-amber-100 text-amber-800" },
      { name: "other", label: "Other", emoji: "📦", color: "bg-gray-100 text-gray-800" },
    ];

    // Insert all default categories with conflict handling to prevent duplicates
    // If categories were soft-deleted, resurrect them instead of ignoring
    await db
      .insert(categories)
      .values(
        defaultCategories.map(cat => ({
          ...cat,
          userId,
          isDefault: true,
        }))
      )
      .onConflictDoUpdate({
        target: [categories.userId, categories.name],
        set: {
          deletedAt: null,
          isDefault: true,
          updatedAt: new Date(),
          emoji: sql`excluded.emoji`,
          label: sql`excluded.label`,
          color: sql`excluded.color`,
        }
      });
  }
}

export const storage = new DatabaseStorage();
