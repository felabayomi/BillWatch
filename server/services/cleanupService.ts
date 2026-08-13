import { db } from "../db.js";
import { bills } from "../../shared/schema.js";
import { eq, and, lt, sql } from "drizzle-orm";

export interface CleanupSettings {
  enabled: boolean;
  action: 'delete' | 'archive';
  delayDays: number;
}

function getTaxSafeCutoffDate(delayDays: number): Date {
  const now = new Date();
  const currentYear = now.getFullYear();

  const taxDeadline = new Date(currentYear, 3, 15);
  const taxSafeDate = new Date(taxDeadline);
  taxSafeDate.setDate(taxSafeDate.getDate() + 90);

  const delayCutoff = new Date();
  delayCutoff.setDate(delayCutoff.getDate() - delayDays);

  if (now < taxSafeDate) {
    const prevTaxDeadline = new Date(currentYear - 1, 3, 15);
    const prevTaxSafeDate = new Date(prevTaxDeadline);
    prevTaxSafeDate.setDate(prevTaxSafeDate.getDate() + 90);

    if (now < prevTaxSafeDate) {
      const twoYearsAgo = new Date(currentYear - 2, 11, 31, 23, 59, 59);
      return delayCutoff < twoYearsAgo ? delayCutoff : twoYearsAgo;
    }

    const lastYearEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59);
    return delayCutoff < lastYearEnd ? delayCutoff : lastYearEnd;
  }

  const lastYearEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59);
  return delayCutoff < lastYearEnd ? delayCutoff : lastYearEnd;
}

function getTaxProtectionInfo(): { protectedYear: number; safeDate: string; explanation: string } {
  const now = new Date();
  const currentYear = now.getFullYear();

  const taxDeadline = new Date(currentYear, 3, 15);
  const taxSafeDate = new Date(taxDeadline);
  taxSafeDate.setDate(taxSafeDate.getDate() + 90);

  const protectedYear = currentYear;
  const previousYear = currentYear - 1;

  if (now < taxSafeDate) {
    return {
      protectedYear: previousYear,
      safeDate: taxSafeDate.toISOString(),
      explanation: `Bills from ${previousYear} and ${currentYear} are protected until ${taxSafeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (90 days after tax deadline). Only older bills are eligible for cleanup.`
    };
  }

  return {
    protectedYear: currentYear,
    safeDate: new Date(currentYear + 1, 3, 15 + 90).toISOString(),
    explanation: `Bills from ${currentYear} are protected for next year's tax season. Only bills from ${previousYear} and earlier that meet the delay requirement are eligible for cleanup.`
  };
}

export class CleanupService {
  async processAutoCleanup(settings: CleanupSettings): Promise<{
    processed: number;
    archived: number;
    deleted: number;
  }> {
    if (!settings.enabled) {
      return { processed: 0, archived: 0, deleted: 0 };
    }

    const cutoffDate = getTaxSafeCutoffDate(settings.delayDays);

    const billsToProcess = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.status, "paid"),
          lt(bills.paidDate, cutoffDate)
        )
      );

    let archived = 0;
    let deleted = 0;

    for (const bill of billsToProcess) {
      try {
        if (settings.action === 'archive') {
          await db
            .update(bills)
            .set({ 
              status: "archived",
              updatedAt: new Date()
            })
            .where(eq(bills.id, bill.id));
          archived++;
        } else {
          await db
            .delete(bills)
            .where(eq(bills.id, bill.id));
          deleted++;
        }
      } catch (error) {
        console.error(`Failed to process bill ${bill.id}:`, error);
      }
    }

    return {
      processed: billsToProcess.length,
      archived,
      deleted
    };
  }

  async getCleanupPreview(settings: CleanupSettings): Promise<{
    count: number;
    totalAmount: number;
    oldestBill: Date | null;
    taxProtection: { protectedYear: number; safeDate: string; explanation: string };
  }> {
    const taxProtection = getTaxProtectionInfo();

    if (!settings.enabled) {
      return { count: 0, totalAmount: 0, oldestBill: null, taxProtection };
    }

    const cutoffDate = getTaxSafeCutoffDate(settings.delayDays);

    const result = await db
      .select({
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${bills.amount})`,
        oldestPaidDate: sql<Date>`min(${bills.paidDate})`
      })
      .from(bills)
      .where(
        and(
          eq(bills.status, "paid"),
          lt(bills.paidDate, cutoffDate)
        )
      );

    const data = result[0];

    return {
      count: Number(data.count) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      oldestBill: data.oldestPaidDate || null,
      taxProtection
    };
  }

  async restoreArchivedBills(billIds: string[]): Promise<number> {
    if (billIds.length === 0) return 0;

    const result = await db
      .update(bills)
      .set({ 
        status: "paid",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(bills.status, "archived"),
          sql`${bills.id} = ANY(${billIds})`
        )
      );

    return result.rowCount || 0;
  }

  async getArchivedBills(userId: string) {
    return await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          eq(bills.status, "archived")
        )
      )
      .orderBy(bills.paidDate);
  }

  async deleteArchivedBills(billIds: string[]): Promise<number> {
    if (billIds.length === 0) return 0;

    const result = await db
      .delete(bills)
      .where(
        and(
          eq(bills.status, "archived"),
          sql`${bills.id} = ANY(${billIds})`
        )
      );

    return result.rowCount || 0;
  }
}

export const cleanupService = new CleanupService();
