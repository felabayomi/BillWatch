import { storage as financeStorage } from "../../finance/server/storage.js";

interface FinanceWatchSyncData {
  accounts: any[];
  categories: any[];
}

async function resolveFinanceUser(
  userId: string,
  userEmail: string,
) {
  let financeUser =
    await financeStorage.getUser(userId);

  if (!financeUser && userEmail) {
    financeUser =
      await financeStorage.getUserByEmail(userEmail);
  }

  if (!financeUser) {
    financeUser =
      await financeStorage.upsertUser({
        id: userId,
        email: userEmail,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      });

    await financeStorage.initializeDefaultCategories(
      financeUser.id,
    );
  }

  return financeUser;
}

function findBestAccount(
  requestedAccount: string | null | undefined,
  accounts: any[],
) {
  if (!accounts.length) {
    return undefined;
  }

  if (requestedAccount) {
    const normalized =
      requestedAccount.trim().toLowerCase();

    const exact = accounts.find(
      (account) =>
        account.name?.trim().toLowerCase() ===
        normalized,
    );

    if (exact) {
      return exact;
    }

    const partial = accounts.find((account) => {
      const accountName =
        account.name?.trim().toLowerCase() || "";

      return (
        accountName.includes(normalized) ||
        normalized.includes(accountName)
      );
    });

    if (partial) {
      return partial;
    }
  }

  return (
    accounts.find((account) =>
      ["checking", "savings"].includes(
        String(account.type).toLowerCase(),
      ),
    ) || accounts[0]
  );
}

async function findOrCreateIncomeCategory(
  userId: string,
  requestedCategory:
    | string
    | null
    | undefined,
) {
  const name =
    requestedCategory?.trim() || "Income";

  let category =
    await financeStorage.getCategoryByName(
      userId,
      name,
    );

  if (category) {
    return category;
  }

  const categories =
    await financeStorage.getCategories(userId);

  category = categories.find(
    (item: any) =>
      item.kind === "income",
  );

  if (category) {
    return category;
  }

  return financeStorage.createCategory(userId, {
    name,
    kind: "income",
  });
}

function normalizeDate(value: unknown) {
  if (!value) {
    return new Date()
      .toISOString()
      .split("T")[0];
  }

  const date = new Date(
    value as string | number | Date,
  );

  if (Number.isNaN(date.getTime())) {
    return new Date()
      .toISOString()
      .split("T")[0];
  }

  return date.toISOString().split("T")[0];
}

export async function getFinanceWatchSyncData(
  userId: string,
  userEmail: string,
): Promise<FinanceWatchSyncData> {
  try {
    const financeUser =
      await resolveFinanceUser(
        userId,
        userEmail,
      );

    const [accounts, categories] =
      await Promise.all([
        financeStorage.getAccounts(
          financeUser.id,
        ),
        financeStorage.getCategories(
          financeUser.id,
        ),
      ]);

    return {
      accounts,
      categories,
    };
  } catch (error) {
    console.error(
      "[income-finance-sync] Failed to fetch FinanceWatch data:",
      error,
    );

    return {
      accounts: [],
      categories: [],
    };
  }
}

export async function syncIncomeToFinanceWatch(
  userId: string,
  userEmail: string,
  incomeEntry: {
    id: string;
    amount: string;
    source: string;
    notes: string | null;
    date: Date | null;
  },
  requestedAccount?: string,
): Promise<{
  success: boolean;
  error?: string;
  transactionId?: string;
  duplicate?: boolean;
}> {
  try {
    const financeUser =
      await resolveFinanceUser(
        userId,
        userEmail,
      );

    const externalSourceId =
      `incomelift:${incomeEntry.id}`;

    const existing =
      await financeStorage.getTransactionByExternalSourceId(
        financeUser.id,
        externalSourceId,
      );

    if (existing) {
      console.log(
        `[income-finance-sync] Income ${incomeEntry.id} already exists as ${existing.id}`,
      );

      return {
        success: true,
        transactionId: existing.id,
        duplicate: true,
      };
    }

    const accounts =
      await financeStorage.getAccounts(
        financeUser.id,
      );

    if (!accounts.length) {
      return {
        success: false,
        error: "No FinanceWatch accounts exist for this user",
      };
    }

    const targetAccount =
      findBestAccount(
        requestedAccount,
        accounts,
      );

    if (!targetAccount) {
      return {
        success: false,
        error: "Unable to determine FinanceWatch account",
      };
    }

    const category =
      await findOrCreateIncomeCategory(
        financeUser.id,
        incomeEntry.source,
      );

    const amount =
      Number.parseFloat(incomeEntry.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: "Income amount is invalid",
      };
    }

    const amountCents =
      Math.round(amount * 100);

    const txDate =
      normalizeDate(incomeEntry.date);

    const description =
      incomeEntry.notes
        ? `${incomeEntry.source}: ${incomeEntry.notes}`
        : incomeEntry.source;

    const transaction =
      await financeStorage.createTransaction(
        financeUser.id,
        {
          accountId: targetAccount.id,
          amountCents: Math.abs(amountCents),
          txDate,
          description,
          categoryId: category.id,
          isBusinessExpense: false,
          isPersonal: true,
          externalSourceId,
        },
      );

    console.log(
      `[income-finance-sync] Created FinanceWatch income transaction`,
      {
        incomeId: incomeEntry.id,
        transactionId: transaction.id,
        account: targetAccount.name,
        amountCents: Math.abs(amountCents),
        category: category.name,
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
      `[income-finance-sync] Failed to sync income:`,
      error,
    );

    return {
      success: false,
      error: message,
    };
  }
}
