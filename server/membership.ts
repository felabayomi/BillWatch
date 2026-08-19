const MEMBERSHIP_API_URL = (
  process.env.MEMBERSHIP_API_URL ||
  "https://www.felixpay.online"
).replace(/\/$/, "");

const TOOL_NAME = "BillWatch";

type MembershipTier =
  | "control"
  | "momentum"
  | "legacy";

interface MembershipVerifyResponse {
  active: boolean;
  status: string;
  tier: string | null;
  expiresAt: string | null;
  allowedTools: string[];
  hasAccess: boolean;
}

const CONTROL_TOOLS = [
  "FinanceWatch",
  "ExpenseWatch",
  "BillWatch",
  "IncomeLift",
];

const MOMENTUM_TOOLS = [
  ...CONTROL_TOOLS,
  "DIY Debt Defense",
  "SavingsPro",
];

const LEGACY_TOOLS = [
  ...MOMENTUM_TOOLS,
  "SteadyVest",
  "WealthWatch",
  "Felix Pay",
  "Felix CheckBook",
];

const membershipCache = new Map<
  string,
  {
    result: MembershipVerifyResponse;
    timestamp: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000;

export function isAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) {
    return false;
  }

  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(
    email.trim().toLowerCase(),
  );
}

function normalizeTier(
  tier: string | null | undefined,
): MembershipTier | null {
  if (!tier) {
    return null;
  }

  const normalized =
    tier.trim().toLowerCase();

  if (normalized === "control") {
    return "control";
  }

  if (normalized === "momentum") {
    return "momentum";
  }

  if (normalized === "legacy") {
    return "legacy";
  }

  return null;
}

export function getAllowedToolsForTier(
  tier: string | null | undefined,
): string[] {
  const normalizedTier =
    normalizeTier(tier);

  switch (normalizedTier) {
    case "control":
      return [...CONTROL_TOOLS];

    case "momentum":
      return [...MOMENTUM_TOOLS];

    case "legacy":
      return [...LEGACY_TOOLS];

    default:
      return [];
  }
}

function normalizeMembershipResult(
  result: MembershipVerifyResponse,
): MembershipVerifyResponse {
  const normalizedTier =
    normalizeTier(result.tier);

  // If the membership service recognizes a real
  // Control/Momentum/Legacy subscription, the OS
  // derives the complete cumulative entitlement
  // list from that tier.
  const tierTools =
    getAllowedToolsForTier(normalizedTier);

  return {
    ...result,

    tier: normalizedTier,

    allowedTools:
      result.active &&
      normalizedTier
        ? tierTools
        : result.allowedTools ?? [],

    hasAccess:
      Boolean(result.active) &&
      Boolean(result.hasAccess),
  };
}

function getAdminFallback():
  MembershipVerifyResponse {
  return {
    active: true,
    status: "active",
    tier: "legacy",
    expiresAt: null,
    allowedTools: [...LEGACY_TOOLS],
    hasAccess: true,
  };
}

async function verifyMembership(
  email: string,
): Promise<MembershipVerifyResponse> {
  const apiKey =
    process.env.MEMBERSHIP_VERIFY_API_KEY;

  /*
   * IMPORTANT:
   *
   * Admin accounts are no longer automatically
   * forced to CONTROL/BillWatch.
   *
   * When Felix Pay membership verification is
   * configured, we ask the real membership service
   * first so an actual Legacy subscription remains
   * Legacy.
   */
  if (!apiKey) {
    if (isAdminEmail(email)) {
      console.warn(
        "[membership] Verification API not configured; using full admin fallback access",
      );

      return getAdminFallback();
    }

    console.error(
      "MEMBERSHIP_VERIFY_API_KEY not configured",
    );

    throw new Error(
      "MEMBERSHIP_VERIFY_API_KEY not configured",
    );
  }

  const url =
    `${MEMBERSHIP_API_URL}` +
    `/api/membership/verify` +
    `?email=${encodeURIComponent(email)}` +
    `&tool=${encodeURIComponent(TOOL_NAME)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Membership verification failed: ${response.status}`,
      );
    }

    const result =
      (await response.json()) as MembershipVerifyResponse;

    return normalizeMembershipResult(
      result,
    );
  } catch (error) {
    /*
     * Admin fallback exists only so a temporary
     * membership-service outage/configuration issue
     * does not lock platform administrators out.
     *
     * It does NOT override a successful real
     * membership response.
     */
    if (isAdminEmail(email)) {
      console.error(
        "[membership] Verification failed for admin; using full fallback access",
        error,
      );

      return getAdminFallback();
    }

    throw error;
  }
}

export async function verifyMembershipCached(
  email: string,
): Promise<MembershipVerifyResponse> {
  const cacheKey =
    email.toLowerCase();

  const cached =
    membershipCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.timestamp <
      CACHE_TTL
  ) {
    return cached.result;
  }

  const result =
    await verifyMembership(email);

  membershipCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  return result;
}

export function clearMembershipCache(
  email?: string,
): void {
  if (email) {
    membershipCache.delete(
      email.toLowerCase(),
    );

    return;
  }

  membershipCache.clear();
}

export function getTierForTool(): string {
  // BillWatch belongs to CONTROL.
  // This function is kept for compatibility with
  // the existing BillWatch route code.
  return "control";
}

export function getMembershipPortalUrl(): string {
  return "https://www.felixpay.online/membership";
}