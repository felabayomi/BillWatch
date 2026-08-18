import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { useFinancialOSMembership } from "./MembershipContext";

interface ToolAccessGateProps {
  tool: string;
  children: ReactNode;
}

export default function ToolAccessGate({
  tool,
  children,
}: ToolAccessGateProps) {
  const [, navigate] = useLocation();

  const {
    membership,
    loading,
    hasToolAccess,
  } = useFinancialOSMembership();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-slate-500">
          Checking access...
        </div>
      </div>
    );
  }

  const allowed = hasToolAccess(tool);

  if (!allowed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <LockKeyhole className="h-6 w-6 text-slate-700" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-950">
            This tool is not included in your current plan
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your current membership is{" "}
            <strong>
              {membership?.tier?.toUpperCase() || "UNKNOWN"}
            </strong>
            . Upgrade your Debt to Legacy membership to unlock this application.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Financial OS Home
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "https://www.felixpay.online/membership";
              }}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View Membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}