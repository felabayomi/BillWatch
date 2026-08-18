import { useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  LockKeyhole,
  LogIn,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { platformApps } from "../../../platform/app-registry";
import type {
  FinancialPhase,
  PlatformAppManifest,
} from "../../../platform/app-registry/types";

import { useFinancialOSMembership } from "./MembershipContext";

const phaseContent: Record<
  Exclude<FinancialPhase, "platform">,
  {
    title: string;
    verb: string;
    subtitle: string;
    color: string;
  }
> = {
  control: {
    title: "CONTROL",
    verb: "Stabilize",
    subtitle:
      "Build visibility, structure, and control over your financial life.",
    color: "from-blue-600 to-cyan-500",
  },

  momentum: {
    title: "MOMENTUM",
    verb: "Eliminate",
    subtitle:
      "Reduce financial friction and accelerate forward progress.",
    color: "from-violet-600 to-fuchsia-500",
  },

  legacy: {
    title: "LEGACY",
    verb: "Build",
    subtitle:
      "Turn financial stability into lasting wealth and opportunity.",
    color: "from-amber-500 to-orange-500",
  },
};

function getToolIcon(app: PlatformAppManifest) {
  switch (app.id) {
    case "finance":
      return WalletCards;

    case "expensewatch":
      return ReceiptText;

    case "billwatch":
      return CreditCard;

    case "incomelift":
      return Banknote;

    case "debtdefense":
      return ShieldCheck;

    case "savingspro":
      return PiggyBank;

    case "steadyvest":
      return TrendingUp;

    case "wealthwatch":
      return Landmark;

    case "felixpay":
      return CircleDollarSign;

    case "readiness":
      return BarChart3;

    default:
      return Building2;
  }
}

function phaseApps(phase: FinancialPhase) {
  return platformApps.filter(
    (app) => app.phase === phase,
  );
}

function ToolCard({
  app,
  allowedTools,
  membershipLoading,
  onLaunch,
}: {
  app: PlatformAppManifest;
  allowedTools: string[];
  membershipLoading: boolean;
  onLaunch: (
    app: PlatformAppManifest,
  ) => void;
}) {
  const Icon = getToolIcon(app);

  const membershipAllowed =
    !app.membershipTool ||
    allowedTools.includes(
      app.membershipTool,
    );

  const canLaunch =
    app.available &&
    membershipAllowed &&
    !membershipLoading;

  let statusText = "Coming soon";

  if (membershipLoading && app.available) {
    statusText = "Checking access...";
  } else if (canLaunch) {
    statusText = "Open";
  } else if (
    app.available &&
    !membershipAllowed
  ) {
    statusText = "Upgrade required";
  }

  return (
    <button
      type="button"
      disabled={!canLaunch}
      onClick={() => {
        if (canLaunch) {
          onLaunch(app);
        }
      }}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border bg-white p-5 text-left",
        "shadow-sm transition-all duration-200",
        canLaunch
          ? "hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
          : "cursor-default opacity-75",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </div>

        {canLaunch ? (
          <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-950" />
        ) : (
          <LockKeyhole className="h-5 w-5 text-slate-400" />
        )}
      </div>

      <div className="mt-5">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          {app.category}
        </div>

        <h3 className="mt-1 text-xl font-semibold text-slate-950">
          {app.name}
        </h3>

        <p className="mt-2 min-h-[60px] text-sm leading-6 text-slate-600">
          {app.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            canLaunch
              ? "bg-emerald-50 text-emerald-700"
              : app.available &&
                  !membershipAllowed
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {statusText}
        </span>
      </div>
    </button>
  );
}

export default function PlatformHome() {
  const [, navigate] = useLocation();

  const {
    isLoaded,
    isSignedIn,
    user,
  } = useUser();

  const {
    membership,
    loading: membershipLoading,
    error: membershipError,
  } = useFinancialOSMembership();

  const allowedTools = useMemo(
    () => membership?.allowedTools ?? [],
    [membership],
  );

  const firstName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress
      ?.emailAddress ||
    "there";

  const launchApp = (
    app: PlatformAppManifest,
  ) => {
    navigate(app.launchPath);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-sm text-slate-300">
          Loading Financial OS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-white/10 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <div className="text-lg font-semibold">
                Debt to Legacy
              </div>

              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Financial OS
              </div>
            </div>
          </div>

          {!isSignedIn ? (
            <button
              type="button"
              onClick={() =>
                navigate("/sign-in")
              }
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          ) : (
            <div className="text-right">
              <div className="text-sm font-semibold">
                {firstName}
              </div>

              <div className="text-xs text-slate-400">
                {membershipLoading
                  ? "Checking membership..."
                  : membership?.tier
                    ? `${membership.tier.toUpperCase()} member`
                    : "Financial OS member"}
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950 px-6 pb-20 pt-16 text-white lg:px-8">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute left-[-10%] top-[-30%] h-[420px] w-[420px] rounded-full bg-blue-600 blur-[120px]" />

            <div className="absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-violet-600 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <BadgeDollarSign className="h-4 w-4" />
                Your financial journey. One operating system.
              </div>

              <h1 className="mt-7 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                From debt to legacy,

                <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-amber-300 bg-clip-text text-transparent">
                  run your financial life
                  from one OS.
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                One financial operating
                system with specialized tools
                for every stage of the journey
                from debt to legacy.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {(
                [
                  "control",
                  "momentum",
                  "legacy",
                ] as const
              ).map((phase) => {
                const content =
                  phaseContent[phase];

                return (
                  <div
                    key={phase}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur"
                  >
                    <div
                      className={`inline-flex rounded-full bg-gradient-to-r ${content.color} px-3 py-1 text-xs font-bold tracking-[0.15em] text-white`}
                    >
                      {content.title}
                    </div>

                    <div className="mt-4 text-2xl font-semibold">
                      {content.verb}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {content.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {!isSignedIn ? (
          <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <div className="rounded-3xl border bg-white p-8 shadow-sm md:p-12">
              <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">
                    Your Financial OS
                  </div>

                  <h2 className="mt-3 text-3xl font-bold tracking-tight">
                    Specialized tools. One
                    financial identity.
                  </h2>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Sign in once to access
                    your financial tools,
                    readiness phase,
                    accounts, bills,
                    spending, savings, debt,
                    investing, and
                    wealth-building systems.
                  </p>
                </div>

                <div className="flex md:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/sign-in")
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800"
                  >
                    Sign in to Financial OS
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                  Welcome back
                </div>

                <h2 className="mt-1 text-3xl font-bold">
                  {firstName}, your Financial OS
                  is ready.
                </h2>
              </div>

              {membership?.hasAccess && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />

                  {membership.tier?.toUpperCase() ||
                    "ACTIVE"}{" "}
                  access
                </div>
              )}
            </div>

            {membershipError && (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Membership could not be
                verified right now. Your tools
                may show limited access.
              </div>
            )}

            {(
              [
                "control",
                "momentum",
                "legacy",
              ] as const
            ).map((phase) => {
              const content =
                phaseContent[phase];

              const apps =
                phaseApps(phase);

              return (
                <div
                  key={phase}
                  className="mb-12"
                >
                  <div className="mb-5 flex items-center gap-4">
                    <div
                      className={`h-11 w-1.5 rounded-full bg-gradient-to-b ${content.color}`}
                    />

                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        {content.title}
                      </div>

                      <h3 className="text-2xl font-semibold">
                        {content.verb}
                      </h3>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {apps.map((app) => (
                      <ToolCard
                        key={app.id}
                        app={app}
                        allowedTools={
                          allowedTools
                        }
                        membershipLoading={
                          membershipLoading
                        }
                        onLaunch={
                          launchApp
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mb-14">
              <div className="mb-5 flex items-center gap-4">
                <div className="h-11 w-1.5 rounded-full bg-gradient-to-b from-slate-700 to-slate-400" />

                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    YOUR ROADMAP
                  </div>

                  <h3 className="text-2xl font-semibold">
                    Financial Readiness Test
                  </h3>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {phaseApps("platform").map(
                  (app) => (
                    <ToolCard
                      key={app.id}
                      app={app}
                      allowedTools={
                        allowedTools
                      }
                      membershipLoading={
                        membershipLoading
                      }
                      onLaunch={
                        launchApp
                      }
                    />
                  ),
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="font-semibold text-slate-700">
            Debt to Legacy Financial OS
          </div>

          <div>
            CONTROL → MOMENTUM → LEGACY
          </div>
        </div>
      </footer>
    </div>
  );
}