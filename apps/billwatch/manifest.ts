import type { PlatformAppManifest } from "../../platform/app-registry/types";

export const billWatchManifest: PlatformAppManifest = {
  id: "billwatch",
  name: "BillWatch",
  basePath: "/bills",
  apiPrefix: "/api/bills",
  description: "Bill tracking, scanning, payments, reminders, and reporting.",
  permissions: [
    "billwatch.view",
    "billwatch.manage",
    "billwatch.pay",
  ],
};
