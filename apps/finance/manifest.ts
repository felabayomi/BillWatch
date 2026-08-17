import type { PlatformAppManifest } from "../../platform/app-registry/types";

export const financeManifest: PlatformAppManifest = {
  id: "finance",
  name: "FinanceTracker",
  basePath: "/finance",
  apiPrefix: "/api/finance",
  description: "Accounts, transactions, transfers, cash flow, reporting, and finance management.",
  permissions: [
    "finance.view",
    "finance.manage",
    "finance.accounts.manage",
  ],
};
