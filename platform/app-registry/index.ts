import { billWatchManifest } from "../../apps/billwatch/manifest";
import { financeManifest } from "../../apps/finance/manifest";

export const platformApps = [
  billWatchManifest,
  financeManifest,
];

export function getPlatformApp(id: string) {
  return platformApps.find((app) => app.id === id);
}
