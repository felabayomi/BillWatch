import { randomUUID } from "crypto";
import { eq, and, gte, lte, lt, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { type IStorage } from "./storage";
import { 
  type Account, 
  type InsertAccount,
  type Category,
  type InsertCategory,
  type Bill,
  type InsertBill,
  type Transaction,
  type InsertTransaction,
  type DailyBalance,
  type InsertDailyBalance,
  type AccountWithBalance,
  type TransactionWithDetails,
  type DailySummary,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type AccountantLink,
  accounts,
  categories,
  bills,
  transactions,
  dailyBalances,
  businesses,
  users,
  accountantLinks,
  inferCategory
} from "../shared/schema";

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id!);
    
    if (existingUser) {
      const [updatedUser] = await db
        .update(users)
        .set({
          email: userData.email || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return updatedUser;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          id: userData.id!,
          email: userData.email || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
        })
        .returning();
      return newUser;
    }
  }

  // Accounts
  async getAccounts(userId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccountsWithBalance(userId: string, date?: string): Promise<AccountWithBalance[]> {
    const allAccounts = await this.getAccounts(userId);
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateString = previousDate.toISOString().split('T')[0];
    
    const accountsWithBalance: AccountWithBalance[] = [];
    
    for (const account of allAccounts) {
      let previousDailyBalance = await this.getDailyBalance(userId, account.id, previousDateString);
      if (!previousDailyBalance) {
        previousDailyBalance = await this.computeDailyBalance(userId, account.id, previousDateString);
      }
      
      const dailyBalance = await this.computeDailyBalance(userId, account.id, targetDate);
      
      const currentBalanceCents = dailyBalance.closingCents;
      const previousBalanceCents = previousDailyBalance.closingCents;
      const dailyChange = currentBalanceCents - previousBalanceCents;
      
      accountsWithBalance.push({
        ...account,
        currentBalanceCents,
        dailyChange,
      });
    }
    
    return accountsWithBalance;
  }

  async getAccount(userId: string, id: string): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId))).limit(1);
    return result[0];
  }

  async createAccount(userId: string, account: InsertAccount): Promise<Account> {
    // Use inferCategory if no category is provided
    const category = account.category || inferCategory({
      type: account.type,
      name: account.name,
      owner: account.owner,
      institution: account.institution || undefined
    });
    
    const accountData = {
      ...account,
      userId,
      category,
      institution: account.institution || null,
    };
    
    const [newAccount] = await db.insert(accounts).values(accountData).returning();
    return newAccount;
  }

  async updateAccount(userId: string, id: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    // If opening balance changed, clear all daily balances for this account to force recalculation
    if (account.openingBalanceCents !== undefined) {
      await db.delete(dailyBalances).where(eq(dailyBalances.accountId, id));
    }
    
    const [updated] = await db
      .update(accounts)
      .set(account)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAccount(userId: string, id: string): Promise<boolean> {
    try {
      // First delete related records to avoid foreign key constraints
      
      // Delete daily balances for this account
      await db.delete(dailyBalances).where(and(eq(dailyBalances.accountId, id), eq(dailyBalances.userId, userId)));
      
      // Delete transactions for this account
      await db.delete(transactions).where(and(eq(transactions.accountId, id), eq(transactions.userId, userId)));
      
      // Delete bills for this account
      await db.delete(bills).where(and(eq(bills.accountId, id), eq(bills.userId, userId)));
      
      // Finally delete the account
      const result = await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  async migrateAccountCategories(): Promise<{ updated: number; accounts: Account[] }> {
    // Note: This method should ideally take userId, but for migration purposes we'll get all accounts
    // In a real scenario, this would need to be called per user
    throw new Error('migrateAccountCategories not implemented for database storage - requires userId parameter');
  }

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.userId, userId));
  }

  async getCategory(userId: string, id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).limit(1);
    return result[0];
  }

  async getCategoryByName(userId: string, name: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(and(eq(categories.name, name), eq(categories.userId, userId))).limit(1);
    return result[0];
  }

  async createCategory(userId: string, category: InsertCategory): Promise<Category> {
    // Check if category already exists for this user
    const existing = await this.getCategoryByName(userId, category.name);
    if (existing) {
      return existing;
    }
    
    const [newCategory] = await db.insert(categories).values({...category, userId}).returning();
    return newCategory;
  }

  async updateCategory(userId: string, id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set(category)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCategory(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Bills
  async getBills(userId: string): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.userId, userId));
  }

  async getBill(userId: string, id: string): Promise<Bill | undefined> {
    const result = await db.select().from(bills).where(and(eq(bills.id, id), eq(bills.userId, userId))).limit(1);
    return result[0];
  }

  async createBill(userId: string, bill: InsertBill): Promise<Bill> {
    const [newBill] = await db.insert(bills).values({...bill, userId}).returning();
    return newBill;
  }

  async updateBill(userId: string, id: string, bill: Partial<InsertBill>): Promise<Bill | undefined> {
    const [updated] = await db
      .update(bills)
      .set(bill)
      .where(and(eq(bills.id, id), eq(bills.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBill(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(bills).where(and(eq(bills.id, id), eq(bills.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Transactions
  async getTransactions(userId: string, date?: string, accountId?: string): Promise<TransactionWithDetails[]> {
    const conditions = [eq(transactions.userId, userId)];
    if (date) {
      conditions.push(eq(transactions.txDate, date));
    }
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }

    try {
      const results = await db
        .select({
          transaction: transactions,
          accountName: accounts.name,
          accountType: accounts.type,
          categoryName: categories.name,
          categoryKind: categories.kind,
          billName: bills.name,
          businessName: businesses.name,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(bills, eq(transactions.billId, bills.id))
        .leftJoin(businesses, eq(transactions.businessId, businesses.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.txDate), desc(transactions.createdAt));

      return results.map(result => ({
        ...result.transaction,
        accountName: result.accountName || 'Unknown Account',
        accountType: result.accountType || 'checking',
        categoryName: result.categoryName || 'Uncategorized',
        categoryKind: result.categoryKind || 'other',
        billName: result.billName || undefined,
        businessName: result.businessName || undefined,
      }));
    } catch (e) {
      console.error("getTransactions primary query failed, using raw SQL fallback:", e);
      let whereClause = `t.user_id = '${userId}'`;
      if (date) whereClause += ` AND t.tx_date = '${date}'`;
      if (accountId) whereClause += ` AND t.account_id = '${accountId}'`;
      
      const rawResult = await db.execute(sql`
        SELECT t.*, a.name as account_name, a.type as account_type, c.name as category_name, c.kind as category_kind, b.name as bill_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN bills b ON t.bill_id = b.id
        WHERE ${sql.raw(whereClause)}
        ORDER BY t.tx_date DESC
      `);

      return (rawResult.rows as any[]).map(row => ({
        id: row.id,
        txDate: row.tx_date,
        accountId: row.account_id,
        amountCents: Number(row.amount_cents),
        categoryId: row.category_id,
        description: row.description,
        billId: row.bill_id || null,
        transferId: row.transfer_id || null,
        createdAt: row.created_at,
        userId: row.user_id,
        refundOfId: row.refund_of_id || null,
        isSystemGenerated: row.is_system_generated || false,
        isBusinessExpense: row.is_business_expense || false,
        isPersonal: row.is_personal || false,
        businessId: row.business_id || null,
        taxOnly: row.tax_only || false,
        receiptPath: row.receipt_path || null,
        accountName: row.account_name || 'Unknown Account',
        accountType: row.account_type || 'checking',
        categoryName: row.category_name || 'Uncategorized',
        categoryKind: row.category_kind || 'other',
        billName: row.bill_name || undefined,
        businessName: undefined,
      }));
    }
  }

  async getTransaction(userId: string, id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).limit(1);
    return result[0];
  }

  async getTransactionByExternalSourceId(userId: string, externalSourceId: string): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.externalSourceId, externalSourceId)))
      .limit(1);
    return tx;
  }

  async createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values({...transaction, userId}).returning();
    
    if (transaction.accountId) {
      await this.invalidateAccountBalancesFromDate(userId, transaction.accountId, transaction.txDate);
    }
    
    return newTransaction;
  }


  private async invalidateAccountBalancesFromDate(userId: string, accountId: string, fromDate: string): Promise<void> {
    // Delete all cached balance entries for this account from the specified date forward
    await db
      .delete(dailyBalances)
      .where(
        and(
          eq(dailyBalances.userId, userId),
          eq(dailyBalances.accountId, accountId),
          gte(dailyBalances.balDate, fromDate)
        )
      );
  }

  async updateTransaction(userId: string, id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existingTransaction = await this.getTransaction(userId, id);
    if (!existingTransaction) return undefined;

    const [updatedTransaction] = await db
      .update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    if (existingTransaction.accountId) {
      await this.invalidateAccountBalancesFromDate(userId, existingTransaction.accountId, existingTransaction.txDate);
    }
    if (updates.accountId && updates.accountId !== existingTransaction.accountId) {
      await this.invalidateAccountBalancesFromDate(userId, updates.accountId, updates.txDate || existingTransaction.txDate);
    }
    if (updates.txDate && updates.txDate !== existingTransaction.txDate && updatedTransaction.accountId) {
      const earlierDate = updates.txDate < existingTransaction.txDate ? updates.txDate : existingTransaction.txDate;
      await this.invalidateAccountBalancesFromDate(userId, updatedTransaction.accountId, earlierDate);
    }

    return updatedTransaction;
  }

  async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const transaction = await this.getTransaction(userId, id);
    if (!transaction) return false;

    const result = await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    
    if (transaction.accountId) {
      await this.invalidateAccountBalancesFromDate(userId, transaction.accountId, transaction.txDate);
    }

    return (result.rowCount ?? 0) > 0;
  }

  async createTransfer(userId: string, transfer: { fromAccountId: string; toAccountId: string; amountCents: number; txDate: string; description: string }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const { fromAccountId, toAccountId, amountCents, txDate, description } = transfer;
    
    // Validate accounts exist
    const fromAccount = await this.getAccount(userId, fromAccountId);
    const toAccount = await this.getAccount(userId, toAccountId);
    
    if (!fromAccount || !toAccount) {
      throw new Error("One or both accounts not found");
    }
    
    if (fromAccountId === toAccountId) {
      throw new Error("Cannot transfer to the same account");
    }
    
    if (amountCents <= 0) {
      throw new Error("Transfer amount must be positive");
    }
    
    // Get "Internal Move" category
    const transferCategory = await this.getCategoryByName(userId, "Internal Move");
    if (!transferCategory) {
      throw new Error("Transfer category not found. Please initialize default categories.");
    }
    
    // Use database transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Generate unique transfer ID to link the two transactions
      const transferId = randomUUID();
      
      // Create FROM transaction (negative amount - money leaving)
      const [fromTransaction] = await tx.insert(transactions).values({
        accountId: fromAccountId,
        amountCents: -amountCents, // Negative for money leaving
        txDate,
        description: `Transfer to ${toAccount.name}: ${description}`,
        categoryId: transferCategory.id,
        transferId,
        userId,
      }).returning();
      
      // Create TO transaction (positive amount - money arriving)
      const [toTransaction] = await tx.insert(transactions).values({
        accountId: toAccountId,
        amountCents: amountCents, // Positive for money arriving
        txDate,
        description: `Transfer from ${fromAccount.name}: ${description}`,
        categoryId: transferCategory.id,
        transferId,
        userId,
      }).returning();
      
      return { fromTransaction, toTransaction };
    }).then(async (result) => {
      // Invalidate cached balances after successful database transaction
      await this.invalidateAccountBalancesFromDate(userId, fromAccountId, txDate);
      await this.invalidateAccountBalancesFromDate(userId, toAccountId, txDate);
      return result;
    });
  }

  async createCreditCardPayment(userId: string, payment: { fromAccountId: string; creditCardAccountId: string; amountCents: number; txDate: string; description: string; categoryId: string; isBusinessExpense?: boolean; businessId?: string }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const { fromAccountId, creditCardAccountId, amountCents, txDate, description, categoryId, isBusinessExpense, businessId } = payment;
    
    // Validate accounts exist
    const fromAccount = await this.getAccount(userId, fromAccountId);
    const creditCardAccount = await this.getAccount(userId, creditCardAccountId);
    
    if (!fromAccount || !creditCardAccount) {
      throw new Error("One or both accounts not found");
    }
    
    if (fromAccountId === creditCardAccountId) {
      throw new Error("Cannot pay credit card from itself");
    }
    
    if (creditCardAccount.type !== 'credit') {
      throw new Error("Target account must be a credit card account");
    }
    
    if (amountCents <= 0) {
      throw new Error("Payment amount must be positive");
    }
    
    // Use database transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Generate unique transfer ID to link the two transactions
      const transferId = randomUUID();
      
      const fromValues: any = {
        accountId: fromAccountId,
        amountCents: -amountCents,
        txDate,
        description: `Credit card payment to ${creditCardAccount.name}: ${description}`,
        categoryId,
        transferId,
        userId,
        isBusinessExpense: isBusinessExpense || false,
      };
      if (businessId) fromValues.businessId = businessId;

      const [fromTransaction] = await tx.insert(transactions).values(fromValues).returning();
      
      const toValues: any = {
        accountId: creditCardAccountId,
        amountCents: -amountCents,
        txDate,
        description: `Payment from ${fromAccount.name}: ${description}`,
        categoryId,
        transferId,
        userId,
        isBusinessExpense: isBusinessExpense || false,
      };
      if (businessId) toValues.businessId = businessId;

      const [toTransaction] = await tx.insert(transactions).values(toValues).returning();
      
      return { fromTransaction, toTransaction };
    }).then(async (result) => {
      // Invalidate cached balances after successful database transaction
      await this.invalidateAccountBalancesFromDate(userId, fromAccountId, txDate);
      await this.invalidateAccountBalancesFromDate(userId, creditCardAccountId, txDate);
      return result;
    });
  }

  // Daily Balances
  async getDailyBalance(userId: string, accountId: string, date: string): Promise<DailyBalance | undefined> {
    const result = await db
      .select()
      .from(dailyBalances)
      .where(
        and(
          eq(dailyBalances.accountId, accountId),
          eq(dailyBalances.balDate, date),
          eq(dailyBalances.userId, userId)
        )
      )
      .limit(1);
    return result[0];
  }

  /**
   * Find the most recent cached daily balance before the target date for an account.
   * This is used to get the correct opening balance when computing a new daily balance.
   */
  private async getAllTransactionsUpToDate(userId: string, accountId: string, upToDate: string): Promise<TransactionWithDetails[]> {
    try {
      const results = await db
        .select({
          transaction: transactions,
          accountName: accounts.name,
          accountType: accounts.type,
          categoryName: categories.name,
          categoryKind: categories.kind,
          billName: bills.name,
          businessName: businesses.name,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(bills, eq(transactions.billId, bills.id))
        .leftJoin(businesses, eq(transactions.businessId, businesses.id))
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId),
          lte(transactions.txDate, upToDate)
        ))
        .orderBy(transactions.txDate);

      return results.map(result => ({
        ...result.transaction,
        accountName: result.accountName || 'Unknown Account',
        accountType: result.accountType || 'checking',
        categoryName: result.categoryName || 'Uncategorized',
        categoryKind: result.categoryKind || 'other',
        billName: result.billName || undefined,
        businessName: result.businessName || undefined,
      }));
    } catch (e) {
      console.error("getAllTransactionsUpToDate primary query failed, using raw SQL fallback:", e);
      const rawResult = await db.execute(sql`
        SELECT t.*, a.name as account_name, a.type as account_type, c.name as category_name, c.kind as category_kind
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.account_id = ${accountId} AND t.tx_date <= ${upToDate}
        ORDER BY t.tx_date ASC
      `);

      return (rawResult.rows as any[]).map(row => ({
        id: row.id,
        txDate: row.tx_date,
        accountId: row.account_id,
        amountCents: Number(row.amount_cents),
        categoryId: row.category_id,
        description: row.description,
        billId: row.bill_id || null,
        transferId: row.transfer_id || null,
        createdAt: row.created_at,
        userId: row.user_id,
        refundOfId: row.refund_of_id || null,
        isSystemGenerated: row.is_system_generated || false,
        isBusinessExpense: row.is_business_expense || false,
        businessId: row.business_id || null,
        taxOnly: row.tax_only || false,
        receiptPath: row.receipt_path || null,
        accountName: row.account_name || 'Unknown Account',
        accountType: row.account_type || 'checking',
        categoryName: row.category_name || 'Uncategorized',
        categoryKind: row.category_kind || 'other',
        billName: undefined,
        businessName: undefined,
      }));
    }
  }

  private async getMostRecentCachedBalance(userId: string, accountId: string, beforeDate: string): Promise<DailyBalance | undefined> {
    const result = await db
      .select()
      .from(dailyBalances)
      .where(
        and(
          eq(dailyBalances.userId, userId),
          eq(dailyBalances.accountId, accountId),
          lt(dailyBalances.balDate, beforeDate)
        )
      )
      .orderBy(desc(dailyBalances.balDate))
      .limit(1);
    return result[0];
  }

  async computeDailyBalance(userId: string, accountId: string, date: string): Promise<DailyBalance> {
    const account = await this.getAccount(userId, accountId);
    if (!account) throw new Error("Account not found");
    
    const mostRecentBalance = await this.getMostRecentCachedBalance(userId, accountId, date);
    
    let openingCents: number;
    let dayTransactions: TransactionWithDetails[];
    
    if (mostRecentBalance) {
      const cacheDate = mostRecentBalance.balDate;
      openingCents = mostRecentBalance.closingCents;

      // Fetch all transactions from after the cache date up through the requested date.
      // This ensures days that were never individually computed (e.g. account not viewed
      // for several days) don't get silently skipped.
      const allTxUpToDate = await this.getAllTransactionsUpToDate(userId, accountId, date);
      const txSinceCache = allTxUpToDate.filter(t => t.txDate > cacheDate && !t.taxOnly);

      // Transactions on intermediate days update the opening balance for today
      const intermediateTx = txSinceCache.filter(t => t.txDate < date);
      for (const t of intermediateTx) {
        openingCents += t.amountCents;
      }

      // Only today's transactions count as the day's activity
      dayTransactions = txSinceCache.filter(t => t.txDate === date);

      const taxOnlySkipped = allTxUpToDate.filter(t => t.txDate > cacheDate && t.taxOnly).length;
      console.log(`[BALANCE] Computing ${account.name} for ${date}: cached opening=${mostRecentBalance.closingCents} from ${cacheDate}, intermediateTxCount=${intermediateTx.length}, dayTxCount=${dayTransactions.length} (excluded ${taxOnlySkipped} tax-only)`);
    } else {
      openingCents = account.openingBalanceCents;
      const allTxUpToDate = await this.getAllTransactionsUpToDate(userId, accountId, date);
      const nonTaxTx = allTxUpToDate.filter(t => !t.taxOnly);
      const txOnDate = nonTaxTx.filter(t => t.txDate === date);
      const txBeforeDate = nonTaxTx.filter(t => t.txDate < date);
      
      let priorNet = 0;
      for (const t of txBeforeDate) {
        priorNet += t.amountCents;
      }
      openingCents = account.openingBalanceCents + priorNet;
      dayTransactions = txOnDate;
      console.log(`[BALANCE] Computing ${account.name} for ${date}: NO CACHE - accountOpening=${account.openingBalanceCents}, priorTxCount=${txBeforeDate.length}, priorNet=${priorNet}, computedOpening=${openingCents}, dayTxCount=${txOnDate.length}`);
    }
    
    let inflowCents = 0;
    let outflowCents = 0;
    let transferInCents = 0;
    let transferOutCents = 0;
    let adjustmentCents = 0;
    
    let netTransactionChange = 0;
    
    const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
    const isLiability = liabilityTypes.includes(account.type);
    
    for (const transaction of dayTransactions) {
      const amount = Math.abs(transaction.amountCents);
      
      if (transaction.transferId) {
        netTransactionChange += transaction.amountCents;
        
        if (transaction.amountCents > 0) {
          transferInCents += transaction.amountCents;
        } else {
          transferOutCents += Math.abs(transaction.amountCents);
        }
      } else if (transaction.categoryKind === 'adjustment') {
        netTransactionChange += transaction.amountCents;
        adjustmentCents += transaction.amountCents;
      } else {
        netTransactionChange += transaction.amountCents;
        if (transaction.amountCents > 0) {
          inflowCents += transaction.amountCents;
        } else {
          outflowCents += Math.abs(transaction.amountCents);
        }
      }
    }
    
    const closingCents = openingCents + netTransactionChange;
    console.log(`[BALANCE] Result ${account.name} ${date}: opening=${openingCents} + net=${netTransactionChange} = closing=${closingCents}`);
    
    const dailyBalance: InsertDailyBalance = {
      userId,
      balDate: date,
      accountId,
      openingCents,
      inflowCents,
      outflowCents,
      transferInCents,
      transferOutCents,
      adjustmentCents,
      closingCents,
    };
    
    // Save the computed balance to cache using upsert to handle duplicates
    const [savedBalance] = await db
      .insert(dailyBalances)
      .values(dailyBalance)
      .onConflictDoUpdate({
        target: [dailyBalances.userId, dailyBalances.accountId, dailyBalances.balDate],
        set: {
          openingCents: dailyBalance.openingCents,
          inflowCents: dailyBalance.inflowCents,
          outflowCents: dailyBalance.outflowCents,
          transferInCents: dailyBalance.transferInCents,
          transferOutCents: dailyBalance.transferOutCents,
          adjustmentCents: dailyBalance.adjustmentCents,
          closingCents: dailyBalance.closingCents,
        }
      })
      .returning();
    
    // Forward invalidation: clear cached balances for subsequent dates
    // This ensures that when an earlier balance is computed/updated, later days get recomputed with correct opening balance
    const nextDate = new Date(date + 'T00:00:00.000Z');
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateString = nextDate.toISOString().split('T')[0];
    await this.invalidateAccountBalancesFromDate(userId, accountId, nextDateString);
    
    return savedBalance;
  }

  async computeAllDailyBalances(userId: string, date: string): Promise<DailyBalance[]> {
    const allAccounts = await this.getAccounts(userId);
    const balances: DailyBalance[] = [];
    
    for (const account of allAccounts) {
      const balance = await this.computeDailyBalance(userId, account.id, date);
      balances.push(balance);
    }
    
    return balances;
  }

  async clearAllDailyBalances(userId: string): Promise<number> {
    const result = await db.delete(dailyBalances).where(eq(dailyBalances.userId, userId));
    const count = result.rowCount ?? 0;
    console.log(`[BALANCE] Cleared ${count} cached daily balances for user ${userId}`);
    return count;
  }

  async clearAccountDailyBalances(userId: string, accountId: string): Promise<number> {
    const result = await db.delete(dailyBalances).where(
      and(eq(dailyBalances.userId, userId), eq(dailyBalances.accountId, accountId))
    );
    const count = result.rowCount ?? 0;
    console.log(`[BALANCE] Cleared ${count} cached daily balances for account ${accountId}`);
    return count;
  }

  async getOrCreateAdjustmentCategory(userId: string): Promise<Category> {
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.kind, 'adjustment')))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [created] = await db
      .insert(categories)
      .values({ id: randomUUID(), userId, name: 'Balance Correction', kind: 'adjustment' })
      .returning();
    return created;
  }

  async getDailySummary(userId: string, date: string): Promise<DailySummary> {
    const balances = await this.computeAllDailyBalances(userId, date);
    
    const summary = balances.reduce(
      (acc, balance) => ({
        totalOpeningCents: acc.totalOpeningCents + balance.openingCents,
        totalInflowCents: acc.totalInflowCents + balance.inflowCents,
        totalOutflowCents: acc.totalOutflowCents + balance.outflowCents,
        totalTransferInCents: acc.totalTransferInCents + balance.transferInCents,
        totalTransferOutCents: acc.totalTransferOutCents + balance.transferOutCents,
        totalAdjustmentCents: acc.totalAdjustmentCents + balance.adjustmentCents,
        totalClosingCents: acc.totalClosingCents + balance.closingCents,
      }),
      {
        totalOpeningCents: 0,
        totalInflowCents: 0,
        totalOutflowCents: 0,
        totalTransferInCents: 0,
        totalTransferOutCents: 0,
        totalAdjustmentCents: 0,
        totalClosingCents: 0,
      }
    );
    
    // Calculate variance (should be 0 if everything is balanced)
    const expectedClosing = summary.totalOpeningCents + summary.totalInflowCents - summary.totalOutflowCents + summary.totalAdjustmentCents;
    const variance = summary.totalClosingCents - expectedClosing;
    
    return {
      date,
      ...summary,
      variance,
      isBalanced: Math.abs(variance) < 1, // Allow for rounding errors
    };
  }

  // Initialize default categories for a user
  async initializeDefaultCategories(userId: string): Promise<void> {
    const existingCategories = await this.getCategories(userId);
    if (existingCategories.length > 0) return;

    const defaultCategories = [
      { name: "Salary", kind: "income" },
      { name: "Side Gig", kind: "income" },
      { name: "Refunds", kind: "income" },
      { name: "Interest", kind: "income" },
      { name: "Groceries", kind: "expense" },
      { name: "Dining", kind: "expense" },
      { name: "Transport", kind: "expense" },
      { name: "Utilities", kind: "expense" },
      { name: "Subscriptions", kind: "expense" },
      { name: "Health", kind: "expense" },
      { name: "Shopping", kind: "expense" },
      { name: "Education", kind: "expense" },
      { name: "Fees", kind: "expense" },
      { name: "Rent", kind: "bill" },
      { name: "Phone", kind: "bill" },
      { name: "Internet", kind: "bill" },
      { name: "Insurance", kind: "bill" },
      { name: "Loan Payment", kind: "bill" },
      { name: "Credit Card Payment", kind: "debt" },
      { name: "Personal Loan", kind: "debt" },
      { name: "Buy", kind: "investment" },
      { name: "Sell", kind: "investment" },
      { name: "Transfer to Brokerage", kind: "investment" },
      { name: "Internal Move", kind: "transfer" },
      { name: "Opening Fix", kind: "adjustment" },
      { name: "Bank Correction", kind: "adjustment" },
    ];

    for (const cat of defaultCategories) {
      await this.createCategory(userId, cat as InsertCategory);
    }
  }

  // Cash Flow Management
  async getCashFlowEntry(userId: string, date: string) {
    try {
      const query = sql`SELECT * FROM cash_flow_entries WHERE user_id = ${userId} AND date = ${date} LIMIT 1`;
      const result = await db.execute(query);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting cash flow entry:", error);
      return null;
    }
  }

  async saveCashFlowEntry(userId: string, cashFlowData: any) {
    try {
      const upsertQuery = sql`
        INSERT INTO cash_flow_entries (user_id, date, total_income, total_expenses, total_bills_paid, net_cash_flow, updated_at)
        VALUES (${userId}, ${cashFlowData.date}, ${cashFlowData.totalIncome}, ${cashFlowData.totalExpenses}, ${cashFlowData.totalBillsPaid}, ${cashFlowData.netCashFlow}, now())
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
          total_income = EXCLUDED.total_income,
          total_expenses = EXCLUDED.total_expenses, 
          total_bills_paid = EXCLUDED.total_bills_paid,
          net_cash_flow = EXCLUDED.net_cash_flow,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      const result = await db.execute(upsertQuery);
      return result.rows[0];
    } catch (error) {
      console.error("Error saving cash flow entry:", error);
      throw error;
    }
  }

  async getMonthlyCashFlow(userId: string, month: string) {
    try {
      const query = sql`
        SELECT * FROM cash_flow_entries 
        WHERE user_id = ${userId} AND date >= ${month + '-01'} AND date < ${month + '-01'}::date + interval '1 month'
        ORDER BY date ASC
      `;
      const result = await db.execute(query);
      return result.rows;
    } catch (error) {
      console.error("Error getting monthly cash flow:", error);
      return [];
    }
  }

  async getYearlyCashFlow(userId: string, year: string) {
    try {
      const query = sql`
        SELECT * FROM cash_flow_entries 
        WHERE user_id = ${userId} AND date >= ${year + '-01-01'} AND date < ${year + '-01-01'}::date + interval '1 year'
        ORDER BY date ASC
      `;
      const result = await db.execute(query);
      return result.rows;
    } catch (error) {
      console.error("Error getting yearly cash flow:", error);
      return [];
    }
  }

  // Computed Cash Flow from Transactions
  async getComputedCashFlow(userId: string, date: string): Promise<any> {
    try {
      const query = sql`
        SELECT 
          ${date} as date,
          COALESCE(SUM(CASE WHEN t.amount_cents > 0 AND t.transfer_id IS NULL THEN t.amount_cents ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND t.transfer_id IS NULL AND (c.kind IS NULL OR c.kind NOT IN ('bill', 'debt')) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND c.kind IN ('bill', 'debt') AND (t.transfer_id IS NULL OR t.transfer_id IS NOT NULL) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_bills_paid,
          COALESCE(SUM(CASE WHEN t.transfer_id IS NULL OR (t.transfer_id IS NOT NULL AND t.amount_cents < 0 AND c.kind IN ('bill', 'debt')) THEN t.amount_cents ELSE 0 END), 0) as net_cash_flow,
          COUNT(CASE WHEN t.transfer_id IS NULL OR (t.transfer_id IS NOT NULL AND t.amount_cents < 0 AND c.kind IN ('bill', 'debt')) THEN 1 END) as transaction_count
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.tx_date = ${date}
      `;
      const result = await db.execute(query);
      const row = result.rows[0] as any;
      return {
        date,
        totalIncome: Number(row?.total_income || 0),
        totalExpenses: Number(row?.total_expenses || 0),
        totalBillsPaid: Number(row?.total_bills_paid || 0),
        netCashFlow: Number(row?.net_cash_flow || 0),
        transactionCount: Number(row?.transaction_count || 0),
      };
    } catch (error) {
      console.error("Error getting computed cash flow:", error);
      return null;
    }
  }

  async getComputedWeeklyCashFlow(userId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      const query = sql`
        SELECT 
          t.tx_date as date,
          COALESCE(SUM(CASE WHEN t.amount_cents > 0 AND t.transfer_id IS NULL THEN t.amount_cents ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND t.transfer_id IS NULL AND (c.kind IS NULL OR c.kind NOT IN ('bill', 'debt')) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND c.kind IN ('bill', 'debt') AND (t.transfer_id IS NULL OR t.transfer_id IS NOT NULL) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_bills_paid,
          COALESCE(SUM(CASE WHEN t.transfer_id IS NULL OR (t.transfer_id IS NOT NULL AND t.amount_cents < 0 AND c.kind IN ('bill', 'debt')) THEN t.amount_cents ELSE 0 END), 0) as net_cash_flow
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} 
          AND t.tx_date >= ${startDate}
          AND t.tx_date <= ${endDate}
        GROUP BY t.tx_date
        ORDER BY t.tx_date ASC
      `;
      const result = await db.execute(query);
      return (result.rows as any[]).map(row => ({
        date: row.date,
        totalIncome: Number(row.total_income || 0),
        totalExpenses: Number(row.total_expenses || 0),
        totalBillsPaid: Number(row.total_bills_paid || 0),
        netCashFlow: Number(row.net_cash_flow || 0),
      }));
    } catch (error) {
      console.error("Error getting computed weekly cash flow:", error);
      return [];
    }
  }

  async getComputedMonthlyCashFlow(userId: string, month: string): Promise<any[]> {
    try {
      const query = sql`
        SELECT 
          t.tx_date as date,
          COALESCE(SUM(CASE WHEN t.amount_cents > 0 AND t.transfer_id IS NULL THEN t.amount_cents ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND t.transfer_id IS NULL AND (c.kind IS NULL OR c.kind NOT IN ('bill', 'debt')) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND c.kind IN ('bill', 'debt') AND (t.transfer_id IS NULL OR t.transfer_id IS NOT NULL) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_bills_paid,
          COALESCE(SUM(CASE WHEN t.transfer_id IS NULL OR (t.transfer_id IS NOT NULL AND t.amount_cents < 0 AND c.kind IN ('bill', 'debt')) THEN t.amount_cents ELSE 0 END), 0) as net_cash_flow
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} 
          AND t.tx_date >= ${month + '-01'} 
          AND t.tx_date < (${month + '-01'}::date + interval '1 month')
        GROUP BY t.tx_date
        ORDER BY t.tx_date ASC
      `;
      const result = await db.execute(query);
      return (result.rows as any[]).map(row => ({
        date: row.date,
        totalIncome: Number(row.total_income || 0),
        totalExpenses: Number(row.total_expenses || 0),
        totalBillsPaid: Number(row.total_bills_paid || 0),
        netCashFlow: Number(row.net_cash_flow || 0),
      }));
    } catch (error) {
      console.error("Error getting computed monthly cash flow:", error);
      return [];
    }
  }

  async getComputedYearlyCashFlow(userId: string, year: string): Promise<any[]> {
    try {
      const query = sql`
        SELECT 
          t.tx_date as date,
          COALESCE(SUM(CASE WHEN t.amount_cents > 0 AND t.transfer_id IS NULL THEN t.amount_cents ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND t.transfer_id IS NULL AND (c.kind IS NULL OR c.kind NOT IN ('bill', 'debt')) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN t.amount_cents < 0 AND c.kind IN ('bill', 'debt') AND (t.transfer_id IS NULL OR t.transfer_id IS NOT NULL) THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_bills_paid,
          COALESCE(SUM(CASE WHEN t.transfer_id IS NULL OR (t.transfer_id IS NOT NULL AND t.amount_cents < 0 AND c.kind IN ('bill', 'debt')) THEN t.amount_cents ELSE 0 END), 0) as net_cash_flow
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} 
          AND t.tx_date >= ${year + '-01-01'} 
          AND t.tx_date < (${year + '-01-01'}::date + interval '1 year')
        GROUP BY t.tx_date
        ORDER BY t.tx_date ASC
      `;
      const result = await db.execute(query);
      return (result.rows as any[]).map(row => ({
        date: row.date,
        totalIncome: Number(row.total_income || 0),
        totalExpenses: Number(row.total_expenses || 0),
        totalBillsPaid: Number(row.total_bills_paid || 0),
        netCashFlow: Number(row.net_cash_flow || 0),
      }));
    } catch (error) {
      console.error("Error getting computed yearly cash flow:", error);
      return [];
    }
  }

  // Businesses
  async getBusinesses(userId: string): Promise<Business[]> {
    try {
      return await db.select().from(businesses).where(eq(businesses.userId, userId)).orderBy(businesses.name);
    } catch (e) {
      console.error("getBusinesses error (table may not exist yet):", e);
      return [];
    }
  }

  async getCashFlowTransactions(userId: string, startDate: string, endDate: string, type: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          t.id,
          t.tx_date,
          t.amount_cents,
          t.description,
          t.account_id,
          a.name as account_name,
          c.name as category_name,
          c.kind as category_kind
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ${userId}
          AND t.tx_date >= ${startDate}
          AND t.tx_date <= ${endDate}
          AND (
            (${type} = 'income' AND t.amount_cents > 0 AND t.transfer_id IS NULL)
            OR (${type} = 'expenses' AND t.amount_cents < 0 AND t.transfer_id IS NULL AND (c.kind IS NULL OR c.kind NOT IN ('bill', 'debt')))
            OR (${type} = 'bills' AND t.amount_cents < 0 AND c.kind IN ('bill', 'debt'))
          )
        ORDER BY t.tx_date DESC, ABS(t.amount_cents) DESC
      `);

      return (result.rows as any[]).map(row => ({
        id: row.id,
        txDate: row.tx_date,
        amountCents: Number(row.amount_cents),
        description: row.description,
        accountId: row.account_id,
        accountName: row.account_name,
        categoryName: row.category_name,
        categoryKind: row.category_kind,
      }));
    } catch (error) {
      console.error("Error getting cash flow transactions:", error);
      return [];
    }
  }

  async getBusiness(userId: string, id: string): Promise<Business | undefined> {
    try {
      const result = await db.select().from(businesses).where(and(eq(businesses.id, id), eq(businesses.userId, userId))).limit(1);
      return result[0];
    } catch (e) {
      console.error("getBusiness error (table may not exist yet):", e);
      return undefined;
    }
  }

  async createBusiness(userId: string, business: InsertBusiness): Promise<Business> {
    const [newBusiness] = await db.insert(businesses).values({ ...business, userId }).returning();
    return newBusiness;
  }

  async deleteBusiness(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(businesses).where(and(eq(businesses.id, id), eq(businesses.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async createAccountantLink(userId: string, label: string, filterType: string, filterYear: string): Promise<AccountantLink> {
    const [link] = await db.insert(accountantLinks).values({ userId, label, filterType, filterYear }).returning();
    return link;
  }

  async getAccountantLinks(userId: string): Promise<AccountantLink[]> {
    return db.select().from(accountantLinks).where(eq(accountantLinks.userId, userId)).orderBy(desc(accountantLinks.createdAt));
  }

  async deleteAccountantLink(userId: string, token: string): Promise<boolean> {
    const result = await db.delete(accountantLinks).where(and(eq(accountantLinks.token, token), eq(accountantLinks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getAccountantLinkByToken(token: string): Promise<AccountantLink | undefined> {
    const [link] = await db.select().from(accountantLinks).where(eq(accountantLinks.token, token)).limit(1);
    return link;
  }

  async getPublicAccountantData(userId: string, filterType: string, filterYear: string, startDate?: string, endDate?: string) {
    const today = new Date().toISOString().split('T')[0];
    const yearStart = filterYear !== 'all' ? `${filterYear}-01-01` : `${new Date().getFullYear() - 5}-01-01`;
    const yearEnd = filterYear !== 'all' ? `${filterYear}-12-31` : today;

    const from = startDate && startDate >= yearStart ? startDate : yearStart;
    const to = endDate && endDate <= yearEnd ? endDate : yearEnd;

    const conditions: any[] = [
      eq(transactions.userId, userId),
      gte(transactions.txDate, from),
      lte(transactions.txDate, to),
    ];

    if (filterType === 'business') conditions.push(eq(transactions.isBusinessExpense, true));
    if (filterType === 'personal') conditions.push(eq(transactions.isBusinessExpense, false));

    const txRows = await db
      .select({
        id: transactions.id,
        txDate: transactions.txDate,
        description: transactions.description,
        amountCents: transactions.amountCents,
        isBusinessExpense: transactions.isBusinessExpense,
        isPersonal: transactions.isPersonal,
        receiptPath: transactions.receiptPath,
        accountName: accounts.name,
        accountType: accounts.type,
        accountOwner: accounts.owner,
        categoryName: categories.name,
        categoryKind: categories.kind,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.txDate));

    const acctConditions: any[] = [eq(accounts.userId, userId)];
    if (filterType === 'business') acctConditions.push(eq(accounts.owner, 'business'));
    if (filterType === 'personal') acctConditions.push(eq(accounts.owner, 'personal'));
    const acctRows = await db.select().from(accounts).where(and(...acctConditions));

    return { transactions: txRows, accounts: acctRows, fromDate: from, toDate: to };
  }
}
