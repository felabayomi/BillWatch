export type FinancialPhase =
  | "control"
  | "momentum"
  | "legacy"
  | "platform";

export interface PlatformAppManifest {
  id: string;

  /**
   * Product name shown to the user.
   * Example: BillWatch
   */
  name: string;

  /**
   * Financial OS category.
   * Example: Bills
   */
  category: string;

  /**
   * Long-term route namespace.
   * Example: /bills
   */
  basePath: string;

  /**
   * Current working route used to open the app.
   *
   * BillWatch still uses /app today, while its eventual
   * standardized route will be /bills.
   */
  launchPath: string;

  /**
   * Backend API namespace.
   */
  apiPrefix: string;

  /**
   * CONTROL → MOMENTUM → LEGACY
   */
  phase: FinancialPhase;

  description: string;

  /**
   * Whether the application is currently mounted in the OS.
   */
  available: boolean;

  /**
   * Name expected from the membership service when
   * per-tool authorization is enabled.
   */
  membershipTool?: string;

  permissions?: string[];
}