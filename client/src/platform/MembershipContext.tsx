import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

export interface PlatformMembership {
  hasAccess: boolean;
  tier: string | null;
  expiresAt: string | null;
  allowedTools: string[];
}

interface MembershipContextValue {
  membership: PlatformMembership | null;
  loading: boolean;
  error: string | null;

  hasToolAccess: (tool?: string | null) => boolean;

  refreshMembership: () => Promise<void>;
}

const MembershipContext =
  createContext<MembershipContextValue | null>(null);

export function FinancialOSMembershipProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isLoaded,
    isSignedIn,
  } = useUser();

  const { getToken } = useAuth();

  const [membership, setMembership] =
    useState<PlatformMembership | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const refreshMembership =
    useCallback(async () => {
      if (!isLoaded || !isSignedIn) {
        setMembership(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();

        const response = await fetch(
          "/api/membership/check",
          {
            credentials: "include",

            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {},
          },
        );

        if (!response.ok) {
          const text =
            await response.text();

          throw new Error(
            text ||
              `Membership check failed with ${response.status}`,
          );
        }

        const data =
          await response.json();

        setMembership({
          hasAccess:
            Boolean(data?.hasAccess),

          tier:
            data?.tier ?? null,

          expiresAt:
            data?.expiresAt ?? null,

          allowedTools:
            Array.isArray(
              data?.allowedTools,
            )
              ? data.allowedTools
              : [],
        });
      } catch (err) {
        console.error(
          "[financial-os-membership]",
          err,
        );

        setMembership(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify membership",
        );
      } finally {
        setLoading(false);
      }
    }, [
      getToken,
      isLoaded,
      isSignedIn,
    ]);

  useEffect(() => {
    void refreshMembership();
  }, [refreshMembership]);

  const hasToolAccess =
    useCallback(
      (tool?: string | null) => {
        if (!tool) {
          return true;
        }

        if (!membership?.hasAccess) {
          return false;
        }

        return membership.allowedTools.includes(
          tool,
        );
      },
      [membership],
    );

  const value =
    useMemo<MembershipContextValue>(
      () => ({
        membership,
        loading,
        error,
        hasToolAccess,
        refreshMembership,
      }),
      [
        membership,
        loading,
        error,
        hasToolAccess,
        refreshMembership,
      ],
    );

  return (
    <MembershipContext.Provider
      value={value}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useFinancialOSMembership() {
  const context =
    useContext(MembershipContext);

  if (!context) {
    throw new Error(
      "useFinancialOSMembership must be used inside FinancialOSMembershipProvider",
    );
  }

  return context;
}