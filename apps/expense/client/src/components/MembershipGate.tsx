import { useQuery } from "@tanstack/react-query";
import { Shield, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@expense/components/ui/button";
import { Card, CardContent } from "@expense/components/ui/card";

interface MembershipCheckResponse {
  hasAccess: boolean;
  reason?: string;
  message?: string;
  buttonText?: string;
  tier?: string | null;
  status?: string;
  expiresAt?: string | null;
  redirectUrl?: string;
}

export function MembershipGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery<MembershipCheckResponse>({
    queryKey: ["/api/membership/check"],
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <BlockScreen
        message="Unable to verify your subscription. Please try again later."
        buttonText="Try Again"
        redirectUrl="https://felixpay.net/membership"
      />
    );
  }

  if (data?.hasAccess) {
    return <>{children}</>;
  }

  return (
    <BlockScreen
      message={data?.message || "A subscription is required to use ExpenseWatch."}
      buttonText={data?.buttonText || "View Plans"}
      redirectUrl={data?.redirectUrl || "https://felixpay.net/membership"}
      reason={data?.reason}
    />
  );
}

function BlockScreen({
  message,
  buttonText,
  redirectUrl,
  reason,
}: {
  message: string;
  buttonText: string;
  redirectUrl: string;
  reason?: string;
}) {
  const getTitle = () => {
    switch (reason) {
      case "wrong_tier":
        return "Plan Upgrade Needed";
      case "expired":
        return "Subscription Expired";
      default:
        return "Subscription Required";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{getTitle()}</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => window.open(redirectUrl, "_blank")}
            >
              {buttonText}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground">
              ExpenseWatch is part of the{" "}
              <a
                href="https://felixpay.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Felix Financial Suite
              </a>
              . Manage your subscription at Felix Pay.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
