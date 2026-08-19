const FELIX_PAY_URL = process.env.FELIX_PAY_URL || "https://felixpay.net";
const MEMBERSHIP_VERIFY_API_KEY = process.env.MEMBERSHIP_VERIFY_API_KEY;
const TOOL_NAME = "ExpenseWatch";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface MembershipResponse {
  active: boolean;
  status: string;
  tier: string | null;
  expiresAt: string | null;
  allowedTools: string[];
  hasAccess: boolean;
}

interface CachedResult {
  data: MembershipResponse;
  timestamp: number;
}

const cache = new Map<string, CachedResult>();

export async function verifyMembership(email: string): Promise<MembershipResponse> {
  const cached = cache.get(email);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!MEMBERSHIP_VERIFY_API_KEY) {
    console.error("MEMBERSHIP_VERIFY_API_KEY is not set");
    return {
      active: false,
      status: "error",
      tier: null,
      expiresAt: null,
      allowedTools: [],
      hasAccess: false,
    };
  }

  try {
    const url = new URL("/api/membership/verify", FELIX_PAY_URL);
    url.searchParams.set("email", email);
    url.searchParams.set("tool", TOOL_NAME);

    const response = await fetch(url.toString(), {
      headers: {
        "X-API-Key": MEMBERSHIP_VERIFY_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Felix Pay verify API returned ${response.status}`);
      return {
        active: false,
        status: "error",
        tier: null,
        expiresAt: null,
        allowedTools: [],
        hasAccess: false,
      };
    }

    const data: MembershipResponse = await response.json();

    cache.set(email, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error("Error verifying membership with Felix Pay:", error);
    return {
      active: false,
      status: "error",
      tier: null,
      expiresAt: null,
      allowedTools: [],
      hasAccess: false,
    };
  }
}

export function clearMembershipCache(email?: string) {
  if (email) {
    cache.delete(email);
  } else {
    cache.clear();
  }
}
