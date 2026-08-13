# Felix Financial Suite — SSO Integration Guide

## For Replit Agents: Complete Instructions for Connecting Any App to the Central Membership Hub

---

## OVERVIEW

Felix Pay (https://felixpay.net) is the **central membership hub** for the Felix Financial Suite. It handles:
- User authentication via Replit OAuth
- 3-tier subscription management (Control / Momentum / Legacy) via Stripe
- A membership verification API that all other apps call to check access

**Every app in the suite must:**
1. Have Replit OAuth sign-in (some already do, some need it added)
2. Call the Felix Pay verify API on login to check the user's subscription
3. Redirect users without a valid subscription to the Felix Pay membership page
4. Only grant access if the user's tier includes that specific tool

---

## ADMIN INFO

- **Admin email**: dtlnavigation@gmail.com (and felixdguide@gmail.com)
- **Central hub URL**: https://felixpay.net
- **Membership page**: https://felixpay.net/membership
- **Verify API endpoint**: `GET https://felixpay.net/api/membership/verify`

---

## THE 10 APPS AND THEIR TIERS

| # | App Name | Production URL | Required Tier | Has Replit Auth? |
|---|----------|---------------|---------------|-----------------|
| 1 | FinanceWatch | https://financewatch.app | Control | YES |
| 2 | ExpenseWatch | https://expensewatch.pro | Control | YES |
| 3 | BillWatch | https://billwatch.pro | Control | YES |
| 4 | IncomeLift | https://incomelift.co | Control | YES |
| 5 | DIY Debt | https://diydebt.org | Momentum | NO — needs setup |
| 6 | SavingsPro | https://savingspro.app | Momentum | NO — needs setup |
| 7 | SteadyVest | https://steadyvest.org | Legacy | NO — needs setup |
| 8 | WealthWatch | https://wealth-watch.app | Legacy | NO — needs setup |
| 9 | Felix Pay | https://felixpay.net | Legacy | YES (this is the hub) |
| 10 | Felix CheckBook | https://felixcheck.com | Legacy | NO — needs setup |

### Tier Access Rules
- **Control** ($24/mo): FinanceWatch, ExpenseWatch, BillWatch, IncomeLift
- **Momentum** ($39/mo): Everything in Control + DIY Debt, SavingsPro
- **Legacy** ($59/mo): All 10 tools

---

## STEP 1: SET UP REPLIT OAUTH (for apps that don't have it)

Apps that need this: **DIY Debt, SavingsPro, SteadyVest, WealthWatch, Felix CheckBook**

### 1A. Install the Replit Auth Integration

In each Replit project that needs auth, tell the agent:

> "Search for and install the Replit Auth integration using the search_integrations tool with query 'authentication'. Use the blueprint for 'log in with Replit'."

This will set up:
- OAuth routes (`/api/login`, `/api/logout`, `/api/auth/user`)
- Session management with PostgreSQL
- A `users` table with `id`, `email`, `first_name`, `last_name`, `profile_image_url`

### 1B. Ensure the Users Table Has an Email Column

The user's email is the **key identifier** used across all apps for SSO. The users table MUST store the email from Replit OAuth.

```typescript
// In your schema (shared/schema.ts or equivalent):
import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Replit user ID
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 1C. Make Sure Email Is Saved on Login

In your auth callback / upsert user logic, ensure the email from the Replit OAuth profile is saved:

```typescript
// When upserting user after OAuth callback:
const userData = {
  id: profile.id,
  email: profile.email,        // CRITICAL: must save this
  firstName: profile.firstName,
  lastName: profile.lastName,
  profileImageUrl: profile.profileImageUrl,
};
```

---

## STEP 2: ADD THE MEMBERSHIP VERIFICATION MIDDLEWARE

This is the core SSO logic. Every app calls Felix Pay's verify API to check if the logged-in user has an active subscription that includes access to that specific tool.

### 2A. Add the Secret

In each app's Replit project, add this secret:

- **Key**: `MEMBERSHIP_VERIFY_API_KEY`
- **Value**: `bc96fad68835784b208c222f3bac1ecf9ac45b8dbdc0b7708ecbf1d979792053`

This is the shared API key that authenticates requests to the Felix Pay verify endpoint.

### 2B. Create the Membership Verification Module

Create a file called `server/membership.ts` (or similar) with this exact code:

```typescript
const FELIX_PAY_URL = "https://felixpay.net";
const TOOL_NAME = "YOUR_TOOL_NAME_HERE"; // e.g., "FinanceWatch", "DIY Debt", etc.

interface MembershipVerifyResponse {
  active: boolean;
  status: string;
  tier: string | null;
  expiresAt: string | null;
  allowedTools: string[];
  hasAccess: boolean;
}

export async function verifyMembership(email: string): Promise<MembershipVerifyResponse> {
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
```

**IMPORTANT**: Replace `YOUR_TOOL_NAME_HERE` with the exact tool name from this list:
- `"FinanceWatch"`
- `"ExpenseWatch"`
- `"BillWatch"`
- `"IncomeLift"`
- `"DIY Debt"`
- `"SavingsPro"`
- `"SteadyVest"`
- `"WealthWatch"`
- `"Felix Pay"`
- `"Felix CheckBook"`

The name must match EXACTLY (case-sensitive).

### 2C. Add the Membership Check API Route

Add this route to your Express server (in `server/routes.ts` or equivalent):

```typescript
import { verifyMembership } from "./membership";

// Membership status endpoint - called by frontend on every page load
app.get("/api/membership/check", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user; // From Replit Auth
    const email = user.claims?.email || user.email;

    if (!email) {
      return res.json({
        hasAccess: false,
        reason: "no_email",
        redirectUrl: `${process.env.FELIX_PAY_URL || "https://felixpay.net"}/membership`,
      });
    }

    const result = await verifyMembership(email);

    if (!result.active || !result.hasAccess) {
      return res.json({
        hasAccess: false,
        reason: result.active ? "wrong_tier" : (result.status === "no_account" ? "no_subscription" : "expired"),
        tier: result.tier,
        requiredTier: getTierForTool(), // see below
        redirectUrl: `${process.env.FELIX_PAY_URL || "https://felixpay.net"}/membership`,
      });
    }

    res.json({
      hasAccess: true,
      tier: result.tier,
      expiresAt: result.expiresAt,
      allowedTools: result.allowedTools,
    });
  } catch (error) {
    console.error("Membership check failed:", error);
    res.json({
      hasAccess: false,
      reason: "error",
      redirectUrl: `${process.env.FELIX_PAY_URL || "https://felixpay.net"}/membership`,
    });
  }
});

function getTierForTool(): string {
  // Return the minimum tier required for THIS app
  const TOOL_NAME = "YOUR_TOOL_NAME_HERE"; // Must match the one in membership.ts
  const controlTools = ["FinanceWatch", "ExpenseWatch", "BillWatch", "IncomeLift"];
  const momentumTools = ["DIY Debt", "SavingsPro"];
  // Everything else is Legacy

  if (controlTools.includes(TOOL_NAME)) return "control";
  if (momentumTools.includes(TOOL_NAME)) return "momentum";
  return "legacy";
}
```

### 2D. Cache the Verification Result (Recommended)

To avoid calling the Felix Pay API on every single page load, cache the result for 5 minutes:

```typescript
const membershipCache = new Map<string, { result: MembershipVerifyResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function verifyMembershipCached(email: string): Promise<MembershipVerifyResponse> {
  const cached = membershipCache.get(email);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await verifyMembership(email);
  membershipCache.set(email, { result, timestamp: Date.now() });
  return result;
}
```

---

## STEP 3: ADD THE FRONTEND GATEWAY

This is the React component that checks membership on every protected page and redirects unauthorized users to Felix Pay's membership page.

### 3A. Create the MembershipGate Component

Create `client/src/components/MembershipGate.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldX, ExternalLink } from "lucide-react";

const FELIX_PAY_MEMBERSHIP_URL = "https://felixpay.net/membership";

interface MembershipCheckResponse {
  hasAccess: boolean;
  reason?: string;
  tier?: string;
  requiredTier?: string;
  redirectUrl?: string;
  expiresAt?: string;
  allowedTools?: string[];
}

export function MembershipGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery<MembershipCheckResponse>({
    queryKey: ["/api/membership/check"],
    refetchInterval: 5 * 60 * 1000, // Re-check every 5 minutes
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.hasAccess) {
    const reason = data?.reason || "error";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-8">
          <ShieldX className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-3">
            {reason === "no_subscription"
              ? "Subscription Required"
              : reason === "wrong_tier"
              ? "Plan Upgrade Needed"
              : reason === "expired"
              ? "Subscription Expired"
              : "Access Unavailable"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {reason === "no_subscription"
              ? "You need an active Felix Financial Suite subscription to use this app."
              : reason === "wrong_tier"
              ? `This app requires the ${data?.requiredTier ? data.requiredTier.charAt(0).toUpperCase() + data.requiredTier.slice(1) : ""} plan or higher. You're currently on the ${data?.tier ? data.tier.charAt(0).toUpperCase() + data.tier.slice(1) : ""} plan.`
              : reason === "expired"
              ? "Your subscription has expired. Please renew to continue using this app."
              : "Unable to verify your subscription. Please try again."}
          </p>
          <a
            href={data?.redirectUrl || FELIX_PAY_MEMBERSHIP_URL}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {reason === "wrong_tier" ? "Upgrade Plan" : reason === "expired" ? "Renew Subscription" : "View Plans"}
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-xs text-muted-foreground mt-4">
            You'll be redirected to Felix Pay to manage your subscription.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 3B. Wrap Your App Routes with the Gate

In your `App.tsx` or main router:

```tsx
import { MembershipGate } from "./components/MembershipGate";

function App() {
  const { isAuthenticated, isLoading } = useAuth(); // Your Replit auth hook

  if (isLoading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    // Show landing/login page for unauthenticated users
    return <LandingPage />;
  }

  // Authenticated users must pass the membership gate
  return (
    <MembershipGate>
      {/* Your normal app content goes here */}
      <Router>
        <Route path="/" component={Dashboard} />
        {/* ... other routes */}
      </Router>
    </MembershipGate>
  );
}
```

---

## STEP 4: THE COMPLETE FLOW (How It Works End-to-End)

```
User visits any app (e.g., https://diydebt.org)
    │
    ├─ Not logged in?
    │   └─ Show landing page → "Sign In with Replit" button
    │       └─ Replit OAuth → saves user with email → back to app
    │
    ├─ Logged in but no subscription?
    │   └─ MembershipGate shows "Subscription Required"
    │       └─ Button: "View Plans" → redirects to https://felixpay.net/membership
    │           └─ User subscribes → comes back → MembershipGate re-checks → access granted
    │
    ├─ Logged in but wrong tier?
    │   └─ MembershipGate shows "Plan Upgrade Needed"
    │       └─ Button: "Upgrade Plan" → redirects to https://felixpay.net/membership
    │
    ├─ Logged in but subscription expired?
    │   └─ MembershipGate shows "Subscription Expired"
    │       └─ Button: "Renew Subscription" → redirects to https://felixpay.net/membership
    │
    └─ Logged in with valid subscription that includes this tool?
        └─ ✅ Full access to the app
```

---

## STEP 5: ENVIRONMENT VARIABLES CHECKLIST

Every app needs these environment variables / secrets:

| Variable | Value | Purpose |
|----------|-------|---------|
| `MEMBERSHIP_VERIFY_API_KEY` | `bc96fad68835784b208c222f3bac1ecf9ac45b8dbdc0b7708ecbf1d979792053` | Authenticates requests to Felix Pay verify API |
| `FELIX_PAY_URL` | `https://felixpay.net` | Base URL for the membership hub (optional, defaults in code) |

These are set as **Secrets** in each Replit project (not plain env vars).

---

## STEP 6: TESTING CHECKLIST

After integrating, verify these scenarios:

1. **New user, no subscription**: Signs in → sees "Subscription Required" → clicks "View Plans" → goes to felixpay.net/membership
2. **User with wrong tier**: Signs in with Control plan → tries Legacy app → sees "Plan Upgrade Needed"
3. **User with correct tier**: Signs in with matching plan → full app access
4. **Expired subscription**: User's plan expires → next visit shows "Subscription Expired"
5. **Admin access**: dtlnavigation@gmail.com and felixdguide@gmail.com should always work once subscribed

---

## CRITICAL RULES

1. **DO NOT create separate auth systems** — All apps use Replit OAuth. The user signs in with the SAME Replit account (same email) across all apps.

2. **DO NOT create separate payment/subscription systems** — Felix Pay handles ALL subscriptions. Other apps only CHECK membership, they never create or modify it.

3. **DO NOT store membership data locally** — Always call the verify API. The only thing stored locally is the user profile from Replit OAuth.

4. **PRESERVE existing production data** — Do not drop tables, reset databases, or modify existing schemas destructively. Only ADD new columns or tables if needed.

5. **Email is the SSO key** — The user's email from Replit OAuth is what links them across all apps. It must be saved in every app's users table.

6. **The tool name must match EXACTLY** — When calling the verify API, the tool parameter must be one of the exact strings listed above (case-sensitive).

---

## QUICK-START TEMPLATE FOR AGENTS

Copy this prompt to give to a Replit agent for any of the 9 satellite apps:

```
I need you to integrate this app with the Felix Financial Suite SSO system.

This app is [APP_NAME] and it requires the [TIER] membership tier.

Here's what to do:
1. If this app doesn't have Replit OAuth sign-in, set it up using the Replit Auth integration
2. Make sure the users table stores the email from Replit OAuth
3. Add a secret called MEMBERSHIP_VERIFY_API_KEY with value: bc96fad68835784b208c222f3bac1ecf9ac45b8dbdc0b7708ecbf1d979792053
4. Create server/membership.ts that calls GET https://felixpay.net/api/membership/verify with the user's email and tool=[APP_NAME] as query params, authenticated with the X-API-Key header
5. Add GET /api/membership/check route that calls the verify function and returns hasAccess true/false
6. Create a MembershipGate component on the frontend that checks /api/membership/check on every page load
7. If hasAccess is false, show a block screen with a button that links to https://felixpay.net/membership
8. Wrap all protected routes with the MembershipGate

DO NOT create any subscription/payment system. Felix Pay handles all billing.
DO NOT drop or reset any existing database tables. Preserve all production data.
The admin emails are dtlnavigation@gmail.com and felixdguide@gmail.com.
```

Fill in:
- `[APP_NAME]` = exact tool name from the list (e.g., "DIY Debt", "SavingsPro")
- `[TIER]` = control, momentum, or legacy

---

## APP-SPECIFIC INSTRUCTIONS

### 1. FinanceWatch (https://financewatch.app) — Control tier
- Already has Replit Auth
- Tool name for verify API: `"FinanceWatch"`
- Add membership check middleware and frontend gate

### 2. ExpenseWatch (https://expensewatch.pro) — Control tier
- Already has Replit Auth
- Tool name for verify API: `"ExpenseWatch"`
- Add membership check middleware and frontend gate

### 3. BillWatch (https://billwatch.pro) — Control tier
- Already has Replit Auth
- Tool name for verify API: `"BillWatch"`
- Add membership check middleware and frontend gate

### 4. IncomeLift (https://incomelift.co) — Control tier
- Already has Replit Auth
- Tool name for verify API: `"IncomeLift"`
- Add membership check middleware and frontend gate

### 5. DIY Debt (https://diydebt.org) — Momentum tier
- NEEDS Replit Auth setup first
- Tool name for verify API: `"DIY Debt"`
- Full setup required: Auth + membership check + frontend gate

### 6. SavingsPro (https://savingspro.app) — Momentum tier
- NEEDS Replit Auth setup first
- Tool name for verify API: `"SavingsPro"`
- Full setup required: Auth + membership check + frontend gate

### 7. SteadyVest (https://steadyvest.org) — Legacy tier
- NEEDS Replit Auth setup first
- Tool name for verify API: `"SteadyVest"`
- Full setup required: Auth + membership check + frontend gate

### 8. WealthWatch (https://wealth-watch.app) — Legacy tier
- NEEDS Replit Auth setup first
- Tool name for verify API: `"WealthWatch"`
- Full setup required: Auth + membership check + frontend gate

### 9. Felix Pay (https://felixpay.net) — Legacy tier
- This IS the hub — already fully configured
- No changes needed

### 10. Felix CheckBook (https://felixcheck.com) — Legacy tier
- NEEDS Replit Auth setup first
- Tool name for verify API: `"Felix CheckBook"`
- Full setup required: Auth + membership check + frontend gate

---

## VERIFY API REFERENCE

### Endpoint
```
GET https://felixpay.net/api/membership/verify
```

### Headers
```
X-API-Key: bc96fad68835784b208c222f3bac1ecf9ac45b8dbdc0b7708ecbf1d979792053
```

### Query Parameters
| Param | Required | Description |
|-------|----------|-------------|
| `email` | Yes | User's email from Replit OAuth |
| `tool` | No (recommended) | Tool name to check access for |

### Response
```json
{
  "active": true,
  "status": "active",
  "tier": "momentum",
  "expiresAt": "2026-03-17T00:00:00.000Z",
  "allowedTools": ["FinanceWatch", "ExpenseWatch", "BillWatch", "IncomeLift", "DIY Debt", "SavingsPro"],
  "hasAccess": true
}
```

### Response Fields (Always Present)
| Field | Type | Description |
|-------|------|-------------|
| `active` | boolean | Whether the user has an active/trialing subscription |
| `status` | string | `"active"`, `"trialing"`, `"canceled"`, `"past_due"`, `"inactive"`, or `"no_account"` |
| `tier` | string or null | `"control"`, `"momentum"`, `"legacy"`, or `null` if not active |
| `expiresAt` | string or null | ISO date when current period ends, or `null` |
| `allowedTools` | string[] | Array of tool names the user can access (empty if not active) |
| `hasAccess` | boolean | Whether the user can access the specific tool requested (or just `active` if no tool param) |

### Possible Responses
| Scenario | active | status | hasAccess |
|----------|--------|--------|-----------|
| Valid subscription, tool included | `true` | `"active"` | `true` |
| Valid subscription, tool NOT included (wrong tier) | `true` | `"active"` | `false` |
| On free trial, tool included | `true` | `"trialing"` | `true` |
| On free trial, tool NOT included | `true` | `"trialing"` | `false` |
| Subscription canceled/expired | `false` | `"canceled"` | `false` |
| Payment failed | `false` | `"past_due"` | `false` |
| No account at Felix Pay | `false` | `"no_account"` | `false` |
