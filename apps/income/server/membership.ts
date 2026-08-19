const FELIX_PAY_URL = "https://felixpay.net";
const TOOL_NAME = "IncomeLift";

interface MembershipVerifyResponse {
  active: boolean;
  status: string;
  tier: string | null;
  expiresAt: string | null;
  allowedTools: string[];
  hasAccess: boolean;
}

async function verifyMembership(email: string): Promise<MembershipVerifyResponse> {
  const apiKey = process.env.MEMBERSHIP_VERIFY_API_KEY;
  if (!apiKey) {
    throw new Error("MEMBERSHIP_VERIFY_API_KEY not configured");
  }

  const url = `${FELIX_PAY_URL}/api/membership/verify?email=${encodeURIComponent(email)}&tool=${encodeURIComponent(TOOL_NAME)}`;

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

const membershipCache = new Map<string, { result: MembershipVerifyResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

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
