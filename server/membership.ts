const MEMBERSHIP_API_URL = (process.env.MEMBERSHIP_API_URL || "https://www.felixpay.online").replace(/\/$/, "");
const TOOL_NAME = "BillWatch";

const ADMIN_EMAILS = [
  "dtlnavigation@gmail.com",
  "felixdguide@gmail.com",
];

interface MembershipVerifyResponse {
  active: boolean;
  status: string;
  tier: string | null;
  expiresAt: string | null;
  allowedTools: string[];
  hasAccess: boolean;
}

const membershipCache = new Map<string, { result: MembershipVerifyResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

async function verifyMembership(email: string): Promise<MembershipVerifyResponse> {
  if (isAdminEmail(email)) {
    return {
      active: true,
      status: "active",
      tier: "control",
      expiresAt: null,
      allowedTools: [TOOL_NAME],
      hasAccess: true,
    };
  }

  const apiKey = process.env.MEMBERSHIP_VERIFY_API_KEY;
  if (!apiKey) {
    console.error("MEMBERSHIP_VERIFY_API_KEY not configured - admin emails still have access");
    throw new Error("MEMBERSHIP_VERIFY_API_KEY not configured");
  }

  const url = `${MEMBERSHIP_API_URL}/api/membership/verify?email=${encodeURIComponent(email)}&tool=${encodeURIComponent(TOOL_NAME)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Membership verification failed: ${response.status}`);
  }

  return response.json();
}

export async function verifyMembershipCached(email: string): Promise<MembershipVerifyResponse> {
  const cached = membershipCache.get(email);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await verifyMembership(email);
  membershipCache.set(email, { result, timestamp: Date.now() });
  return result;
}

export function getTierForTool(): string {
  const controlTools = ["FinanceWatch", "ExpenseWatch", "BillWatch", "IncomeLift"];
  const momentumTools = ["DIY Debt", "SavingsPro"];

  if (controlTools.includes(TOOL_NAME)) return "control";
  if (momentumTools.includes(TOOL_NAME)) return "momentum";
  return "legacy";
}

export function getMembershipPortalUrl(): string {
  return "https://www.felixpay.online/membership";
}
