import { billWatchManifest } from "../../apps/billwatch/manifest";
import { financeManifest } from "../../apps/finance/manifest";
import { platformCatalog } from "./catalog";
import type { FinancialPhase, PlatformAppManifest } from "./types";

export const platformApps: PlatformAppManifest[] = [
  financeManifest,
  ...platformCatalog.filter((app) => app.id === "expensewatch"),
  billWatchManifest,
  ...platformCatalog.filter((app) => app.id === "incomelift"),
  ...platformCatalog.filter((app) => app.id === "debtdefense"),
  ...platformCatalog.filter((app) => app.id === "savingspro"),
  ...platformCatalog.filter((app) => app.id === "steadyvest"),
  ...platformCatalog.filter((app) => app.id === "wealthwatch"),
  ...platformCatalog.filter((app) => app.id === "felixpay"),
  ...platformCatalog.filter((app) => app.id === "readiness"),
];

export function getPlatformApp(id: string) {
  return platformApps.find((app) => app.id === id);
}

export function getAppsByPhase(phase: FinancialPhase) {
  return platformApps.filter((app) => app.phase === phase);
}

export function getAvailableApps() {
  return platformApps.filter((app) => app.available);
}