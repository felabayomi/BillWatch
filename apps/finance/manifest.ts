import type { PlatformAppManifest } from "../../platform/app-registry/types";

export const financeManifest: PlatformAppManifest = {
  id: "finance",
  name: "FinanceWatch",
  category: "Money",

  basePath: "/finance",
  launchPath: "/finance",

  apiPrefix: "/api/finance",

  phase: "control",

  description:
    "Manage accounts, transactions, transfers, cash flow, balances, and your complete financial picture.",

  available: true,

  membershipTool: "FinanceWatch",

  permissions: [
    "finance.view",
    "finance.manage",
    "finance.accounts.manage",
  ],
};
