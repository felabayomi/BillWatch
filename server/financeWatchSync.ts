import { db } from "./db.js";
import { bills, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

import { storage as financeStorage } from "../apps/finance/server/storage.js";

interface SyncResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  duplicate?: boolean;
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value: unknown): string {
  if (!value) {
    return getLocalDateString();
  }

  try {
    const date = new Date(value as string | number | Date);

    if (Number.isNaN(date.getTime())) {
      return getLocalDateString();
    }

    return date.toISOString().split("T")[0];
  } catch {
    return getLocalDateString();
  }
}

function normalizeAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number.parseFloat(cleaned);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function findBestAccount(
  paymentMethod: string | null | undefined,
  accounts: any[],
) {
  if (!accounts.length) {
    return undefined;
  }

  if (!paymentMethod) {
    return accounts[0];
  }

  const normalizedPaymentMethod = paymentMethod
    .trim()
    .toLowerCase();

  const exact = accounts.find(
    (account) =>
      account.name?.trim().toLowerCase() ===
      normalizedPaymentMethod,
  );

  if (exact) {
    return exact;
  }

  const partial = accounts.find((account) => {
    const accountName =
      account.name?.trim().toLowerCase() || "";

    return (
      accountName.includes(normalizedPaymentMethod) ||
      normalizedPaymentMethod.includes(accountName)
    );
  });

  return partial || accounts[0];
}

async function findOrCreateCategory(
  userId: string,
  categoryName: string | null | undefined,
) {
  const requestedName =
    categoryName?.trim() || "Bill Payment";

  let category =
    await financeStorage.getCategoryByName(
      userId,
      requestedName,
    );

  if (category) {
    return category;
  }

  // Prefer an existing bill/expense category if the exact
  // BillWatch category does not exist.
  const categories =
    await financeStorage.getCategories(userId);

  category = categories.find(
    (item: any) =>
      item.kind === "bill" ||
      item.kind === "expense",
  );

  if (category) {
    return category;
  }

  return financeStorage.createCategory(userId, {
    name: requestedName,
    kind: "bill",
  });
}

export async function syncPaidBillToFinanceWatch(
  billId: string,
): Promise<SyncResult> {
  try {
    /*
     * ------------------------------------------------------
     * 1. Load the BillWatch bill
     * ------------------------------------------------------
     */

    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) {
      console.warn(
        `[finance-sync] Bill not found: ${billId}`,
      );

      return {
        success: false,
        error: "Bill not found",
      };
    }

    if (bill.status !== "paid") {
      console.warn(
        `[finance-sync] Bill ${billId} is not paid. Current status: ${bill.status}`,
      );

      return {
        success: false,
        error: "Bill is not paid",
      };
    }

    /*
     * ------------------------------------------------------
     * 2. Resolve the BillWatch user
     * ------------------------------------------------------
     */

    const [billWatchUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, bill.userId))
      .limit(1);

    if (!billWatchUser?.email) {
      console.warn(
        `[finance-sync] No email found for BillWatch user ${bill.userId}`,
      );

      return {
        success: false,
        error: "User email not found",
      };
    }

    /*
     * ------------------------------------------------------
     * 3. Resolve the matching FinanceWatch user
     *
     * Both applications use the same authenticated Clerk
     * identity, but email gives us a safe fallback.
     * ------------------------------------------------------
     */

    let financeUser =
      await financeStorage.getUser(bill.userId);

    if (!financeUser) {
      financeUser =
        await financeStorage.getUserByEmail(
          billWatchUser.email,
        );
    }

    if (!financeUser) {
      /*
       * FinanceWatch may not have initialized this user yet.
       * Create the FinanceWatch user using the same identity.
       */

      financeUser =
        await financeStorage.upsertUser({
          id: bill.userId,
          email: billWatchUser.email,
          firstName: billWatchUser.firstName ?? null,
          lastName: billWatchUser.lastName ?? null,
          profileImageUrl:
            billWatchUser.profileImageUrl ?? null,
        });

      await financeStorage.initializeDefaultCategories(
        financeUser.id,
      );
    }

    const financeUserId = financeUser.id;

    /*
     * ------------------------------------------------------
     * 4. Prevent duplicate BillWatch -> FinanceWatch sync
     * ------------------------------------------------------
     *
     * externalSourceId allows FinanceWatch to know that this
     * transaction originated from this specific BillWatch bill.
     */

    const externalSourceId = `billwatch:${bill.id}`;

    const existingTransaction =
      await financeStorage.getTransactionByExternalSourceId(
        financeUserId,
        externalSourceId,
      );

    if (existingTransaction) {
      console.log(
        `[finance-sync] Bill ${bill.id} already exists in FinanceWatch as transaction ${existingTransaction.id}`,
      );

      if (!bill.financeWatchSynced) {
        await db
          .update(bills)
          .set({
            financeWatchSynced: true,
            financeWatchSyncedAt: new Date(),
          })
          .where(eq(bills.id, bill.id));
      }

      return {
        success: true,
        transactionId: existingTransaction.id,
        duplicate: true,
      };
    }

    /*
     * ------------------------------------------------------
     * 5. Get the user's FinanceWatch accounts
     * ------------------------------------------------------
     */

    const financeAccounts =
      await financeStorage.getAccounts(financeUserId);

    if (!financeAccounts.length) {
      console.warn(
        `[finance-sync] FinanceWatch user ${financeUserId} has no accounts. Cannot sync BillWatch bill ${bill.id}.`,
      );

      return {
        success: false,
        error:
          "No FinanceWatch accounts exist for this user",
      };
    }

    /*
     * ------------------------------------------------------
     * 6. Determine which FinanceWatch account receives it
     * ------------------------------------------------------
     */

    const targetAccount = findBestAccount(
      bill.paymentMethod,
      financeAccounts,
    );

    if (!targetAccount) {
      return {
        success: false,
        error: "Unable to determine FinanceWatch account",
      };
    }

    /*
     * ------------------------------------------------------
     * 7. Determine FinanceWatch category
     * ------------------------------------------------------
     */

    const category =
      await findOrCreateCategory(
        financeUserId,
        bill.category,
      );

    /*
     * ------------------------------------------------------
     * 8. Determine amount/date
     * ------------------------------------------------------
     */

    const amount = normalizeAmount(
      bill.paidAmount ?? bill.amount,
    );

    if (amount <= 0) {
      console.warn(
        `[finance-sync] Invalid amount for BillWatch bill ${bill.id}:`,
        bill.paidAmount ?? bill.amount,
      );

      return {
        success: false,
        error: "Bill payment amount is invalid",
      };
    }

    const amountCents = Math.round(amount * 100);

    const txDate = normalizeDate(
      bill.paidDate ?? new Date(),
    );

    const company =
      bill.company?.trim() || "Bill payment";

    const description = bill.description
      ? `${company} - ${bill.description}`
      : company;

    /*
     * ------------------------------------------------------
     * 9. Create FinanceWatch transaction
     *
     * Expenses are stored as negative values.
     * ------------------------------------------------------
     */

    const transaction =
      await financeStorage.createTransaction(
        financeUserId,
        {
          accountId: targetAccount.id,
          amountCents: -Math.abs(amountCents),
          txDate,
          description,
          categoryId: category.id,

          isBusinessExpense:
            bill.billType === "business",

          isPersonal:
            bill.billType !== "business",

          externalSourceId,
        },
      );

    /*
     * ------------------------------------------------------
     * 10. Mark BillWatch bill as synchronized
     * ------------------------------------------------------
     */

    await db
      .update(bills)
      .set({
        financeWatchSynced: true,
        financeWatchSyncedAt: new Date(),
      })
      .where(eq(bills.id, bill.id));

    console.log(
      `[finance-sync] Created FinanceWatch transaction from BillWatch`,
      {
        billId: bill.id,
        transactionId: transaction.id,
        userId: financeUserId,
        account: targetAccount.name,
        amountCents: -Math.abs(amountCents),
        date: txDate,
      },
    );

    return {
      success: true,
      transactionId: transaction.id,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[finance-sync] Failed to sync BillWatch bill ${billId}:`,
      error,
    );

    return {
      success: false,
      error: message,
    };
  }
}

export async function syncMultipleBillsToFinanceWatch(
  billIds: string[],
): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const billId of billIds) {
    const result =
      await syncPaidBillToFinanceWatch(billId);

    if (result.success) {
      synced += 1;
    } else {
      failed += 1;

      if (result.error) {
        errors.push(
          `${billId}: ${result.error}`,
        );
      }
    }
  }

  console.log(
    `[finance-sync] Bulk sync complete: ${synced} synced, ${failed} failed`,
  );

  return {
    synced,
    failed,
    errors,
  };
}