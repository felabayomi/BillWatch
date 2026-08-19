import type { Router } from "express";
import { createIncomeRouter } from "./incomeRoutes.js";
import { isAuthenticated } from "../../../server/auth.js";
import { storage } from "./storage.js";
import { 
  insertIncomeEntrySchema,
  insertUserReflectionSchema,
  insertUserProgressSchema,
  insertUserAccountSchema,
  users,
  incomeEntries,
  userProgress,
  userReflections,
  levelHistory
} from "../shared/schema.js";
import { aiCashGenerator } from "./ai-cash-generator.js";
import { verifyMembershipCached, getTierForTool } from "./membership.js";
import {
  syncIncomeToFinanceWatch,
  getFinanceWatchSyncData,
} from "./financewatch-sync.js";
import { db } from "./db.js";
import { eq } from "drizzle-orm";

export async function registerIncomeRoutes(router: Router): Promise<void> {
  // Helper to get userId from Replit Auth claims
  const getUserId = (req: any): string => {
    return req.user?.claims?.sub;
  };

  async function getCanonicalUserEmail(req: any, userId: string): Promise<string> {
    const incomeUser = await storage.getUser(userId);
    const email = incomeUser?.email || req.user?.claims?.email || req.user?.email || "";
    return String(email).trim().toLowerCase();
  }

  // Membership status endpoint
  router.get("/membership/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const email = req.user?.claims?.email || user?.email;

      if (!email) {
        return res.json({
          hasAccess: false,
          reason: "no_email",
          redirectUrl: "https://felixpay.net/membership",
        });
      }

      const result = await verifyMembershipCached(email);

      if (!result.active || !result.hasAccess) {
        return res.json({
          hasAccess: false,
          reason: result.active ? "wrong_tier" : (result.status === "no_account" ? "no_subscription" : "expired"),
          tier: result.tier,
          requiredTier: getTierForTool(),
          redirectUrl: "https://felixpay.net/membership",
        });
      }

      res.json({
        hasAccess: true,
        tier: result.tier,
        expiresAt: result.expiresAt,
        allowedTools: result.allowedTools,
      });
    } catch (error) {
      console.error("Membership check failed:", error);
      res.json({
        hasAccess: false,
        reason: "error",
        redirectUrl: "https://felixpay.net/membership",
      });
    }
  });

  // One-time migration: transfer old user data to new OAuth user
  router.post("/admin/migrate-user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { oldUserId } = req.body;

      if (!oldUserId) {
        return res.status(400).json({ error: "oldUserId required" });
      }

      const oldUser = await db.select().from(users).where(eq(users.id, oldUserId));
      if (oldUser.length === 0) {
        return res.status(404).json({ error: "Old user not found" });
      }

      const old = oldUser[0];
      await db.update(users).set({
        username: old.username,
        currentLevel: old.currentLevel,
        levelStartedAt: old.levelStartedAt,
        dailyGoal: old.dailyGoal,
        weeklyGoal: old.weeklyGoal,
        monthlyGoal: old.monthlyGoal,
        yearlyGoal: old.yearlyGoal,
        primaryGoalType: old.primaryGoalType,
        levelTargets: old.levelTargets,
        showManifesto: old.showManifesto,
        highestLevel: old.highestLevel,
        status: old.status,
        graceStartAt: old.graceStartAt,
        downgradeOfferedAt: old.downgradeOfferedAt,
      }).where(eq(users.id, userId));

      await db.update(incomeEntries).set({ userId }).where(eq(incomeEntries.userId, oldUserId));
      await db.update(userProgress).set({ userId }).where(eq(userProgress.userId, oldUserId));
      await db.update(userReflections).set({ userId }).where(eq(userReflections.userId, oldUserId));
      
      try {
        await db.update(levelHistory).set({ userId }).where(eq(levelHistory.userId, oldUserId));
      } catch (e) {}

      console.log(`Migrated data from user ${oldUserId} (${old.username}) to ${userId}`);
      res.json({ success: true, migratedFrom: old.username, incomeEntries: "transferred" });
    } catch (error) {
      console.error("Migration failed:", error);
      res.status(500).json({ error: "Migration failed" });
    }
  });

  // Income entries
  router.post("/income", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { accountName, ...incomeData } = req.body;
      console.log("Received income data:", incomeData);
      const validatedData = insertIncomeEntrySchema.parse(incomeData);
      console.log("Validated data:", validatedData);
      const entry = await storage.createIncomeEntry(userId, validatedData);
      
      try {
        const levelResult = await storage.recomputeLevel(userId);
        if (levelResult.advanced) {
          console.log(`User advanced to ${levelResult.to} level!`);
        }
      } catch (levelError) {
        console.warn("Level recomputation failed:", levelError);
      }

      const userEmail = await getCanonicalUserEmail(req, userId);

      console.log(
        "[income-finance-sync] Preparing sync",
        {
          userId,
          email: userEmail,
          requestedAccount: accountName || null,
          incomeId: entry.id,
          amount: entry.amount,
        },
      );

      if (!userEmail) {
        console.error(
          "[income-finance-sync] SKIPPED: canonical email is missing",
          {
            userId,
            incomeId: entry.id,
          },
        );
      } else {
        const syncResult = await syncIncomeToFinanceWatch(
          userId,
          userEmail,
          {
            id: entry.id,
            amount: entry.amount,
            source: entry.source,
            notes: entry.notes,
            date: entry.date,
          },
          accountName,
        );

        if (!syncResult.success) {
          console.error(
            "[income-finance-sync] FAILED",
            {
              userId,
              email: userEmail,
              incomeId: entry.id,
              requestedAccount: accountName || null,
              error: syncResult.error,
            },
          );
        } else {
          console.log(
            "[income-finance-sync] SUCCESS",
            {
              incomeId: entry.id,
              transactionId: syncResult.transactionId,
              duplicate: syncResult.duplicate || false,
              requestedAccount: accountName || null,
            },
          );
        }
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Income validation error:", error);
      res.status(400).json({ error: "Invalid income entry data", details: error });
    }
  });

  router.get("/income/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const userTimezone = req.query.timezone as string;
      const entries = await storage.getTodaysIncomeEntries(userId, userTimezone);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's income" });
    }
  });

  router.get("/income/week", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const userTimezone = req.query.timezone as string;
      const entries = await storage.getWeeklyIncomeEntries(userId, userTimezone);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly income" });
    }
  });

  // User accounts
  router.get("/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const accounts = await storage.getUserAccounts(userId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  router.post("/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertUserAccountSchema.parse(req.body);
      const account = await storage.createUserAccount(userId, validatedData);
      res.json(account);
    } catch (error) {
      console.error("Account creation error:", error);
      res.status(400).json({ error: "Invalid account data" });
    }
  });

  router.delete("/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteUserAccount(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  router.patch("/accounts/:id/default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const success = await storage.setDefaultAccount(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set default account" });
    }
  });

  router.get("/accounts/financewatch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const incomeUser = await storage.getUser(userId);
      const email = incomeUser?.email || req.user?.claims?.email || "";

      if (!email) {
        return res.status(400).json({
          error: "No email found",
        });
      }

      const data = await getFinanceWatchSyncData(userId, email);

      res.json({
        accounts: data.accounts.map((account: any) =>
          typeof account === "string"
            ? account
            : account?.name || "",
        ),
        categories: data.categories.map((category: any) =>
          typeof category === "string"
            ? category
            : category?.name || "",
        ),
      });
    } catch (error) {
      console.error("FinanceWatch accounts fetch error:", error);
      res.status(500).json({ error: "Failed to fetch FinanceWatch accounts" });
    }
  });

  router.get("/income/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const entries = await storage.getIncomeEntries(userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch income entries" });
    }
  });

  // Quick cash suggestions
  router.get("/quick-cash", async (req, res) => {
    try {
      const suggestions = await storage.getQuickCashSuggestions();
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quick cash suggestions" });
    }
  });

  router.post("/quick-cash/filtered", async (req, res) => {
    try {
      const answers = req.body;
      const allSuggestions = await storage.getQuickCashSuggestions();
      const { top, related } = rankOpportunities(answers, allSuggestions);
      
      const formatOpportunity = (opp: any) => ({
        id: opp.id,
        title: opp.title,
        est: `$${opp.earningsMin}â€“$${opp.earningsMax}`,
        cashBy: opp.payoutSpeed === 'today' ? 'Today' : opp.payoutSpeed === '3days' ? 'â‰ˆ 3 days' : 'â‰ˆ 1 week',
        why: explainMatch(opp, answers),
        steps: opp.howToStart?.slice(0, 3) || [],
        notes: opp.notes,
        tags: opp.tags || []
      });

      if (top.length < 3) {
        console.log(`Only ${top.length} database matches found, generating AI opportunities...`);
        
        try {
          const aiOpportunities = await aiCashGenerator.generateOpportunities(answers);
          console.log(`AI generated ${aiOpportunities.length} opportunities`);
          
          const aiFormatted = aiOpportunities.map((opp, index) => ({
            id: `ai-${Date.now()}-${index}`,
            title: opp.title,
            est: `$${opp.earningsMin}â€“$${opp.earningsMax}`,
            cashBy: opp.payoutSpeed === 'today' ? 'Today' : opp.payoutSpeed === '3days' ? 'â‰ˆ 3 days' : 'â‰ˆ 1 week',
            why: `Smart match for your ${answers.skills?.join(', ') || 'general'} skills and ${answers.assets?.join(', ') || 'available'} assets`,
            steps: opp.howToStart?.slice(0, 3) || [],
            notes: opp.notes || 'Personalized suggestion based on your profile',
            tags: ['personalized', opp.category],
            isAIGenerated: true
          }));
          
          const combinedResults = [...aiFormatted, ...top.map(formatOpportunity)].slice(0, 5);
          
          return res.json({
            results: combinedResults,
            related: related.length > 0 ? related.map(formatOpportunity) : [],
            message: combinedResults.length > 0 
              ? "Enhanced suggestions based on your unique profile" 
              : "Analyzing your profile for custom opportunities...",
            aiGenerated: true,
            tips: combinedResults.length === 0 ? ["Try expanding your timeline", "Consider online opportunities", "Check if you have items to sell"] : []
          });
          
        } catch (aiError) {
          console.error('AI generation failed, falling back to standard response:', aiError);
          return res.json({
            results: top.map(formatOpportunity),
            related: related.map(formatOpportunity),
            message: "No perfect matches yet. Try cash-out in ~3 days or add 'digital' to skills. Every option is based on what you have today.",
            tips: ["Switch cash-out to 'within 3 days'", "Add 'digital tasks' to skills", "Allow indoor tasks"]
          });
        }
      }

      const result: any = {
        results: top.map(formatOpportunity)
      };

      if (related.length > 0) {
        result.related = related.map(formatOpportunity);
        result.relatedNote = "Related options (if you can be flexible):";
      }

      res.json(result);
    } catch (error) {
      console.error("Smart filtering error:", error);
      res.status(500).json({ error: "Failed to filter suggestions" });
    }
  });

  function scoreOpportunity(opp: any, answers: any): number {
    let score = 0;

    if (opp.requires.transport !== "any") {
      if (opp.requires.transport === "car" && answers.transport !== "car/van") return -Infinity;
      if (opp.requires.transport === "bike" && answers.transport === "none") return -Infinity;
    }
    
    if (answers.peopleComfort === "low" && opp.requires.people === "high") return -Infinity;
    if (opp.requires.heavy && !answers.physical?.canLiftHeavy) return -Infinity;
    if (opp.requires.indoor && !answers.physical?.preferIndoors) return -Infinity;
    if (opp.fits.onlineOk && !answers.onlineOk) return -Infinity;

    const timeScore = timeFits(answers.freeHours || answers.hasTime, opp.timeRequired) ? 12 : 0;
    score += timeScore;

    const speedWeightMap: Record<string, number> = { today: 14, "3days": 8, "7days": 4 };
    const speedWeight = speedWeightMap[answers.needCashBy || 'today'] || 4;
    const speedScore = opp.payoutSpeed === "today" ? speedWeight :
                      opp.payoutSpeed === "3days" ? Math.max(0, speedWeight - 4) :
                      Math.max(0, speedWeight - 8);
    score += speedScore;

    if (answers.skills && intersects(answers.skills, opp.fits.skillsAny)) score += 10;
    if (answers.assets && intersects(answers.assets, opp.fits.assetsAny)) score += 6;
    if (opp.fits.locationAny.includes(answers.locationType || 'suburban')) score += 4;

    if (answers.itemsToSell && opp.category === "resale") score += 12;

    const comfortMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const userComfort = comfortMap[answers.peopleComfort || (answers.comfortableWithPeople ? 'high' : 'low')] || 1;
    const requiredComfort = comfortMap[opp.requires.people] || 1;
    if (userComfort >= requiredComfort) score += 5;

    const midEarnings = (opp.earningsMin + opp.earningsMax) / 2;
    score += Math.min(12, Math.round(midEarnings / 20));

    return score;
  }

  function timeFits(userHours: string, oppTime: string): boolean {
    const hourMap: Record<string, number> = { "0-1": 1, "1-2": 2, "2-3": 3, "3-4": 4, "4+": 5 };
    const requiredHours = oppTime.includes("1-3") ? 3 : oppTime.includes("3-5") ? 4 : 2;
    const availableHours = hourMap[userHours] || 3;
    return availableHours >= requiredHours;
  }

  function intersects(userArray: string[], oppArray: string[] = []): boolean {
    return userArray.some(item => oppArray.includes(item));
  }

  function rankOpportunities(answers: any, opportunities: any[]): { top: any[], related: any[] } {
    const TOP_K = 5, RELATED_K = 3;
    
    const hardMatches = opportunities
      .map(opp => ({ opp, score: scoreOpportunity(opp, answers) }))
      .filter(item => item.score > -Infinity)
      .sort((a, b) => b.score - a.score);
    
    const top = diversifyResults(hardMatches.map(item => item.opp), TOP_K);
    
    if (top.length >= TOP_K) {
      return { top, related: [] };
    }
    
    const relaxedMatches = opportunities
      .filter(opp => canRelaxConstraints(opp, answers))
      .map(opp => ({ opp, score: scoreOpportunityRelaxed(opp, answers) }))
      .filter(item => item.score > -Infinity && !top.find(t => t.id === item.opp.id))
      .sort((a, b) => b.score - a.score);
    
    const needed = Math.max(3, TOP_K - top.length);
    const related = diversifyResults(relaxedMatches.map(item => item.opp), needed);
    
    return { top, related };
  }

  function diversifyResults(opportunities: any[], maxCount: number): any[] {
    const result = [];
    const categoryCount: { [key: string]: number } = {};
    
    for (const opp of opportunities) {
      const category = opp.category || 'other';
      if ((categoryCount[category] || 0) >= 2) continue;
      
      result.push(opp);
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      
      if (result.length >= maxCount) break;
    }
    
    return result;
  }

  function canRelaxConstraints(opp: any, answers: any): boolean {
    if (opp.requires.transport === "car" && answers.transport !== "car/van") return false;
    if (opp.requires.heavy && !answers.physical?.canLiftHeavy) return false;
    if (answers.peopleComfort === "low" && opp.requires.people === "high") return false;
    
    return true;
  }

  function scoreOpportunityRelaxed(opp: any, answers: any): number {
    const baseScore = scoreOpportunity(opp, answers);
    if (baseScore === -Infinity) return -Infinity;
    
    return Math.max(0, baseScore - 15);
  }

  function explainMatch(opp: any, answers: any): string {
    const reasons = [];
    
    if (opp.payoutSpeed === 'today') reasons.push('cash today');
    else if (opp.payoutSpeed === '3days') reasons.push('cash soon');
    
    if (answers.transport === 'car/van' && opp.requires.transport === 'car') reasons.push('car');
    if (answers.freeHours === '4+' || opp.timeRequired.includes('3-5')) reasons.push('4+ hrs');
    if (answers.peopleComfort === 'low') reasons.push('low people contact');
    if (answers.itemsToSell && opp.category === 'resale') reasons.push('sell items');
    if (answers.physical?.canLiftHeavy && opp.requires.heavy) reasons.push('lift heavy');
    if (answers.onlineOk && opp.fits.onlineOk) reasons.push('online OK');
    
    return reasons.length > 0 ? reasons.slice(0, 3).join(' Â· ') : 'good match';
  }

  // User progress
  router.post("/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertUserProgressSchema.parse(req.body);
      const progress = await storage.createUserProgress(userId, validatedData);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: "Invalid progress data" });
    }
  });

  router.get("/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user progress" });
    }
  });

  // User reflections
  router.post("/reflections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const dataWithDate = {
        ...req.body,
        weekStart: new Date(req.body.weekStart)
      };
      
      const validatedData = insertUserReflectionSchema.parse(dataWithDate);
      const reflection = await storage.createUserReflection(userId, validatedData);
      res.json(reflection);
    } catch (error) {
      res.status(400).json({ error: "Invalid reflection data" });
    }
  });

  router.get("/reflections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const reflections = await storage.getUserReflections(userId);
      res.json(reflections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reflections" });
    }
  });

  // User profile
  router.get("/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      let user = await storage.getUser(userId);

      if (!user) {
        const email = req.user?.claims?.email || null;
        const firstName = req.user?.claims?.first_name || req.user?.claims?.firstName || null;
        const lastName = req.user?.claims?.last_name || req.user?.claims?.lastName || null;
        const username = req.user?.claims?.username || email?.split("@")[0] || `user-${userId.slice(-8)}`;

        user = await storage.createUser(
          {
            username,
            email,
            firstName,
            lastName,
          },
          userId,
        );

        console.log(`[income-user] Created IncomeLift user ${userId}`);
      }

      res.json(user);
    } catch (error) {
      console.error("Failed to fetch/create IncomeLift user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  router.patch("/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  router.post("/user/adjust-weekly-goal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { goalField, newGoal } = req.body;
      
      if (!goalField || typeof newGoal !== 'number' || newGoal < 0) {
        return res.status(400).json({ error: "Invalid goal data" });
      }
      
      const validGoalFields = ['dailyGoal', 'weeklyGoal', 'monthlyGoal', 'yearlyGoal'];
      if (!validGoalFields.includes(goalField)) {
        return res.status(400).json({ error: "Invalid goal field" });
      }
      
      const calculateDerivedGoals = (value: number, type: string) => {
        const goals: any = {};
        
        switch (type) {
          case 'dailyGoal':
            goals.dailyGoal = value.toFixed(2);
            goals.weeklyGoal = (value * 7).toFixed(2);
            goals.monthlyGoal = (value * 30).toFixed(2);
            goals.yearlyGoal = (value * 365).toFixed(2);
            break;
          case 'weeklyGoal':
            goals.dailyGoal = (value / 7).toFixed(2);
            goals.weeklyGoal = value.toFixed(2);
            goals.monthlyGoal = (value * 4.33).toFixed(2);
            goals.yearlyGoal = (value * 52).toFixed(2);
            break;
          case 'monthlyGoal':
            goals.dailyGoal = (value / 30).toFixed(2);
            goals.weeklyGoal = (value / 4.33).toFixed(2);
            goals.monthlyGoal = value.toFixed(2);
            goals.yearlyGoal = (value * 12).toFixed(2);
            break;
          case 'yearlyGoal':
            goals.dailyGoal = (value / 365).toFixed(2);
            goals.weeklyGoal = (value / 52).toFixed(2);
            goals.monthlyGoal = (value / 12).toFixed(2);
            goals.yearlyGoal = value.toFixed(2);
            break;
        }
        
        return goals;
      };
      
      const derivedGoals = calculateDerivedGoals(newGoal, goalField);
      
      const updates: any = {
        ...derivedGoals,
        status: 'normal',
        graceStartAt: null,
        downgradeOfferedAt: null
      };
      
      const user = await storage.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, goalField, newGoal, updatedGoals: derivedGoals });
    } catch (error) {
      console.error('Failed to adjust goal:', error);
      res.status(500).json({ error: "Failed to adjust goal" });
    }
  });

  // Level progress
  router.get("/level/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const levelResult = await storage.recomputeLevel(userId);
      res.json(levelResult);
    } catch (error) {
      res.status(500).json({ error: "Failed to get level progress" });
    }
  });

  router.get("/level/state", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const levelState = await storage.evaluateLevelState(userId);
      
      res.json({
        currentLevel: user.currentLevel,
        highestLevel: user.highestLevel,
        performingAt: levelState.performingAt,
        status: levelState.userStatus,
        runRateWeekly: levelState.runRateWeekly,
        graceStartAt: levelState.graceStartAt,
        downgradeOfferedAt: levelState.downgradeOfferedAt,
        levelTargets: user.levelTargets
      });
    } catch (error) {
      console.error('Failed to get level state:', error);
      res.status(500).json({ error: "Failed to get level state" });
    }
  });

  router.post("/level/adjust-target", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { level, newTarget } = req.body;
      
      if (!level || typeof newTarget !== 'number' || newTarget < 0) {
        return res.status(400).json({ error: "Invalid level or target amount" });
      }
      
      if (!['foundation', 'stability', 'growth', 'legacy'].includes(level)) {
        return res.status(400).json({ error: "Invalid level" });
      }
      
      const success = await storage.adjustLevelTarget(userId, level, newTarget);
      res.json({ success });
    } catch (error) {
      console.error('Failed to adjust level target:', error);
      res.status(500).json({ error: "Failed to adjust level target" });
    }
  });

  router.post("/level/move-back", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = await storage.moveBackOneLevel(userId);
      res.json(result);
    } catch (error) {
      console.error('Failed to move back level:', error);
      res.status(500).json({ error: "Failed to move back level" });
    }
  });

}


