import { db } from './db';
import { bills, users, accounts } from '@shared/schema';
import { eq } from 'drizzle-orm';

function getApiUrl(): string {
  return process.env.FINANCE_WATCH_API_URL || '';
}

function getApiKey(): string {
  return process.env.FINANCE_WATCH_API_KEY || '';
}

interface FinanceWatchPayload {
  email: string;
  amount: number;
  description: string;
  date: string;
  accountName: string;
  categoryName: string;
  isBusinessExpense: boolean;
  businessName?: string;
  receiptUrl?: string;
}

interface FinanceWatchAccountData {
  accounts: string[];
  categories: string[];
}

const accountDataCache = new Map<string, { data: FinanceWatchAccountData; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchAccountData(email: string): Promise<FinanceWatchAccountData | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  const cached = accountDataCache.get(email);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${apiUrl.replace(/\/$/, '')}/api/sync/accounts?email=${encodeURIComponent(email)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': getApiKey(),
      },
    });

    if (!response.ok) {
      console.log(`⚠️ Finance Watch: Could not fetch accounts for ${email} - ${response.status}`);
      return null;
    }

    const data = await response.json();
    const accountData: FinanceWatchAccountData = {
      accounts: Array.isArray(data.accounts) ? data.accounts.map((a: any) => typeof a === 'string' ? a : a.name || a.accountName || '') : [],
      categories: Array.isArray(data.categories) ? data.categories.map((c: any) => typeof c === 'string' ? c : c.name || c.categoryName || '') : [],
    };

    accountDataCache.set(email, { data: accountData, fetchedAt: Date.now() });
    console.log(`📋 Finance Watch: Fetched ${accountData.accounts.length} accounts, ${accountData.categories.length} categories for ${email}`);
    return accountData;
  } catch (error: any) {
    console.error(`⚠️ Finance Watch: Error fetching account data:`, error.message);
    return null;
  }
}

function findBestMatch(value: string, options: string[]): string | null {
  if (!value || options.length === 0) return null;
  const lower = value.toLowerCase();
  const exact = options.find(o => o.toLowerCase() === lower);
  if (exact) return exact;
  const partial = options.find(o => o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase()));
  if (partial) return partial;
  return null;
}

function buildPayload(bill: any, userEmail: string, accountData: FinanceWatchAccountData | null, localAccounts: string[]): FinanceWatchPayload {
  const paidAmount = bill.paidAmount ? parseFloat(bill.paidAmount) : parseFloat(bill.amount);
  const paidDate = bill.paidDate ? new Date(bill.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const rawDescription = `${bill.company}${bill.description ? ' - ' + bill.description : ''}`;
  const description = rawDescription.length > 200 ? rawDescription.substring(0, 197) + '...' : rawDescription;

  let accountName = bill.paymentMethod || 'BillWatch Payment';
  let categoryName = bill.category || 'Synced Bill Payment';

  if (localAccounts.length > 0) {
    const localMatch = findBestMatch(accountName, localAccounts);
    if (localMatch) {
      accountName = localMatch;
    } else {
      accountName = localAccounts[0];
    }
  }

  if (accountData) {
    const matchedAccount = findBestMatch(accountName, accountData.accounts);
    if (matchedAccount) {
      accountName = matchedAccount;
    }

    const matchedCategory = findBestMatch(categoryName, accountData.categories);
    if (matchedCategory) {
      categoryName = matchedCategory;
    }
  }

  const payload: FinanceWatchPayload = {
    email: userEmail,
    amount: paidAmount,
    description: description,
    date: paidDate,
    accountName: accountName,
    categoryName: categoryName,
    isBusinessExpense: bill.billType === 'business',
  };

  if (bill.billType === 'business' && bill.businessName) {
    payload.businessName = bill.businessName;
  }

  const receiptPath = bill.receiptUrl || bill.invoiceUrl;
  if (receiptPath) {
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      payload.receiptUrl = new URL(receiptPath, appUrl).href;
    }
  }

  return payload;
}

export async function syncPaidBillToFinanceWatch(billId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [bill] = await db.select().from(bills).where(eq(bills.id, billId));

    if (!bill) {
      console.log(`⚠️ Finance Watch Sync: Bill ${billId} not found`);
      return { success: false, error: 'Bill not found' };
    }

    if (bill.status !== 'paid') {
      console.log(`⚠️ Finance Watch Sync: Bill ${billId} is not paid (status: ${bill.status}), skipping`);
      return { success: false, error: 'Bill is not paid' };
    }

    const [user] = await db.select().from(users).where(eq(users.id, bill.userId));
    if (!user?.email) {
      console.log(`⚠️ Finance Watch Sync: No email found for user ${bill.userId}`);
      return { success: false, error: 'User email not found' };
    }

    const apiUrl = getApiUrl();

    const localAccountRecords = await db.select().from(accounts).where(eq(accounts.userId, bill.userId));
    const localAccountNames = localAccountRecords.map(a => a.name);

    const accountData = apiUrl ? await fetchAccountData(user.email) : null;
    const payload = buildPayload(bill, user.email, accountData, localAccountNames);

    if (!apiUrl) {
      console.log(`📤 Finance Watch Sync: No API URL configured. Bill ${billId} data ready for sync when URL is set.`);
      console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
      await db.update(bills).set({
        financeWatchSynced: true,
        financeWatchSyncedAt: new Date(),
      }).where(eq(bills.id, billId));
      return { success: true };
    }

    const syncUrl = `${apiUrl.replace(/\/$/, '')}/api/sync/bill-payments`;

    console.log(`📤 Finance Watch Sync: Sending bill ${billId} (${bill.company} - $${bill.amount}) to ${syncUrl}${payload.receiptUrl ? ' (with receipt)' : ''}`);

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': getApiKey(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Finance Watch Sync: Failed for bill ${billId} - ${response.status}: ${errorText}`);
      return { success: false, error: `API error: ${response.status} ${errorText}` };
    }

    await db.update(bills).set({
      financeWatchSynced: true,
      financeWatchSyncedAt: new Date(),
    }).where(eq(bills.id, billId));

    console.log(`✅ Finance Watch Sync: Bill ${billId} (${bill.company}) synced successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Finance Watch Sync Error for bill ${billId}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function syncMultipleBillsToFinanceWatch(billIds: string[]): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const billId of billIds) {
    const result = await syncPaidBillToFinanceWatch(billId);
    if (result.success) {
      synced++;
    } else {
      failed++;
      if (result.error) errors.push(`${billId}: ${result.error}`);
    }
  }

  console.log(`📊 Finance Watch Bulk Sync: ${synced} synced, ${failed} failed`);
  return { synced, failed, errors };
}
