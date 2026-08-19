import { users, type User, type UpsertUser } from "@shared/models/auth";
import { incomeEntries, userProgress, userReflections, levelHistory } from "../../../shared/schema.js";
import { db } from "../../db.js";
import { eq, and, ne, isNotNull } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

const EMAIL_TO_LEGACY_USERNAME: Record<string, string> = {
  "dtlnavigation@gmail.com": "Olusola",
  "felixdguide@gmail.com": "Admin",
};

class AuthStorage implements IAuthStorage {
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

    if (userData.email) {
      await this.autoMigrateLegacyData(user.id, userData.email);
    }

    return user;
  }

  private async autoMigrateLegacyData(newUserId: string, email: string): Promise<void> {
    try {
      const newUser = await this.getUser(newUserId);
      if (!newUser) return;
      if (newUser.currentLevel !== 'foundation') return;
      if (Number(newUser.dailyGoal) > 0 || Number(newUser.weeklyGoal) > 0) return;

      let legacyUser: User | undefined;

      const legacyUsername = EMAIL_TO_LEGACY_USERNAME[email];
      if (legacyUsername) {
        const results = await db.select().from(users)
          .where(and(
            eq(users.username, legacyUsername),
            ne(users.id, newUserId)
          ));
        legacyUser = results[0];
      }

      if (!legacyUser) {
        const results = await db.select().from(users)
          .where(and(
            eq(users.email, email),
            ne(users.id, newUserId),
            isNotNull(users.password)
          ));
        legacyUser = results[0];
      }

      if (!legacyUser) return;

      console.log(`Auto-migrating data from legacy user ${legacyUser.id} (${legacyUser.username}) to OAuth user ${newUserId} (${email})`);

      const legacyId = legacyUser.id;
      const oldUsername = legacyUser.username;

      await db.update(incomeEntries).set({ userId: newUserId }).where(eq(incomeEntries.userId, legacyId));
      await db.update(userProgress).set({ userId: newUserId }).where(eq(userProgress.userId, legacyId));
      await db.update(userReflections).set({ userId: newUserId }).where(eq(userReflections.userId, legacyId));

      try {
        await db.update(levelHistory).set({ userId: newUserId }).where(eq(levelHistory.userId, legacyId));
      } catch (e) {}

      await db.delete(users).where(eq(users.id, legacyId));

      await db.update(users).set({
        username: oldUsername,
        currentLevel: legacyUser.currentLevel,
        levelStartedAt: legacyUser.levelStartedAt,
        dailyGoal: legacyUser.dailyGoal,
        weeklyGoal: legacyUser.weeklyGoal,
        monthlyGoal: legacyUser.monthlyGoal,
        yearlyGoal: legacyUser.yearlyGoal,
        primaryGoalType: legacyUser.primaryGoalType,
        levelTargets: legacyUser.levelTargets,
        showManifesto: legacyUser.showManifesto,
        highestLevel: legacyUser.highestLevel,
        status: legacyUser.status,
        graceStartAt: legacyUser.graceStartAt,
        downgradeOfferedAt: legacyUser.downgradeOfferedAt,
      }).where(eq(users.id, newUserId));

      console.log(`Successfully migrated data from ${oldUsername} to new OAuth user ${newUserId}`);
    } catch (error) {
      console.error("Auto-migration failed (non-fatal):", error);
    }
  }
}

export const authStorage = new AuthStorage();
