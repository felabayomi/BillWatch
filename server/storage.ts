import { 
  users, 
  bills, 
  reminders,
  conversations,
  billPayments,
  accounts,
  type User, 
  type InsertUser,
  type UpsertUser, 
  type Bill, 
  type InsertBill, 
  type UpdateBill,
  type Reminder,
  type InsertReminder,
  type Conversation,
  type InsertConversation,
  type BillPayment,
  type InsertBillPayment,
  type UpdateBillPayment,
  type Account,
  type InsertAccount
} from "@shared/schema";
import { db } from "./db.js";
import { eq, and, desc, asc, gte, lte, lt, gt, isNull, or, ne, not, sum } from "drizzle-orm";

export interface IStorage {
  // User methods used by OpenID Connect authentication.
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Bill methods
  getBill(id: string): Promise<Bill | undefined>;
  getAllBills(): Promise<Bill[]>;
  getBillsByUser(userId: string, month?: number, year?: number, includeArchived?: boolean): Promise<Bill[]>;
  getCarryoverOverdueBills(userId: string, month?: number, year?: number): Promise<Bill[]>;
  getBillsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<Bill[]>;
  getBillsByStatus(userId: string, status: Bill["status"]): Promise<Bill[]>;
  createBill(bill: InsertBill & { userId: string }): Promise<Bill>;
  updateBill(id: string, bill: UpdateBill): Promise<Bill>;
  updateBillsInSeries(seriesId: string, excludeBillId: string, updates: Partial<UpdateBill>): Promise<void>;
  deleteBill(id: string): Promise<void>;
  
  // Reminder methods
  getReminder(id: string): Promise<Reminder | undefined>;
  getRemindersByBill(billId: string): Promise<Reminder[]>;
  getPendingReminders(): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  
  // Stats methods
  getBillStats(userId: string, month?: number, year?: number): Promise<{
    thisMonth: number;
    upcoming: number;
    overdue: number;
    paid: number;
    total: number;
    paidThisMonth: number;
    remainingThisMonth: number;
    nextDueDate: string | null;
    nextDueBill: string | null;
    // Cumulative totals through selected month
    cumulativeTotal: number;
    cumulativePaid: number;
    cumulativeUnpaid: number;
    // True all-time totals (never change)
    allTimeTotal: number;
    allTimePaid: number;
    allTimeUnpaid: number;
  }>;
  
  // Recurring bill series methods
  getBillsBySeries(seriesId: string): Promise<Bill[]>;
  createBillSeries(bills: Array<InsertBill & { userId: string }>): Promise<Bill[]>;
  generateRecurringBills(baseBill: Bill): Promise<void>;
  
  // Conversation methods
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(userId: string, conversation: InsertConversation): Promise<Conversation>;
  
  // Export methods for external API integration
  getAllBillsForExport(filters?: {
    userId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Bill[]>;
  
  // Payment methods
  createPayment(payment: InsertBillPayment & { billId: string }): Promise<BillPayment>;
  getPayment(paymentId: string): Promise<BillPayment | undefined>;
  getPaymentsByBill(billId: string): Promise<BillPayment[]>;
  updatePayment(paymentId: string, updates: UpdateBillPayment): Promise<BillPayment>;
  calculateBillBalance(billId: string): Promise<{ totalAmount: number, paidAmount: number, remainingBalance: number }>;
  getBillWithPayments(billId: string): Promise<(Bill & { payments: BillPayment[] }) | null>;
  
  // Custom categories
  updateUserCustomCategories(userId: string, categories: string[]): Promise<void>;

  // Account methods
  getAccountsByUser(userId: string): Promise<Account[]>;
  createAccount(userId: string, data: InsertAccount): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
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

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt));
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill || undefined;
  }

  async getAllBills(): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .orderBy(asc(bills.dueDate));
  }

  async getBillsByUser(userId: string, month?: number, year?: number, includeArchived: boolean = false): Promise<Bill[]> {
    let whereConditions = [eq(bills.userId, userId)];
    
    if (!includeArchived) {
      whereConditions.push(ne(bills.status, "archived"));
    }
    
    // Add month/year filtering if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1); // month is 1-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // end of last day of the month
      whereConditions.push(gte(bills.dueDate, startDate));
      whereConditions.push(lte(bills.dueDate, endDate));
    }
    
    return await db
      .select()
      .from(bills)
      .where(and(...whereConditions))
      .orderBy(asc(bills.dueDate));
  }

  async getCarryoverOverdueBills(userId: string, month?: number, year?: number): Promise<Bill[]> {
    if (!month || !year) return [];
    
    const startOfMonth = new Date(year, month - 1, 1);
    
    return await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          ne(bills.status, "paid"),
          ne(bills.status, "archived"),
          lt(bills.dueDate, startOfMonth)
        )
      )
      .orderBy(asc(bills.dueDate));
  }

  async getBillsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          gte(bills.dueDate, startDate),
          lte(bills.dueDate, endDate)
        )
      )
      .orderBy(asc(bills.dueDate));
  }

  async getBillsByStatus(userId: string, status: Bill["status"]): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          eq(bills.status, status)
        )
      )
      .orderBy(asc(bills.dueDate));
  }

  async createBill(bill: InsertBill & { userId: string }): Promise<Bill> {
    const billData = {
      ...bill,
      status: (bill.status as "upcoming" | "due_soon" | "overdue" | "paid") || "upcoming",
      recurringType: bill.recurringType as "payment_plan" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannually" | "yearly" | "custom" | null,
      paymentType: bill.paymentType ? (bill.paymentType as "manual" | "automatic" | "real_payment" | "billcom_complete" | "billcom_partial" | "billcom_invoice") : null,
      creditorPaymentMethod: bill.creditorPaymentMethod ? (bill.creditorPaymentMethod as "ach" | "check" | "wire") : null,
      creditorPaymentAddress: bill.creditorPaymentAddress ? {
        name: typeof bill.creditorPaymentAddress.name === 'string' ? bill.creditorPaymentAddress.name : undefined,
        address1: typeof bill.creditorPaymentAddress.address1 === 'string' ? bill.creditorPaymentAddress.address1 : undefined,
        address2: typeof bill.creditorPaymentAddress.address2 === 'string' ? bill.creditorPaymentAddress.address2 : undefined,
        city: typeof bill.creditorPaymentAddress.city === 'string' ? bill.creditorPaymentAddress.city : undefined,
        state: typeof bill.creditorPaymentAddress.state === 'string' ? bill.creditorPaymentAddress.state : undefined,
        zip: typeof bill.creditorPaymentAddress.zip === 'string' ? bill.creditorPaymentAddress.zip : undefined,
        country: typeof bill.creditorPaymentAddress.country === 'string' ? bill.creditorPaymentAddress.country : undefined
      } : null,
      extractedData: bill.extractedData ? {
        originalText: typeof bill.extractedData.originalText === 'string' ? bill.extractedData.originalText : undefined,
        confidence: typeof bill.extractedData.confidence === 'number' ? bill.extractedData.confidence : undefined,
        extractedFields: bill.extractedData.extractedFields || undefined
      } : null
    };
    const [newBill] = await db
      .insert(bills)
      .values([billData])
      .returning();

    // If this is a recurring bill, generate future instances
    if (bill.isRecurring && bill.recurringType && bill.recurringType !== "payment_plan") {
      await this.generateRecurringBills(newBill);
    }

    return newBill;
  }

  async updateBill(id: string, bill: UpdateBill): Promise<Bill> {
    const updateData: any = { 
      ...bill, 
      updatedAt: new Date(),
    };
    if (bill.status) {
      updateData.status = bill.status as "upcoming" | "due_soon" | "overdue" | "paid";
    }

    // Backward compatibility: If payment information is being updated and bill is marked as paid,
    // optionally create a payment record to support the new partial payment system
    if (bill.status === "paid" && bill.paidAmount && bill.paymentMethod) {
      try {
        // Create a payment record for the new partial payment functionality
        const paymentData: InsertBillPayment & { billId: string } = {
          billId: id,
          amount: bill.paidAmount,
          paymentMethod: bill.paymentMethod,
          paymentType: bill.paymentType || "manual",
          status: "succeeded",
          paidAt: bill.paidDate || new Date(),
          notes: `Legacy payment record created from bill update`
        };
        
        // Only create payment record if it doesn't already exist for this exact amount and date
        const existingPayments = await db
          .select()
          .from(billPayments)
          .where(
            and(
              eq(billPayments.billId, id),
              eq(billPayments.amount, bill.paidAmount),
              eq(billPayments.status, "succeeded")
            )
          );

        if (existingPayments.length === 0) {
          await this.createPayment(paymentData);
        }
      } catch (error) {
        // Silently continue if payment record creation fails to maintain backward compatibility
        console.warn(`Failed to create payment record for bill ${id}:`, error);
      }
    }

    // Get the current bill to check if recurring is being turned off
    const [currentBill] = await db.select().from(bills).where(eq(bills.id, id));
    
    const [updatedBill] = await db
      .update(bills)
      .set(updateData)
      .where(eq(bills.id, id))
      .returning();

    // If recurring is being turned ON, generate future instances
    // Check both: transitioning from non-recurring to recurring, AND already recurring but no siblings exist
    if (bill.isRecurring === true && bill.recurringType !== "payment_plan") {
      // Default to monthly if no recurring type specified
      if (!updatedBill.recurringType) {
        await db.update(bills).set({ recurringType: "monthly" }).where(eq(bills.id, id));
        updatedBill.recurringType = "monthly";
      }
      
      // Check if there are any existing sibling bills in the series
      const seriesId = updatedBill.seriesId || id;
      const existingSiblings = await db.select({ id: bills.id })
        .from(bills)
        .where(and(
          or(eq(bills.seriesId, seriesId), eq(bills.seriesId, id)),
          not(eq(bills.id, id))
        ));
      
      // Only generate if transitioning to recurring OR no siblings exist
      if (!currentBill?.isRecurring || existingSiblings.length === 0) {
        console.log(`Recurring turned ON for bill ${id} with type ${updatedBill.recurringType}, generating future bills... (was recurring: ${currentBill?.isRecurring}, siblings: ${existingSiblings.length})`);
        await this.generateRecurringBills(updatedBill);
      }
    }
    
    // If recurring is being turned OFF, delete all related unpaid bills in the series
    // Handle multiple scenarios:
    // 1. Bill was recurring and is now being set to non-recurring
    // 2. Bill is already non-recurring but still has a seriesId (previous delete failed)
    // Note: Handle both boolean false and string "false" from frontend
    const isRecurringFalse = bill.isRecurring === false || bill.isRecurring === "false" as any;
    const isRecurringTurnedOff = (
      // Case 1: Currently recurring, being set to non-recurring
      (currentBill?.isRecurring === true && isRecurringFalse) ||
      // Case 2: Bill is non-recurring but still part of a series (cleanup case)
      (isRecurringFalse && currentBill?.seriesId)
    );
    
    console.log(`Update bill ${id}: currentBill.isRecurring=${currentBill?.isRecurring}, bill.isRecurring=${bill.isRecurring}, seriesId=${currentBill?.seriesId}, isRecurringTurnedOff=${isRecurringTurnedOff}`);
    
    if (isRecurringTurnedOff) {
      console.log(`Recurring turned off for bill ${id}, deleting related unpaid bills...`);
      
      // Determine the series ID to use - could be this bill's ID (if parent) or its seriesId (if child)
      const parentSeriesId = currentBill?.seriesId || id;
      
      // First, find all unpaid bills in this series (except the current bill)
      const billsToDelete = await db.select({ id: bills.id })
        .from(bills)
        .where(and(
          or(
            eq(bills.seriesId, id),
            eq(bills.seriesId, parentSeriesId)
          ),
          not(eq(bills.status, "paid")),
          not(eq(bills.id, id))
        ));
      
      // Delete reminders FIRST (before deleting bills) to avoid foreign key violations
      for (const bill of billsToDelete) {
        await db.delete(reminders).where(eq(reminders.billId, bill.id));
      }
      
      // Now delete the bills
      const deletedFromSeries = await db.delete(bills)
        .where(and(
          or(
            eq(bills.seriesId, id),
            eq(bills.seriesId, parentSeriesId)
          ),
          not(eq(bills.status, "paid")),
          not(eq(bills.id, id))
        ))
        .returning();
      
      console.log(`Deleted ${deletedFromSeries.length} unpaid recurring bills from series`);
      
      // Also update the parent bill (if different) to stop it from being recurring
      if (currentBill?.seriesId && currentBill.seriesId !== id) {
        await db.update(bills)
          .set({ isRecurring: false, recurringType: null, totalInstallments: null })
          .where(eq(bills.id, currentBill.seriesId));
        console.log(`Updated parent bill ${currentBill.seriesId} to non-recurring`);
      }
      
      // Clear series association from current bill
      await db.update(bills)
        .set({ seriesId: null, recurringType: null, totalInstallments: null })
        .where(eq(bills.id, id));
    }

    return updatedBill;
  }

  async updateBillsInSeries(seriesId: string, excludeBillId: string, updates: Partial<UpdateBill>): Promise<void> {
    // Update all bills in the same series except the one we already updated
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };
    
    await db
      .update(bills)
      .set(updateData)
      .where(and(
        eq(bills.seriesId, seriesId),
        not(eq(bills.id, excludeBillId))
      ));
    
    console.log(`Updated all bills in series ${seriesId} (excluding ${excludeBillId})`);
  }

  async deleteBill(id: string): Promise<void> {
    // First delete all reminders associated with this bill
    await db.delete(reminders).where(eq(reminders.billId, id));
    // Then delete the bill
    await db.delete(bills).where(eq(bills.id, id));
  }

  async deleteBillsByCompany(companyName: string, userId: string): Promise<number> {
    // First, get all bills from this company for this user
    const billsToDelete = await db
      .select({ id: bills.id })
      .from(bills)
      .where(and(
        eq(bills.company, companyName),
        eq(bills.userId, userId)
      ));

    if (billsToDelete.length === 0) {
      return 0;
    }

    const billIds = billsToDelete.map(bill => bill.id);

    // Delete all reminders for these bills
    await db.delete(reminders).where(
      or(...billIds.map(id => eq(reminders.billId, id)))
    );

    // Delete all the bills
    const result = await db.delete(bills).where(
      and(
        eq(bills.company, companyName),
        eq(bills.userId, userId)
      )
    );

    return billsToDelete.length;
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder || undefined;
  }

  async getRemindersByBill(billId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.billId, billId))
      .orderBy(asc(reminders.reminderDate));
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const now = new Date();
    return await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.sent, false),
          lte(reminders.reminderDate, now),
          or(
            isNull(reminders.snoozedUntil),
            lte(reminders.snoozedUntil, now)
          )
        )
      )
      .orderBy(asc(reminders.reminderDate));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const reminderData = {
      ...reminder,
      reminderType: reminder.reminderType as "two_weeks" | "one_week" | "three_days" | "one_day" | "same_day"
    };
    const [newReminder] = await db
      .insert(reminders)
      .values([reminderData])
      .returning();
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    const [updatedReminder] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return updatedReminder;
  }

  async deleteReminder(id: string): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  async getBillStats(userId: string, month?: number, year?: number): Promise<{
    thisMonth: number;
    upcoming: number;
    upcomingCount: number;
    overdue: number;
    paid: number;
    total: number;
    paidThisMonth: number;
    remainingThisMonth: number;
    nextDueDate: string | null;
    nextDueBill: string | null;
    // Cumulative totals through selected month
    cumulativeTotal: number;
    cumulativePaid: number;
    cumulativeUnpaid: number;
    // True all-time totals (never change)
    allTimeTotal: number;
    allTimePaid: number;
    allTimeUnpaid: number;
  }> {
    const statsNow = new Date();
    
    // Use provided month/year or current month/year
    const targetYear = year || statsNow.getFullYear();
    const targetMonth = month ? month - 1 : statsNow.getMonth(); // month parameter is 1-indexed, Date constructor is 0-indexed
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    // First, update bill statuses based on current date
    await db
      .update(bills)
      .set({ status: "overdue" })
      .where(
        and(
          eq(bills.userId, userId),
          ne(bills.status, "paid"),
          lte(bills.dueDate, statsNow)
        )
      );

    const userBills = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, userId));

    // This month bills (both paid and unpaid)
    const thisMonthBills = userBills.filter(bill => 
      bill.dueDate >= startOfMonth && bill.dueDate <= endOfMonth
    );

    const paidThisMonthBills = thisMonthBills.filter(bill => bill.status === 'paid');
    const unpaidThisMonthBills = thisMonthBills.filter(bill => bill.status !== 'paid');

    const thisMonth = thisMonthBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );

    const paidThisMonth = paidThisMonthBills.reduce((sum, bill) => 
      sum + parseFloat((bill.paidAmount || bill.amount).toString()), 0
    );

    const remainingThisMonth = unpaidThisMonthBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );

    // Calculate real-time status based on due dates
    const overdueBills = userBills.filter(bill => 
      bill.status !== 'paid' && bill.dueDate < statsNow
    );
    // Upcoming bills are due within the next 4 days (0-4 days from now)
    const fourDaysFromNow = new Date(statsNow.getTime() + (4 * 24 * 60 * 60 * 1000));
    const upcomingBills = userBills.filter(bill => 
      bill.status !== 'paid' && 
      bill.dueDate >= statsNow && 
      bill.dueDate <= fourDaysFromNow
    );
    
    const upcoming = upcomingBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );
    const upcomingCount = upcomingBills.length;
    const overdue = overdueBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );
    const paid = userBills.filter(bill => bill.status === 'paid').reduce((sum, bill) => 
      sum + parseFloat((bill.paidAmount || bill.amount).toString()), 0
    );
    const total = userBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );

    // Find next due bill
    const sortedUpcomingBills = userBills
      .filter(bill => bill.status !== 'paid' && bill.dueDate > statsNow)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const nextDueBill = sortedUpcomingBills.length > 0 ? sortedUpcomingBills[0] : null;
    const nextDueDate = nextDueBill ? nextDueBill.dueDate.toISOString().split('T')[0] : null;
    const nextDueBillName = nextDueBill ? nextDueBill.company : null;

    // Calculate TRUE all-time totals (never change regardless of month selection)
    const allTimeBills = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, userId));
    
    const allTimeTotal = allTimeBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );
    const allTimePaid = allTimeBills.filter(bill => bill.status === 'paid').reduce((sum, bill) => 
      sum + parseFloat((bill.paidAmount || bill.amount).toString()), 0
    );
    const allTimeUnpaid = allTimeTotal - allTimePaid;

    // Calculate cumulative totals through the selected month
    const endOfSelectedMonth = new Date(targetYear, targetMonth + 1, 0);
    const cumulativeBills = allTimeBills.filter(bill => 
      bill.dueDate <= endOfSelectedMonth
    );
    
    const cumulativeTotal = cumulativeBills.reduce((sum, bill) => 
      sum + parseFloat(bill.amount.toString()), 0
    );
    const cumulativePaid = cumulativeBills.filter(bill => bill.status === 'paid').reduce((sum, bill) => 
      sum + parseFloat((bill.paidAmount || bill.amount).toString()), 0
    );
    const cumulativeUnpaid = cumulativeTotal - cumulativePaid;

    return { 
      thisMonth, 
      upcoming, 
      upcomingCount,
      overdue, 
      paid,
      total,
      paidThisMonth,
      remainingThisMonth,
      nextDueDate,
      nextDueBill: nextDueBillName,
      // Cumulative totals through selected month
      cumulativeTotal,
      cumulativePaid,
      cumulativeUnpaid,
      // True all-time totals (never change)
      allTimeTotal,
      allTimePaid,
      allTimeUnpaid
    };
  }

  async getBillsBySeries(seriesId: string): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(eq(bills.seriesId, seriesId))
      .orderBy(asc(bills.installmentNumber));
  }

  async createBillSeries(billsData: Array<InsertBill & { userId: string }>): Promise<Bill[]> {
    const billsWithStatus = billsData.map(bill => ({
      ...bill,
      status: (bill.status as "upcoming" | "due_soon" | "overdue" | "paid") || "upcoming",
      recurringType: bill.recurringType as "payment_plan" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannually" | "yearly" | "custom" | null,
      paymentType: bill.paymentType ? (bill.paymentType as "manual" | "automatic" | "real_payment" | "billcom_complete" | "billcom_partial" | "billcom_invoice") : null,
      creditorPaymentMethod: bill.creditorPaymentMethod ? (bill.creditorPaymentMethod as "ach" | "check" | "wire") : null,
      creditorPaymentAddress: bill.creditorPaymentAddress ? {
        name: typeof bill.creditorPaymentAddress.name === 'string' ? bill.creditorPaymentAddress.name : undefined,
        address1: typeof bill.creditorPaymentAddress.address1 === 'string' ? bill.creditorPaymentAddress.address1 : undefined,
        address2: typeof bill.creditorPaymentAddress.address2 === 'string' ? bill.creditorPaymentAddress.address2 : undefined,
        city: typeof bill.creditorPaymentAddress.city === 'string' ? bill.creditorPaymentAddress.city : undefined,
        state: typeof bill.creditorPaymentAddress.state === 'string' ? bill.creditorPaymentAddress.state : undefined,
        zip: typeof bill.creditorPaymentAddress.zip === 'string' ? bill.creditorPaymentAddress.zip : undefined,
        country: typeof bill.creditorPaymentAddress.country === 'string' ? bill.creditorPaymentAddress.country : undefined
      } : null,
      extractedData: bill.extractedData ? {
        originalText: typeof bill.extractedData.originalText === 'string' ? bill.extractedData.originalText : undefined,
        confidence: typeof bill.extractedData.confidence === 'number' ? bill.extractedData.confidence : undefined,
        extractedFields: bill.extractedData.extractedFields || undefined
      } : null
    }));
    
    const newBills = await db
      .insert(bills)
      .values(billsWithStatus)
      .returning();
    return newBills;
  }

  // Generate future recurring bills
  async generateRecurringBills(baseBill: Bill): Promise<void> {
    if (!baseBill.isRecurring || !baseBill.recurringType || baseBill.recurringType === "payment_plan") {
      return;
    }

    // Check if recurring bills already exist for this base bill to prevent duplicates
    const existingRecurringBills = await db
      .select({ id: bills.id })
      .from(bills)
      .where(eq(bills.seriesId, baseBill.id))
      .limit(1);

    if (existingRecurringBills.length > 0) {
      console.log(`Recurring bills already exist for bill ${baseBill.id}, skipping generation`);
      return;
    }

    const futureInstances: Array<InsertBill & { userId: string }> = [];
    const baseDueDate = new Date(baseBill.dueDate);
    
    // Use totalInstallments if set, otherwise default to 12
    const maxInstances = baseBill.totalInstallments || 12;
    
    console.log(`generateRecurringBills: baseDueDate=${baseDueDate.toISOString()}, maxInstances=${maxInstances}, recurringType=${baseBill.recurringType}`);

    // Helper to safely add months while handling end-of-month edge cases
    // E.g., Jan 31 + 1 month = Feb 28 (not March 2/3)
    const addMonthsSafe = (date: Date, months: number): Date => {
      const result = new Date(date);
      const originalDay = result.getDate();
      result.setMonth(result.getMonth() + months);
      
      // If the day changed (e.g., 31 became 2/3 due to overflow), 
      // go back to the last day of the intended month
      if (result.getDate() !== originalDay) {
        result.setDate(0); // Sets to last day of previous month
      }
      return result;
    };

    for (let i = 1; i < maxInstances; i++) {
      let nextDueDate = new Date(baseDueDate);

      switch (baseBill.recurringType) {
        case "weekly":
          nextDueDate.setDate(nextDueDate.getDate() + (7 * i));
          break;
        case "biweekly":
          nextDueDate.setDate(nextDueDate.getDate() + (14 * i));
          break;
        case "monthly":
          nextDueDate = addMonthsSafe(baseDueDate, i);
          break;
        case "quarterly":
          nextDueDate = addMonthsSafe(baseDueDate, 3 * i);
          break;
        case "biannually":
          nextDueDate = addMonthsSafe(baseDueDate, 6 * i);
          break;
        case "yearly":
          nextDueDate = addMonthsSafe(baseDueDate, 12 * i);
          break;
        default:
          continue; // Skip unknown types
      }

      // Only generate bills for future dates
      console.log(`  Loop i=${i}: nextDueDate=${nextDueDate.toISOString()}, isFuture=${nextDueDate > new Date()}`);
      if (nextDueDate > new Date()) {
        futureInstances.push({
          userId: baseBill.userId,
          company: baseBill.company,
          accountNumber: baseBill.accountNumber,
          amount: baseBill.amount,
          minimumPayment: baseBill.minimumPayment,
          dueDate: nextDueDate,
          category: baseBill.category,
          description: baseBill.description,
          isRecurring: true,
          recurringType: baseBill.recurringType,
          seriesId: baseBill.id, // Link to original bill
          creditorPaymentAddress: baseBill.creditorPaymentAddress,
          creditorPaymentMethod: baseBill.creditorPaymentMethod,
          creditorRoutingNumber: baseBill.creditorRoutingNumber,
          creditorAccountNumber: baseBill.creditorAccountNumber,
        });
      }
    }

    console.log(`generateRecurringBills: Created ${futureInstances.length} future instances`);
    if (futureInstances.length > 0) {
      await this.createBillSeries(futureInstances);
      console.log(`generateRecurringBills: Successfully saved ${futureInstances.length} bills to database`);
    }
  }

  // Export methods for external API integration
  async getAllBillsForExport(filters?: {
    userId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Bill[]> {
    let whereConditions: any[] = [];
    
    // Add filters if provided
    if (filters?.userId) {
      whereConditions.push(eq(bills.userId, filters.userId));
    }
    
    if (filters?.status) {
      whereConditions.push(eq(bills.status, filters.status as any));
    }
    
    if (filters?.startDate) {
      whereConditions.push(gte(bills.dueDate, filters.startDate));
    }
    
    if (filters?.endDate) {
      whereConditions.push(lte(bills.dueDate, filters.endDate));
    }
    
    // Build query directly without reassignment
    if (whereConditions.length > 0) {
      if (filters?.limit && filters?.offset) {
        return await db.select().from(bills)
          .where(and(...whereConditions))
          .orderBy(desc(bills.createdAt))
          .limit(filters.limit)
          .offset(filters.offset);
      } else if (filters?.limit) {
        return await db.select().from(bills)
          .where(and(...whereConditions))
          .orderBy(desc(bills.createdAt))
          .limit(filters.limit);
      } else if (filters?.offset) {
        return await db.select().from(bills)
          .where(and(...whereConditions))
          .orderBy(desc(bills.createdAt))
          .offset(filters.offset);
      } else {
        return await db.select().from(bills)
          .where(and(...whereConditions))
          .orderBy(desc(bills.createdAt));
      }
    } else {
      if (filters?.limit && filters?.offset) {
        return await db.select().from(bills)
          .orderBy(desc(bills.createdAt))
          .limit(filters.limit)
          .offset(filters.offset);
      } else if (filters?.limit) {
        return await db.select().from(bills)
          .orderBy(desc(bills.createdAt))
          .limit(filters.limit);
      } else if (filters?.offset) {
        return await db.select().from(bills)
          .orderBy(desc(bills.createdAt))
          .offset(filters.offset);
      } else {
        return await db.select().from(bills)
          .orderBy(desc(bills.createdAt));
      }
    }
  }

  // Conversation methods
  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(20); // Get last 20 conversations
    return result;
  }

  async createConversation(userId: string, conversation: InsertConversation): Promise<Conversation> {
    const messageType = (conversation.messageType || "general") as "general" | "bill_add" | "bill_query" | "bill_update" | "financial_insight" | "reminder_request";
    
    const conversationData = {
      userId,
      userMessage: conversation.userMessage,
      aiResponse: conversation.aiResponse,
      messageType,
      actionTaken: conversation.actionTaken as any,
    };
    
    const [result] = await db
      .insert(conversations)
      .values([conversationData])
      .returning();
    return result;
  }

  async clearConversationsByUser(userId: string): Promise<void> {
    await db
      .delete(conversations)
      .where(eq(conversations.userId, userId));
  }

  // Payment methods
  async createPayment(payment: InsertBillPayment & { billId: string }): Promise<BillPayment> {
    // Validate that the bill exists and belongs to a user (security check)
    const [bill] = await db.select({ userId: bills.userId }).from(bills).where(eq(bills.id, payment.billId));
    if (!bill) {
      throw new Error("Bill not found");
    }

    const paymentData = {
      ...payment,
      paymentType: payment.paymentType as "manual" | "automatic" | "real_payment" | "billcom_complete" | "billcom_partial" | "billcom_invoice",
      status: payment.status as "pending" | "processing" | "succeeded" | "failed" | "cancelled",
      amount: typeof payment.amount === 'string' ? payment.amount : String(payment.amount || 0),
    };

    const [newPayment] = await db
      .insert(billPayments)
      .values([paymentData])
      .returning();
    return newPayment;
  }

  async getPayment(paymentId: string): Promise<BillPayment | undefined> {
    const [payment] = await db.select().from(billPayments).where(eq(billPayments.id, paymentId));
    return payment || undefined;
  }

  async getPaymentsByBill(billId: string): Promise<BillPayment[]> {
    // Validate that the bill exists (security check)
    const [bill] = await db.select({ id: bills.id }).from(bills).where(eq(bills.id, billId));
    if (!bill) {
      throw new Error("Bill not found");
    }

    return await db
      .select()
      .from(billPayments)
      .where(eq(billPayments.billId, billId))
      .orderBy(desc(billPayments.createdAt));
  }

  async updatePayment(paymentId: string, updates: UpdateBillPayment): Promise<BillPayment> {
    const updateData: any = { 
      ...updates, 
      updatedAt: new Date(),
    };
    
    if (updates.paymentType) {
      updateData.paymentType = updates.paymentType as "manual" | "automatic" | "real_payment" | "billcom_complete" | "billcom_partial" | "billcom_invoice";
    }
    
    if (updates.status) {
      updateData.status = updates.status as "pending" | "processing" | "succeeded" | "failed" | "cancelled";
    }

    if (updates.amount) {
      updateData.amount = typeof updates.amount === 'string' ? updates.amount : String(updates.amount);
    }

    const [updatedPayment] = await db
      .update(billPayments)
      .set(updateData)
      .where(eq(billPayments.id, paymentId))
      .returning();
    
    if (!updatedPayment) {
      throw new Error("Payment not found");
    }
    
    return updatedPayment;
  }

  async calculateBillBalance(billId: string): Promise<{ totalAmount: number, paidAmount: number, remainingBalance: number }> {
    // Get the bill to get total amount
    const [bill] = await db.select().from(bills).where(eq(bills.id, billId));
    if (!bill) {
      throw new Error("Bill not found");
    }

    const totalAmount = parseFloat(bill.amount.toString());

    // Sum all successful payments for this bill
    const payments = await db
      .select()
      .from(billPayments)
      .where(
        and(
          eq(billPayments.billId, billId),
          eq(billPayments.status, "succeeded")
        )
      );

    const paidAmount = payments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount.toString()), 0
    );

    const remainingBalance = Math.max(0, totalAmount - paidAmount);

    return {
      totalAmount,
      paidAmount,
      remainingBalance
    };
  }

  async getBillWithPayments(billId: string): Promise<(Bill & { payments: BillPayment[] }) | null> {
    // Get the bill
    const [bill] = await db.select().from(bills).where(eq(bills.id, billId));
    if (!bill) {
      return null;
    }

    // Get all payments for this bill
    const payments = await db
      .select()
      .from(billPayments)
      .where(eq(billPayments.billId, billId))
      .orderBy(desc(billPayments.createdAt));

    return {
      ...bill,
      payments
    };
  }

  async updateUserCustomCategories(userId: string, categories: string[]): Promise<void> {
    await db
      .update(users)
      .set({ customCategories: categories, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAccountsByUser(userId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.name));
  }

  async createAccount(userId: string, data: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values({ ...data, userId }).returning();
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }
}

export const storage = new DatabaseStorage();
