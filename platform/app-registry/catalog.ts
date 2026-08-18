import type { PlatformAppManifest } from "./types";

export const platformCatalog: PlatformAppManifest[] = [
  {
    id: "expensewatch",
    name: "ExpenseWatch",
    category: "Spending",
    basePath: "/spending",
    launchPath: "/spending",
    apiPrefix: "/api/spending",
    phase: "control",
    description:
      "Track expenses, understand spending patterns, and stay in control of where your money goes.",
    available: false,
    membershipTool: "ExpenseWatch",
    permissions: [
      "expensewatch.view",
      "expensewatch.manage",
    ],
  },

  {
    id: "incomelift",
    name: "IncomeLift",
    category: "Income",
    basePath: "/income",
    launchPath: "/income",
    apiPrefix: "/api/income",
    phase: "momentum",
    description:
      "Organize income, identify opportunities to increase cash flow, and strengthen earning power.",
    available: false,
    membershipTool: "IncomeLift",
    permissions: [
      "incomelift.view",
      "incomelift.manage",
    ],
  },

  {
    id: "debtdefense",
    name: "DIY Debt Defense",
    category: "Debt",
    basePath: "/debt",
    launchPath: "/debt",
    apiPrefix: "/api/debt",
    phase: "momentum",
    description:
      "Build and manage a personalized debt elimination strategy with clear progress tracking.",
    available: false,
    membershipTool: "DIY Debt Defense",
    permissions: [
      "debtdefense.view",
      "debtdefense.manage",
    ],
  },

  {
    id: "savingspro",
    name: "SavingsPro",
    category: "Savings",
    basePath: "/savings",
    launchPath: "/savings",
    apiPrefix: "/api/savings",
    phase: "momentum",
    description:
      "Set savings goals, build reserves, and create financial resilience for the future.",
    available: false,
    membershipTool: "SavingsPro",
    permissions: [
      "savingspro.view",
      "savingspro.manage",
    ],
  },

  {
    id: "steadyvest",
    name: "SteadyVest",
    category: "Investing",
    basePath: "/investing",
    launchPath: "/investing",
    apiPrefix: "/api/investing",
    phase: "legacy",
    description:
      "Build a disciplined investing strategy designed for long-term financial growth.",
    available: false,
    membershipTool: "SteadyVest",
    permissions: [
      "steadyvest.view",
      "steadyvest.manage",
    ],
  },

  {
    id: "wealthwatch",
    name: "WealthWatch",
    category: "Wealth",
    basePath: "/wealth",
    launchPath: "/wealth",
    apiPrefix: "/api/wealth",
    phase: "legacy",
    description:
      "Monitor net worth, assets, liabilities, and long-term wealth-building progress.",
    available: false,
    membershipTool: "WealthWatch",
    permissions: [
      "wealthwatch.view",
      "wealthwatch.manage",
    ],
  },

  {
    id: "felixpay",
    name: "Felix Pay / Felix CheckBook",
    category: "Payments",
    basePath: "/payments",
    launchPath: "/payments",
    apiPrefix: "/api/payments",
    phase: "control",
    description:
      "Manage payments, checkbook activity, and financial transactions across the platform.",
    available: false,
    membershipTool: "Felix Pay",
    permissions: [
      "felixpay.view",
      "felixpay.manage",
    ],
  },

  {
    id: "readiness",
    name: "Financial Readiness Test",
    category: "Readiness",
    basePath: "/readiness",
    launchPath: "/readiness",
    apiPrefix: "/api/readiness",
    phase: "platform",
    description:
      "Assess your financial readiness and identify whether your next focus is Control, Momentum, or Legacy.",
    available: false,
    membershipTool: "Financial Readiness Test",
    permissions: [
      "readiness.view",
    ],
  },
];