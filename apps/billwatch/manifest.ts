import type { PlatformAppManifest } from "../../platform/app-registry/types";

export const billWatchManifest: PlatformAppManifest = {
  id: "billwatch",
  name: "BillWatch",
  category: "Bills",

  // Long-term standardized route.
  basePath: "/bills",

  // Current working route. We will migrate /app to /bills later.
launchPath: "/bills",

  apiPrefix: "/api/bills",

  phase: "control",

  description:
    "Track, scan, organize, manage, and pay bills without missing important due dates.",

  available: true,

  membershipTool: "BillWatch",

  permissions: [
    "billwatch.view",
    "billwatch.manage",
    "billwatch.pay",
  ],
};