import { type Expense } from "../../shared/schema";
import { storage as financeStorage } from "../../../finance/server/storage.js";

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

async function findOrCreateCategory(
  userId: string,
  requestedCategory:
    | string
    | null
    | undefined,
) {
  const name =
    requestedCategory?.trim() || "Expense";

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
      item.kind === "expense",
  );

  if (category) {
    return category;
  }

  return financeStorage.createCategory(userId, {
    name,
    kind: "expense",
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
      "Error fetching internal FinanceWatch data:",
      error,
    );

    return {
      accounts: [],
      categories: [],
    };
  }
}

export async function syncToFinanceWatch(
  userId: string,
  userEmail: string,
  expense: Expense,
): Promise<void> {
  try {
    const financeUser =
      await resolveFinanceUser(
        userId,
        userEmail,
      );

    const externalSourceId =
      `expensewatch:${expense.id}`;

    const existing =
      await financeStorage.getTransactionByExternalSourceId(
        financeUser.id,
        externalSourceId,
      );

    if (existing) {
      console.log(
        `[expense-finance-sync] Expense ${expense.id} already exists as ${existing.id}`,
      );

      return;
    }

    const accounts =
      await financeStorage.getAccounts(
        financeUser.id,
      );

    if (!accounts.length) {
      console.warn(
        `[expense-finance-sync] No FinanceWatch accounts for user ${financeUser.id}`,
      );

      return;
    }

    const targetAccount =
      findBestAccount(
        expense.financeWatchAccount,
        accounts,
      );

    if (!targetAccount) {
      console.warn(
        `[expense-finance-sync] Could not determine FinanceWatch account`,
      );

      return;
    }

    const category =
      await findOrCreateCategory(
        financeUser.id,
        expense.financeWatchCategory ||
          expense.category,
      );

    const amount =
      Number.parseFloat(
        String(expense.amount),
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      console.warn(
        `[expense-finance-sync] Invalid expense amount: ${expense.amount}`,
      );

      return;
    }

    const amountCents =
      Math.round(amount * 100);

    const transaction =
      await financeStorage.createTransaction(
        financeUser.id,
        {
          accountId: targetAccount.id,
          amountCents:
            -Math.abs(amountCents),

          txDate: normalizeDate(
            expense.expenseDate,
          ),

          description:
            expense.description ||
            "ExpenseWatch expense",

          categoryId: category.id,

          isBusinessExpense:
            expense.type === "business",

          isPersonal:
            expense.type !== "business",

          externalSourceId,
        },
      );

    console.log(
      `[expense-finance-sync] Created FinanceWatch transaction`,
      {
        expenseId: expense.id,
        transactionId:
          transaction.id,
        account:
          targetAccount.name,
        amountCents:
          -Math.abs(amountCents),
      },
    );
  } catch (error) {
    console.error(
      "Error syncing ExpenseWatch expense to FinanceWatch:",
      error,
    );
  }
}