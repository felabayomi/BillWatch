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
    refetchInterval: 5 * 60 * 1000,
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
