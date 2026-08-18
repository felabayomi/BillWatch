import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@finance/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnMount: true,
  });

  // If there's a 401 error, we're not loading anymore and user is not authenticated
  const isAuthenticated = !!user && !error;
  
  // Only consider loading if we haven't received any response yet (no user and no error)
  const actuallyLoading = isLoading && !user && !error;


  return {
    user,
    isLoading: actuallyLoading,
    isAuthenticated,
  };
}
