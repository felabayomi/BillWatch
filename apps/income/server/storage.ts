import { 
  type User, 
  type InsertUser, 
  type IncomeEntry, 
  type InsertIncomeEntry,
  type QuickCashSuggestion,
  type InsertQuickCashSuggestion,
  type UserProgressEntry,
  type InsertUserProgress,
  type UserReflection,
  type InsertUserReflection,
  type UserAccount,
  type InsertUserAccount,
  users, incomeEntries, quickCashSuggestions, userProgress, userReflections, userAccounts
} from "../shared/schema.js";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { eq, gte, lte, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser, customId?: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  recomputeLevel(userId: string): Promise<{ advanced: boolean; to?: string; earned: number; target: number }>;
  sumIncomeSinceDate(userId: string, since: Date): Promise<number>;
  
  // Income entries
  createIncomeEntry(userId: string, entry: InsertIncomeEntry): Promise<IncomeEntry>;
  getIncomeEntries(userId: string, startDate?: Date, endDate?: Date): Promise<IncomeEntry[]>;
  getTodaysIncomeEntries(userId: string, userTimezone?: string): Promise<IncomeEntry[]>;
  getWeeklyIncomeEntries(userId: string, userTimezone?: string): Promise<IncomeEntry[]>;
  
  // Quick cash suggestions
  getQuickCashSuggestions(): Promise<QuickCashSuggestion[]>;
  getFilteredQuickCashSuggestions(requirements: any): Promise<QuickCashSuggestion[]>;
  createQuickCashSuggestion(suggestion: InsertQuickCashSuggestion): Promise<QuickCashSuggestion>;
  
  // User progress
  createUserProgress(userId: string, progress: InsertUserProgress): Promise<UserProgressEntry>;
  getUserProgress(userId: string): Promise<UserProgressEntry[]>;
  
  // User reflections
  createUserReflection(userId: string, reflection: InsertUserReflection): Promise<UserReflection>;
  getUserReflections(userId: string): Promise<UserReflection[]>;
  getLatestReflection(userId: string): Promise<UserReflection | undefined>;
  
  // User accounts
  getUserAccounts(userId: string): Promise<UserAccount[]>;
  createUserAccount(userId: string, account: InsertUserAccount): Promise<UserAccount>;
  deleteUserAccount(userId: string, accountId: string): Promise<boolean>;
  setDefaultAccount(userId: string, accountId: string): Promise<boolean>;

  // Level management
  computeRunRateWeekly(userId: string): Promise<number>;
  evaluateLevelState(userId: string): Promise<{ 
    performingAt: string; 
    userStatus: string; 
    runRateWeekly: number;
    graceStartAt: Date | null;
    downgradeOfferedAt: Date | null;
  }>;
  moveBackOneLevel(userId: string): Promise<{ success: boolean; newLevel: string }>;
  adjustLevelTarget(userId: string, level: string, newTarget: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, customId?: string): Promise<User> {
    const id = customId || randomUUID();
    const userWithDefaults = {
      ...insertUser,
      id,
      currentLevel: 'foundation',
      highestLevel: 'foundation',
      status: 'normal',
      graceStartAt: null,
      downgradeOfferedAt: null,
      levelStartedAt: new Date(),
      dailyGoal: '0',
      weeklyGoal: '0',
      monthlyGoal: '0',
      yearlyGoal: '0',
      primaryGoalType: 'weekly',
      levelTargets: null,
      showManifesto: true,
      createdAt: new Date()
    };

    const [user] = await db
      .insert(users)
      .values(userWithDefaults)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createIncomeEntry(userId: string, entry: InsertIncomeEntry): Promise<IncomeEntry> {
    const id = randomUUID();
    // Use provided date (from user's browser) or fall back to server time
    const entryDate = entry.date ? new Date(entry.date) : new Date();
    const incomeEntryWithId = { ...entry, id, userId, date: entryDate };
    const [createdEntry] = await db
      .insert(incomeEntries)
      .values(incomeEntryWithId)
      .returning();
    return createdEntry;
  }

  async getIncomeEntries(userId: string, startDate?: Date, endDate?: Date): Promise<IncomeEntry[]> {
    let query = db.select().from(incomeEntries).where(eq(incomeEntries.userId, userId));
    
    if (startDate && endDate) {
      query = db.select().from(incomeEntries).where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lte(incomeEntries.date, endDate)
        )
      );
    }
    
    return await query;
  }

  async getTodaysIncomeEntries(userId: string, userTimezone?: string): Promise<IncomeEntry[]> {
    const timezone = userTimezone || 'UTC';
    
    // Get all entries from the last 48 hours
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
    
    const recentEntries = await db.select().from(incomeEntries).where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, twoDaysAgo)
      )
    );
    
    if (recentEntries.length === 0) {
      return [];
    }
    
    // Filter entries to only include those from "today" in user's timezone
    const todayInUserTZ = new Date().toLocaleDateString('en-CA', { timeZone: timezone }); // ISO format YYYY-MM-DD
    
    return recentEntries.filter(entry => {
      const entryDateInUserTZ = entry.date?.toLocaleDateString('en-CA', { timeZone: timezone });
      return entryDateInUserTZ === todayInUserTZ;
    });
  }

  async getWeeklyIncomeEntries(userId: string, userTimezone?: string): Promise<IncomeEntry[]> {
    // Use user timezone if provided, otherwise use server time
    const now = userTimezone 
      ? new Date(new Date().toLocaleString("en-US", { timeZone: userTimezone }))
      : new Date();
    
    const startOfWeek = new Date(now);
    // Start of current week (Monday) - more intuitive for users
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), go back 6 days to Monday
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    
    return await db.select().from(incomeEntries).where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, startOfWeek)
      )
    );
  }

  async getQuickCashSuggestions(): Promise<QuickCashSuggestion[]> {
    return await db.select().from(quickCashSuggestions);
  }

  async getFilteredQuickCashSuggestions(requirements: any): Promise<QuickCashSuggestion[]> {
    // For now, return all suggestions - filtering logic can be added later
    return await db.select().from(quickCashSuggestions);
  }

  async createQuickCashSuggestion(suggestion: InsertQuickCashSuggestion): Promise<QuickCashSuggestion> {
    const [created] = await db
      .insert(quickCashSuggestions)
      .values(suggestion)
      .returning();
    return created;
  }

  async createUserProgress(userId: string, progress: InsertUserProgress): Promise<UserProgressEntry> {
    const id = randomUUID();
    const progressWithId = { ...progress, id, userId, achievedAt: new Date() };
    const [created] = await db
      .insert(userProgress)
      .values(progressWithId)
      .returning();
    return created;
  }

  async getUserProgress(userId: string): Promise<UserProgressEntry[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async createUserReflection(userId: string, reflection: InsertUserReflection): Promise<UserReflection> {
    const id = randomUUID();
    const reflectionWithId = { 
      ...reflection, 
      id, 
      userId, 
      reflection: reflection.reflection || null,
      strategy: reflection.strategy || null,
      createdAt: new Date() 
    };
    const [created] = await db
      .insert(userReflections)
      .values(reflectionWithId)
      .returning();
    return created;
  }

  async getUserReflections(userId: string): Promise<UserReflection[]> {
    return await db.select().from(userReflections).where(eq(userReflections.userId, userId));
  }

  async getUserAccounts(userId: string): Promise<UserAccount[]> {
    return await db.select().from(userAccounts).where(eq(userAccounts.userId, userId));
  }

  async createUserAccount(userId: string, account: InsertUserAccount): Promise<UserAccount> {
    const id = randomUUID();
    if (account.isDefault) {
      await db.update(userAccounts).set({ isDefault: false }).where(eq(userAccounts.userId, userId));
    }
    const [created] = await db
      .insert(userAccounts)
      .values({ ...account, id, userId })
      .returning();
    return created;
  }

  async deleteUserAccount(userId: string, accountId: string): Promise<boolean> {
    const result = await db.delete(userAccounts).where(
      and(eq(userAccounts.id, accountId), eq(userAccounts.userId, userId))
    ).returning();
    return result.length > 0;
  }

  async setDefaultAccount(userId: string, accountId: string): Promise<boolean> {
    await db.update(userAccounts).set({ isDefault: false }).where(eq(userAccounts.userId, userId));
    const [updated] = await db.update(userAccounts).set({ isDefault: true }).where(
      and(eq(userAccounts.id, accountId), eq(userAccounts.userId, userId))
    ).returning();
    return !!updated;
  }

  async getLatestReflection(userId: string): Promise<UserReflection | undefined> {
    const reflections = await this.getUserReflections(userId);
    return reflections.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
  }

  async sumIncomeSinceDate(userId: string, since: Date): Promise<number> {
    const entries = await db.select().from(incomeEntries).where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, since)
      )
    );
    return entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
  }

  async recomputeLevel(userId: string): Promise<{ advanced: boolean; to?: string; earned: number; target: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { currentLevel, levelStartedAt, levelTargets, primaryGoalType } = user;
    
    // Get target for current level
    const target = levelTargets?.[currentLevel as keyof typeof levelTargets]?.amount || 0;
    
    // Get income based on the user's goal timeframe preference
    let earned = 0;
    const timeframe = primaryGoalType || 'weekly';
    
    if (timeframe === 'daily') {
      // Check today's income vs daily target
      const todaysEntries = await this.getTodaysIncomeEntries(userId);
      earned = todaysEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    } else if (timeframe === 'weekly') {
      // Check this week's income vs weekly target
      const weeklyEntries = await this.getWeeklyIncomeEntries(userId);
      earned = weeklyEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    } else if (timeframe === 'monthly') {
      // Check this month's income vs monthly target
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      earned = await this.sumIncomeSinceDate(userId, monthStart);
    } else if (timeframe === 'yearly') {
      // Check this year's income vs yearly target
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      earned = await this.sumIncomeSinceDate(userId, yearStart);
    }
    
    // Check if target is achieved and can advance
    if (earned >= target && target > 0 && currentLevel !== 'legacy') {
      const nextLevel = this.getNextLevel(currentLevel);
      
      // Update user to next level and update highest level if higher
      const updates: any = {
        currentLevel: nextLevel,
        levelStartedAt: new Date(),
      };
      
      // Update highest level if this is a new peak
      const levels = ['foundation', 'stability', 'growth', 'legacy'];
      const currentIndex = levels.indexOf(user.highestLevel || 'foundation');
      const nextIndex = levels.indexOf(nextLevel);
      if (nextIndex > currentIndex) {
        updates.highestLevel = nextLevel;
      }
      
      await this.updateUser(userId, updates);
      
      return { advanced: true, to: nextLevel, earned, target };
    }
    
    return { advanced: false, earned, target };
  }

  private getNextLevel(currentLevel: string): string {
    switch (currentLevel) {
      case 'foundation': return 'stability';
      case 'stability': return 'growth';
      case 'growth': return 'legacy';
      default: return 'legacy';
    }
  }

  private getPrevLevel(currentLevel: string): string {
    switch (currentLevel) {
      case 'stability': return 'foundation';
      case 'growth': return 'stability'; 
      case 'legacy': return 'growth';
      default: return 'foundation';
    }
  }

  // Compute trailing run-rate: last 14 days income / 2
  async computeRunRateWeekly(userId: string): Promise<number> {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    
    const entries = await db.select().from(incomeEntries).where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, fourteenDaysAgo)
      )
    );
    
    const totalIncome = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    return totalIncome / 2; // Convert 14-day total to weekly run-rate
  }

  // Determine what level user is performing at based on run-rate
  computePerformingAt(runRateWeekly: number, levelTargets: any): string {
    if (!levelTargets) return 'foundation';
    
    if (levelTargets.legacy?.amount && runRateWeekly >= levelTargets.legacy.amount) return 'legacy';
    if (levelTargets.growth?.amount && runRateWeekly >= levelTargets.growth.amount) return 'growth';
    if (levelTargets.stability?.amount && runRateWeekly >= levelTargets.stability.amount) return 'stability';
    return 'foundation';
  }

  // Evaluate level state according to the graceful system
  async evaluateLevelState(userId: string): Promise<{ 
    performingAt: string; 
    userStatus: string; 
    runRateWeekly: number;
    graceStartAt: Date | null;
    downgradeOfferedAt: Date | null;
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const runRateWeekly = await this.computeRunRateWeekly(userId);
    const performingAt = this.computePerformingAt(runRateWeekly, user.levelTargets);
    
    // Only evaluate headwinds for users above foundation level
    // OR users who have previously achieved higher levels
    const shouldEvaluateHeadwinds = user.currentLevel !== 'foundation' || user.highestLevel !== 'foundation';
    
    // Check if performance is below current level requirements
    const currentLevelTarget = user.levelTargets?.[user.currentLevel as keyof typeof user.levelTargets]?.amount || 0;
    const below = shouldEvaluateHeadwinds && runRateWeekly < (0.7 * currentLevelTarget) && currentLevelTarget > 0;
    
    let newStatus = user.status;
    let graceStartAt = user.graceStartAt;
    let downgradeOfferedAt = user.downgradeOfferedAt;
    
    if (below) {
      if (!graceStartAt) {
        // Start grace period
        newStatus = 'headwinds';
        graceStartAt = new Date();
        downgradeOfferedAt = null;
      } else {
        // Check if grace period has expired (28 days)
        const daysSinceGrace = (new Date().getTime() - graceStartAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceGrace >= 28) {
          newStatus = 'support';
          downgradeOfferedAt = downgradeOfferedAt || new Date();
        }
      }
    } else {
      // Performance recovered
      newStatus = 'normal';
      graceStartAt = null;
      downgradeOfferedAt = null;
    }
    
    // Update user status if changed
    if (newStatus !== user.status || graceStartAt !== user.graceStartAt || downgradeOfferedAt !== user.downgradeOfferedAt) {
      await this.updateUser(userId, { 
        status: newStatus, 
        graceStartAt, 
        downgradeOfferedAt 
      });
    }
    
    return { performingAt, userStatus: newStatus, runRateWeekly, graceStartAt, downgradeOfferedAt };
  }

  // Move user back one level (user choice)
  async moveBackOneLevel(userId: string): Promise<{ success: boolean; newLevel: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const newLevel = this.getPrevLevel(user.currentLevel);
    await this.updateUser(userId, {
      currentLevel: newLevel,
      levelStartedAt: new Date(),
      status: 'normal',
      graceStartAt: null,
      downgradeOfferedAt: null
    });
    
    // Note: highestLevel is preserved - never downgraded
    return { success: true, newLevel };
  }

  // Adjust target for current level
  async adjustLevelTarget(userId: string, level: string, newTarget: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const updatedTargets = { ...user.levelTargets };
    updatedTargets[level as keyof typeof updatedTargets] = { amount: newTarget, currency: 'USD' };
    
    await this.updateUser(userId, { 
      levelTargets: updatedTargets,
      status: 'normal',
      graceStartAt: null,
      downgradeOfferedAt: null
    });
    
    return true;
  }
}

export const storage = new DatabaseStorage();
