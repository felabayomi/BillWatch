import { randomUUID } from "crypto";
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
  type AccountCategory,
  type Business,
  type InsertBusiness,
  inferCategory
} from "../shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Accounts
  getAccounts(userId: string): Promise<Account[]>;
  getAccountsWithBalance(userId: string, date?: string): Promise<AccountWithBalance[]>;
  getAccount(userId: string, id: string): Promise<Account | undefined>;
  createAccount(userId: string, account: InsertAccount): Promise<Account>;
  updateAccount(userId: string, id: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(userId: string, id: string): Promise<boolean>;
  migrateAccountCategories(): Promise<{ updated: number; accounts: Account[] }>;

  // Categories
  getCategories(userId: string): Promise<Category[]>;
  getCategory(userId: string, id: string): Promise<Category | undefined>;
  getCategoryByName(userId: string, name: string): Promise<Category | undefined>;
  createCategory(userId: string, category: InsertCategory): Promise<Category>;
  updateCategory(userId: string, id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(userId: string, id: string): Promise<boolean>;

  // Bills
  getBills(userId: string): Promise<Bill[]>;
  getBill(userId: string, id: string): Promise<Bill | undefined>;
  createBill(userId: string, bill: InsertBill): Promise<Bill>;
  updateBill(userId: string, id: string, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(userId: string, id: string): Promise<boolean>;

  // Transactions
  getTransactions(userId: string, date?: string, accountId?: string): Promise<TransactionWithDetails[]>;
  getTransaction(userId: string, id: string): Promise<Transaction | undefined>;
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(userId: string, id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;

  // Daily Balances
  getDailyBalance(userId: string, accountId: string, date: string): Promise<DailyBalance | undefined>;
  computeDailyBalance(userId: string, accountId: string, date: string): Promise<DailyBalance>;
  computeAllDailyBalances(userId: string, date: string): Promise<DailyBalance[]>;
  getDailySummary(userId: string, date: string): Promise<DailySummary>;
  clearAllDailyBalances(userId: string): Promise<number>;
  clearAccountDailyBalances(userId: string, accountId: string): Promise<number>;
  getOrCreateAdjustmentCategory(userId: string): Promise<Category>;

  // Businesses
  getBusinesses(userId: string): Promise<Business[]>;
  getBusiness(userId: string, id: string): Promise<Business | undefined>;
  createBusiness(userId: string, business: InsertBusiness): Promise<Business>;
  deleteBusiness(userId: string, id: string): Promise<boolean>;

  // Transfers
  createTransfer(userId: string, transfer: { fromAccountId: string; toAccountId: string; amountCents: number; txDate: string; description: string }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }>;

  // Credit Card Payments (transfer with bill tracking)
  createCreditCardPayment(userId: string, payment: { fromAccountId: string; creditCardAccountId: string; amountCents: number; txDate: string; description: string; categoryId: string; isBusinessExpense?: boolean; businessId?: string }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }>;

  // Cash Flow Management
  getCashFlowEntry(userId: string, date: string): Promise<any>;
  saveCashFlowEntry(userId: string, cashFlowData: any): Promise<any>;
  getMonthlyCashFlow(userId: string, month: string): Promise<any[]>;
  getYearlyCashFlow(userId: string, year: string): Promise<any[]>;
  
  // Computed Cash Flow from Transactions
  getComputedCashFlow(userId: string, date: string): Promise<any>;
  getComputedWeeklyCashFlow(userId: string, startDate: string, endDate: string): Promise<any[]>;
  getComputedMonthlyCashFlow(userId: string, month: string): Promise<any[]>;
  getComputedYearlyCashFlow(userId: string, year: string): Promise<any[]>;
  getCashFlowTransactions(userId: string, startDate: string, endDate: string, type: string): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private accounts: Map<string, Account>;
  private categories: Map<string, Category>;
  private bills: Map<string, Bill>;
  private transactions: Map<string, Transaction>;
  private dailyBalances: Map<string, DailyBalance>;
  private users: Map<string, User>;
  private cashFlowEntries: Map<string, any>;

  constructor() {
    this.accounts = new Map();
    this.categories = new Map();
    this.bills = new Map();
    this.transactions = new Map();
    this.dailyBalances = new Map();
    this.users = new Map();
    this.cashFlowEntries = new Map();
    
    // Default categories will be initialized per user when they first sign up
  }

  // Initialize default categories for a specific user
  async initializeDefaultCategories(userId: string) {
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
      { name: "Unrealized Gain", kind: "investment" },
      { name: "Unrealized Loss", kind: "investment" },
      { name: "Realized Gain", kind: "investment" },
      { name: "Realized Loss", kind: "investment" },
      { name: "Internal Move", kind: "transfer" },
      { name: "Opening Fix", kind: "adjustment" },
      { name: "Bank Correction", kind: "adjustment" },
    ];

    for (const cat of defaultCategories) {
      await this.createCategory(userId, cat as InsertCategory);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Accounts
  async getAccounts(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.userId === userId);
  }

  async getAccountsWithBalance(userId: string, date?: string): Promise<AccountWithBalance[]> {
    const accounts = await this.getAccounts(userId);
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const accountsWithBalance: AccountWithBalance[] = [];
    
    for (const account of accounts) {
      // Get or compute daily balance for target date
      let dailyBalance = await this.getDailyBalance(userId, account.id, targetDate);
      if (!dailyBalance) {
        dailyBalance = await this.computeDailyBalance(userId, account.id, targetDate);
      }
      
      // Get or compute daily balance for previous date
      const previousDate = new Date(targetDate);
      previousDate.setDate(previousDate.getDate() - 1);
      let previousDailyBalance = await this.getDailyBalance(userId, account.id, previousDate.toISOString().split('T')[0]);
      if (!previousDailyBalance) {
        previousDailyBalance = await this.computeDailyBalance(userId, account.id, previousDate.toISOString().split('T')[0]);
      }
      
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
    const account = this.accounts.get(id);
    return account && account.userId === userId ? account : undefined;
  }

  async createAccount(userId: string, account: InsertAccount): Promise<Account> {
    const id = randomUUID();
    
    // Use inferCategory if no category is provided
    const category = account.category || inferCategory({
      type: account.type,
      name: account.name,
      owner: account.owner,
      institution: account.institution || undefined
    });
    
    const newAccount: Account = {
      ...account,
      id,
      userId,
      category,
      createdAt: new Date(),
      institution: account.institution || null,
    };
    this.accounts.set(id, newAccount);
    return newAccount;
  }

  async updateAccount(userId: string, id: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const existing = this.accounts.get(id);
    if (!existing || existing.userId !== userId) return undefined;
    
    // If opening balance changed, clear all daily balances for this account to force recalculation
    if (account.openingBalanceCents !== undefined && account.openingBalanceCents !== existing.openingBalanceCents) {
      const keysToDelete: string[] = [];
      this.dailyBalances.forEach((balance, key) => {
        if (balance.accountId === id) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.dailyBalances.delete(key));
    }
    
    const updated = { ...existing, ...account };
    this.accounts.set(id, updated);
    return updated;
  }

  async deleteAccount(userId: string, id: string): Promise<boolean> {
    const existing = this.accounts.get(id);
    if (!existing || existing.userId !== userId) return false;
    return this.accounts.delete(id);
  }

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(category => category.userId === userId);
  }

  async getCategory(userId: string, id: string): Promise<Category | undefined> {
    const category = this.categories.get(id);
    return category && category.userId === userId ? category : undefined;
  }

  async getCategoryByName(userId: string, name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(cat => cat.name === name && cat.userId === userId);
  }

  async createCategory(userId: string, category: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const newCategory: Category = { ...category, id, userId };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(userId: string, id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing || existing.userId !== userId) {
      return undefined;
    }
    
    const updated: Category = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(userId: string, id: string): Promise<boolean> {
    const existing = this.categories.get(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    
    return this.categories.delete(id);
  }

  // Bills
  async getBills(userId: string): Promise<Bill[]> {
    return Array.from(this.bills.values()).filter(bill => bill.userId === userId);
  }

  async getBill(userId: string, id: string): Promise<Bill | undefined> {
    const bill = this.bills.get(id);
    return bill && bill.userId === userId ? bill : undefined;
  }

  async createBill(userId: string, bill: InsertBill): Promise<Bill> {
    const id = randomUUID();
    const newBill: Bill = { 
      ...bill, 
      id,
      userId,
      dueDay: bill.dueDay ?? null,
      amountCents: bill.amountCents ?? null,
      accountId: bill.accountId ?? null,
      categoryId: bill.categoryId ?? null,
    };
    this.bills.set(id, newBill);
    return newBill;
  }

  async updateBill(userId: string, id: string, bill: Partial<InsertBill>): Promise<Bill | undefined> {
    const existing = this.bills.get(id);
    if (!existing || existing.userId !== userId) return undefined;
    
    const updated = { ...existing, ...bill };
    this.bills.set(id, updated);
    return updated;
  }

  async deleteBill(userId: string, id: string): Promise<boolean> {
    const existing = this.bills.get(id);
    if (!existing || existing.userId !== userId) return false;
    return this.bills.delete(id);
  }

  // Transactions
  async getTransactions(userId: string, date?: string, accountId?: string): Promise<TransactionWithDetails[]> {
    let transactions = Array.from(this.transactions.values()).filter(t => t.userId === userId);
    
    if (date) {
      transactions = transactions.filter(t => t.txDate === date);
    }
    
    if (accountId) {
      transactions = transactions.filter(t => t.accountId === accountId);
    }
    
    const transactionsWithDetails: TransactionWithDetails[] = [];
    
    for (const transaction of transactions) {
      const account = await this.getAccount(userId, transaction.accountId);
      const category = transaction.categoryId ? await this.getCategory(userId, transaction.categoryId) : null;
      const bill = transaction.billId ? await this.getBill(userId, transaction.billId) : null;
      
      transactionsWithDetails.push({
        ...transaction,
        accountName: account?.name || 'Unknown Account',
        accountType: account?.type || 'checking',
        categoryName: category?.name || 'Uncategorized',
        categoryKind: category?.kind || 'other',
        billName: bill?.name,
      });
    }
    
    return transactionsWithDetails.sort((a, b) => 
      new Date(b.txDate).getTime() - new Date(a.txDate).getTime()
    );
  }

  async getTransaction(userId: string, id: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    return transaction && transaction.userId === userId ? transaction : undefined;
  }

  async createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const newTransaction: Transaction = {
      ...transaction,
      id,
      userId,
      createdAt: new Date(),
      description: transaction.description || null,
      categoryId: transaction.categoryId || null,
      billId: transaction.billId || null,
      transferId: transaction.transferId || null,
      refundOfId: null,  // Set by system for refund functionality
      isSystemGenerated: false,  // Default to user-generated
    };
    this.transactions.set(id, newTransaction);
    
    // Invalidate cached daily balances for this account from this date forward
    this.invalidateAccountBalancesFromDate(transaction.accountId, transaction.txDate);
    
    return newTransaction;
  }


  // Helper method to invalidate cached balances for an account from a specific date forward
  private invalidateAccountBalancesFromDate(accountId: string, fromDate: string): void {
    // Delete all cached entries for this account from the specified date forward
    const keysToDelete: string[] = [];
    this.dailyBalances.forEach((value, key) => {
      const [keyAccountId, keyDate] = key.split('-');
      if (keyAccountId === accountId && keyDate >= fromDate) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.dailyBalances.delete(key));
  }

  async updateTransaction(userId: string, id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existingTransaction = this.transactions.get(id);
    if (!existingTransaction || existingTransaction.userId !== userId) return undefined;

    const updatedTransaction: Transaction = {
      ...existingTransaction,
      ...updates,
    };
    this.transactions.set(id, updatedTransaction);

    // Invalidate caches for both old and new account/date combinations
    this.invalidateAccountBalancesFromDate(existingTransaction.accountId, existingTransaction.txDate);
    if (updates.accountId && updates.accountId !== existingTransaction.accountId) {
      this.invalidateAccountBalancesFromDate(updates.accountId, updates.txDate || existingTransaction.txDate);
    }
    if (updates.txDate && updates.txDate !== existingTransaction.txDate) {
      const earlierDate = updates.txDate < existingTransaction.txDate ? updates.txDate : existingTransaction.txDate;
      this.invalidateAccountBalancesFromDate(updatedTransaction.accountId, earlierDate);
    }

    return updatedTransaction;
  }

  async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.userId !== userId) return false;

    this.transactions.delete(id);
    
    // Invalidate cached balances from this transaction's date forward
    this.invalidateAccountBalancesFromDate(transaction.accountId, transaction.txDate);

    return true;
  }

  // Businesses
  async getBusinesses(userId: string): Promise<Business[]> {
    return [];
  }

  async getBusiness(userId: string, id: string): Promise<Business | undefined> {
    return undefined;
  }

  async createBusiness(userId: string, business: InsertBusiness): Promise<Business> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteBusiness(userId: string, id: string): Promise<boolean> {
    return false;
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
    
    // Generate unique transfer ID to link the two transactions
    const transferId = randomUUID();
    
    // Create FROM transaction (negative amount - money leaving)
    const fromTransaction = await this.createTransaction(userId, {
      accountId: fromAccountId,
      amountCents: -amountCents, // Negative for money leaving
      txDate,
      description: `Transfer to ${toAccount.name}: ${description}`,
      categoryId: transferCategory.id,
      transferId,
    });
    
    // Create TO transaction (positive amount - money arriving)
    const toTransaction = await this.createTransaction(userId, {
      accountId: toAccountId,
      amountCents: amountCents, // Positive for money arriving
      txDate,
      description: `Transfer from ${fromAccount.name}: ${description}`,
      categoryId: transferCategory.id,
      transferId,
    });
    
    return { fromTransaction, toTransaction };
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
    
    // Generate unique transfer ID to link the two transactions
    const transferId = randomUUID();
    
    // Create FROM transaction (negative amount - money leaving the paying account)
    const fromTransaction = await this.createTransaction(userId, {
      accountId: fromAccountId,
      amountCents: -amountCents,
      txDate,
      description: `Credit card payment to ${creditCardAccount.name}: ${description}`,
      categoryId,
      transferId,
      isBusinessExpense: isBusinessExpense || false,
      businessId: businessId || null,
    });
    
    // Create TO transaction (positive amount - reduces credit card debt)
    const toTransaction = await this.createTransaction(userId, {
      accountId: creditCardAccountId,
      amountCents: amountCents,
      txDate,
      description: `Payment from ${fromAccount.name}: ${description}`,
      categoryId,
      transferId,
      isBusinessExpense: isBusinessExpense || false,
      businessId: businessId || null,
    });
    
    return { fromTransaction, toTransaction };
  }


  // Daily Balances
  async getDailyBalance(userId: string, accountId: string, date: string): Promise<DailyBalance | undefined> {
    const key = `${accountId}-${date}`;
    const balance = this.dailyBalances.get(key);
    return balance && balance.userId === userId ? balance : undefined;
  }

  async computeDailyBalance(userId: string, accountId: string, date: string): Promise<DailyBalance> {
    const account = await this.getAccount(userId, accountId);
    if (!account) throw new Error("Account not found");
    
    const targetDate = new Date(date);
    const openingDate = new Date(account.openingDate);
    
    let openingCents: number;
    
    // If requested date is on or before opening date, use account's opening balance
    if (targetDate <= openingDate) {
      openingCents = account.openingBalanceCents;
    } else {
      // Get previous day's closing balance, but don't go before opening date
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateString = previousDate.toISOString().split('T')[0];
      
      // If previous date is before opening date, use opening balance
      if (previousDate < openingDate) {
        openingCents = account.openingBalanceCents;
      } else {
        // Check cache first
        const previousBalance = await this.getDailyBalance(userId, accountId, previousDateString);
        if (previousBalance) {
          openingCents = previousBalance.closingCents;
        } else {
          // Recursively compute, but with bounds checking
          const previousDailyBalance = await this.computeDailyBalance(userId, accountId, previousDateString);
          openingCents = previousDailyBalance.closingCents;
        }
      }
    }
    
    // Get transactions for this date and account
    const transactions = await this.getTransactions(userId, date, accountId);
    
    let inflowCents = 0;
    let outflowCents = 0;
    let transferInCents = 0;
    let transferOutCents = 0;
    let adjustmentCents = 0;
    
    // Define liability account types
    const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
    
    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amountCents);
      const isLiability = liabilityTypes.includes(account.type);
      
      if (transaction.transferId) {
        // Track for reporting purposes first
        if (transaction.amountCents > 0) {
          transferInCents += transaction.amountCents;
        } else {
          transferOutCents += Math.abs(transaction.amountCents);
        }
        
        // Keep transfers separate from inflow/outflow for consistent reporting across storage implementations
      } else if (transaction.categoryKind === 'adjustment') {
        adjustmentCents += transaction.amountCents;
      } else if (transaction.categoryKind === 'income') {
        // Income always represents positive value for the account holder
        inflowCents += amount;
      } else if (['expense', 'bill', 'debt'].includes(transaction.categoryKind)) {
        if (isLiability) {
          if (transaction.categoryKind === 'debt') {
            // Liability debt payments REDUCE the outstanding balance (paying down debt)
            inflowCents += amount; // Track as inflow since it reduces liability
          } else {
            // Liability purchases/expenses INCREASE the outstanding balance (more debt)
            outflowCents += amount; // Track as outflow since it increases liability
          }
        } else {
          // Asset accounts: all expenses reduce balance
          outflowCents += amount;
        }
      } else if (transaction.categoryKind === 'investment') {
        // For investments, use amount sign to determine inflow/outflow
        if (transaction.amountCents > 0) {
          inflowCents += transaction.amountCents;
        } else {
          outflowCents += Math.abs(transaction.amountCents);
        }
      }
    }
    
    // Calculate closing balance with liability account awareness
    let closingCents;
    if (liabilityTypes.includes(account.type)) {
      // Liability accounts: inflows reduce liability, outflows increase liability  
      // For transfers: transferIn reduces debt, transferOut increases debt (invert signs)
      closingCents = openingCents - inflowCents + outflowCents - transferInCents + transferOutCents + adjustmentCents;
    } else {
      // Asset accounts: normal calculation
      closingCents = openingCents + inflowCents - outflowCents + transferInCents - transferOutCents + adjustmentCents;
    }
    
    const dailyBalance: DailyBalance = {
      id: randomUUID(),
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
    
    const key = `${accountId}-${date}`;
    this.dailyBalances.set(key, dailyBalance);
    
    return dailyBalance;
  }

  async computeAllDailyBalances(userId: string, date: string): Promise<DailyBalance[]> {
    const accounts = await this.getAccounts(userId);
    const balances: DailyBalance[] = [];
    
    for (const account of accounts) {
      const balance = await this.computeDailyBalance(userId, account.id, date);
      balances.push(balance);
    }
    
    return balances;
  }

  async clearAllDailyBalances(userId: string): Promise<number> {
    let count = 0;
    for (const [key] of this.dailyBalances) {
      if (key.startsWith(userId + ':')) {
        this.dailyBalances.delete(key);
        count++;
      }
    }
    return count;
  }

  async clearAccountDailyBalances(userId: string, accountId: string): Promise<number> {
    let count = 0;
    const prefix = `${userId}:${accountId}:`;
    for (const [key] of this.dailyBalances) {
      if (key.startsWith(prefix)) {
        this.dailyBalances.delete(key);
        count++;
      }
    }
    return count;
  }

  async getOrCreateAdjustmentCategory(userId: string): Promise<Category> {
    for (const cat of this.categories.values()) {
      if (cat.userId === userId && cat.kind === 'adjustment') return cat;
    }
    const id = randomUUID();
    const cat: Category = { id, userId, name: 'Balance Correction', kind: 'adjustment' };
    this.categories.set(id, cat);
    return cat;
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

  // Cash Flow Management
  async getCashFlowEntry(userId: string, date: string): Promise<any> {
    const key = `${userId}-${date}`;
    return this.cashFlowEntries.get(key);
  }

  async saveCashFlowEntry(userId: string, cashFlowData: any): Promise<any> {
    const key = `${userId}-${cashFlowData.date}`;
    this.cashFlowEntries.set(key, cashFlowData);
    return cashFlowData;
  }

  async getMonthlyCashFlow(userId: string, month: string): Promise<any[]> {
    const entries = Array.from(this.cashFlowEntries.entries())
      .filter(([key, entry]) => key.startsWith(`${userId}-`) && entry.date?.startsWith(month))
      .map(([_, entry]) => entry);
    return entries;
  }

  async getYearlyCashFlow(userId: string, year: string): Promise<any[]> {
    const entries = Array.from(this.cashFlowEntries.entries())
      .filter(([key, entry]) => key.startsWith(`${userId}-`) && entry.date?.startsWith(year))
      .map(([_, entry]) => entry);
    return entries;
  }

  // Computed Cash Flow from Transactions
  async getComputedCashFlow(userId: string, date: string): Promise<any> {
    const allTransactions = await this.getTransactions(userId);
    const transactions = allTransactions.filter(tx => tx.txDate === date);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    for (const tx of transactions) {
      if (tx.amountCents > 0) {
        totalIncome += tx.amountCents;
      } else {
        totalExpenses += Math.abs(tx.amountCents);
      }
    }
    
    return {
      date,
      totalIncome,
      totalExpenses,
      totalBillsPaid: 0,
      netCashFlow: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  }

  async getComputedMonthlyCashFlow(userId: string, month: string): Promise<any[]> {
    const allTransactions = await this.getTransactions(userId);
    const monthTransactions = allTransactions.filter(tx => tx.txDate.startsWith(month));
    
    // Group by date
    const byDate: { [date: string]: any[] } = {};
    for (const tx of monthTransactions) {
      if (!byDate[tx.txDate]) byDate[tx.txDate] = [];
      byDate[tx.txDate].push(tx);
    }
    
    const result = Object.entries(byDate).map(([date, txs]) => {
      let totalIncome = 0;
      let totalExpenses = 0;
      for (const tx of txs) {
        if (tx.amountCents > 0) totalIncome += tx.amountCents;
        else totalExpenses += Math.abs(tx.amountCents);
      }
      return {
        date,
        totalIncome,
        totalExpenses,
        totalBillsPaid: 0,
        netCashFlow: totalIncome - totalExpenses,
      };
    });
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getComputedWeeklyCashFlow(userId: string, startDate: string, endDate: string): Promise<any[]> {
    const allTransactions = await this.getTransactions(userId);
    const weekTransactions = allTransactions.filter(tx => tx.txDate >= startDate && tx.txDate <= endDate);
    
    const byDate: { [date: string]: any[] } = {};
    for (const tx of weekTransactions) {
      if (!byDate[tx.txDate]) byDate[tx.txDate] = [];
      byDate[tx.txDate].push(tx);
    }
    
    const result = Object.entries(byDate).map(([date, txs]) => {
      let totalIncome = 0;
      let totalExpenses = 0;
      for (const tx of txs) {
        if (tx.amountCents > 0) totalIncome += tx.amountCents;
        else totalExpenses += Math.abs(tx.amountCents);
      }
      return {
        date,
        totalIncome,
        totalExpenses,
        totalBillsPaid: 0,
        netCashFlow: totalIncome - totalExpenses,
      };
    });
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getComputedYearlyCashFlow(userId: string, year: string): Promise<any[]> {
    const allTransactions = await this.getTransactions(userId);
    const yearTransactions = allTransactions.filter(tx => tx.txDate.startsWith(year));
    
    // Group by date
    const byDate: { [date: string]: any[] } = {};
    for (const tx of yearTransactions) {
      if (!byDate[tx.txDate]) byDate[tx.txDate] = [];
      byDate[tx.txDate].push(tx);
    }
    
    const result = Object.entries(byDate).map(([date, txs]) => {
      let totalIncome = 0;
      let totalExpenses = 0;
      for (const tx of txs) {
        if (tx.amountCents > 0) totalIncome += tx.amountCents;
        else totalExpenses += Math.abs(tx.amountCents);
      }
      return {
        date,
        totalIncome,
        totalExpenses,
        totalBillsPaid: 0,
        netCashFlow: totalIncome - totalExpenses,
      };
    });
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCashFlowTransactions(userId: string, startDate: string, endDate: string, type: string): Promise<any[]> {
    return [];
  }

  async migrateAccountCategories(): Promise<{ updated: number; accounts: Account[] }> {
    const accounts = Array.from(this.accounts.values());
    const updatedAccounts: Account[] = [];
    let updatedCount = 0;
    
    for (const account of accounts) {
      // Update ALL accounts that don't have a category field
      if (!(account as any).category) {
        const inferredCategory = inferCategory({
          type: account.type,
          name: account.name,
          owner: account.owner,
          institution: account.institution || undefined
        });
        
        const updatedAccount = { ...account, category: inferredCategory };
        this.accounts.set(account.id, updatedAccount);
        updatedAccounts.push(updatedAccount);
        updatedCount++;
        console.log(`Migrated account "${account.name}" to category: ${inferredCategory}`);
      }
    }
    
    console.log(`Migration complete: Updated ${updatedCount} accounts`);
    return { updated: updatedCount, accounts: updatedAccounts };
  }
}

import { DatabaseStorage } from './databaseStorage';

// Make storage a singleton that persists across HMR
declare global {
  var __storage: DatabaseStorage | undefined;
}

function getStorage(): DatabaseStorage {
  if (!globalThis.__storage) {
    globalThis.__storage = new DatabaseStorage();
  }
  return globalThis.__storage;
}

export const storage = getStorage();
