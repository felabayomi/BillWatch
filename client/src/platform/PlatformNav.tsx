import { useState } from "react";
import {
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import { useLocation } from "wouter";
import {
  ChevronDown,
  Home,
  LayoutGrid,
  LockKeyhole,
  LogIn,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";

import { platformApps } from "../../../platform/app-registry";
import type { PlatformAppManifest } from "../../../platform/app-registry/types";
import { useFinancialOSMembership } from "./MembershipContext";

function getCurrentApp(
  pathname: string,
): PlatformAppManifest | null {
  if (pathname.startsWith("/finance")) {
    return (
      platformApps.find(
        (app) => app.id === "finance",
      ) ?? null
    );
  }

  const billWatchPaths = [
  "/bills",
];

  if (
    billWatchPaths.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`),
    )
  ) {
    return (
      platformApps.find(
        (app) => app.id === "billwatch",
      ) ?? null
    );
  }

  return null;
}

function AppIcon({
  appId,
  className = "h-4 w-4",
}: {
  appId: string;
  className?: string;
}) {
  if (appId === "finance") {
    return (
      <WalletCards className={className} />
    );
  }

  if (appId === "billwatch") {
    return (
      <ReceiptText className={className} />
    );
  }

  return (
    <LayoutGrid className={className} />
  );
}

export default function PlatformNav() {
  const [location, navigate] =
    useLocation();

  const {
    user,
    isSignedIn,
  } = useUser();

  const { signOut } = useClerk();

  const {
    membership,
    loading: membershipLoading,
    hasToolAccess,
  } = useFinancialOSMembership();

  const [open, setOpen] =
    useState(false);

  const currentApp =
    getCurrentApp(location);

  const visibleApps =
    platformApps.filter(
      (app) => app.phase !== "platform",
    );

  const firstName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress
      ?.emailAddress ||
    "";

  function canAccessApp(
    app: PlatformAppManifest,
  ) {
    if (!app.available) {
      return false;
    }

    return hasToolAccess(
      app.membershipTool,
    );
  }

  function launchApp(
    app: PlatformAppManifest,
  ) {
    if (!canAccessApp(app)) {
      return;
    }

    setOpen(false);

    if (location !== app.launchPath) {
      navigate(app.launchPath);
    }
  }

  async function handleSignOut() {
    setOpen(false);

    await signOut();

    navigate("/");
  }

  return (
    <div className="sticky top-0 z-[100] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full items-center gap-2 px-3 sm:px-4">

        {/* Financial OS Home */}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate("/");
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
          aria-label="Financial OS Home"
          title="Debt to Legacy Financial OS Home"
        >
          <Home className="h-5 w-5" />
        </button>

        {/* App switcher */}
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() =>
              setOpen((value) => !value)
            }
            className="flex h-10 max-w-[250px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:bg-slate-50 sm:max-w-[320px]"
            aria-expanded={open}
            aria-label="Switch Financial OS application"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
              {currentApp ? (
                <AppIcon
                  appId={currentApp.id}
                />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                Financial OS
              </div>

              <div className="truncate text-sm font-semibold text-slate-900">
                {currentApp?.name ??
                  "Applications"}
              </div>
            </div>

            {open ? (
              <X className="h-4 w-4 shrink-0 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            )}
          </button>

          {open && (
            <>
              <button
                type="button"
                aria-label="Close app switcher"
                onClick={() =>
                  setOpen(false)
                }
                className="fixed inset-0 z-[101] cursor-default bg-transparent"
              />

              <div className="absolute left-0 top-12 z-[102] w-[310px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">

                <div className="px-3 pb-2 pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Debt to Legacy
                  </div>

                  <div className="text-sm font-semibold text-slate-900">
                    Financial Applications
                  </div>

                  {membershipLoading ? (
                    <div className="mt-1 text-xs text-slate-400">
                      Checking membership...
                    </div>
                  ) : membership?.tier ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {membership.tier.toUpperCase()}{" "}
                      membership
                    </div>
                  ) : null}
                </div>

                <div className="max-h-[420px] space-y-1 overflow-auto">
                  {visibleApps.map(
                    (app) => {
                      const active =
                        currentApp?.id ===
                        app.id;

                      const accessible =
                        canAccessApp(app);

                      return (
                        <button
                          key={app.id}
                          type="button"
                          disabled={
                            !accessible
                          }
                          onClick={() =>
                            launchApp(app)
                          }
                          className={[
                            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                            active
                              ? "bg-slate-950 text-white"
                              : accessible
                                ? "text-slate-700 hover:bg-slate-100"
                                : "cursor-default text-slate-400 opacity-70",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                              active
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-700",
                            ].join(" ")}
                          >
                            <AppIcon
                              appId={
                                app.id
                              }
                              className="h-4 w-4"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] opacity-60">
                              {
                                app.category
                              }
                            </div>

                            <div className="truncate text-sm font-semibold">
                              {app.name}
                            </div>

                            <div className="mt-0.5 text-[10px]">
                              {accessible
                                ? active
                                  ? "Current app"
                                  : "Open"
                                : app.available
                                  ? "Upgrade required"
                                  : "Coming soon"}
                            </div>
                          </div>

                          {!accessible && (
                            <LockKeyhole className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="mt-2 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate("/");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-700 transition hover:bg-slate-100"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <Home className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                        Command Center
                      </div>

                      <div className="text-sm font-semibold">
                        Financial OS Home
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1" />

        {/* User controls */}
        {isSignedIn ? (
          <div className="flex items-center gap-2">
            {firstName && (
              <div className="hidden min-w-0 text-right sm:block">
                <div className="truncate text-xs font-semibold text-slate-800">
                  {firstName}
                </div>

                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  {membership?.tier
                    ? `${membership.tier} member`
                    : "Debt to Legacy"}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              navigate("/sign-in")
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}