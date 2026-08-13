import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface CleanupSettings {
  enabled: boolean;
  action: 'delete' | 'archive';
  delayDays: number;
}

export interface CleanupPreview {
  count: number;
  totalAmount: number;
  oldestBill: Date | null;
  taxProtection?: {
    protectedYear: number;
    safeDate: string;
    explanation: string;
  };
}

export interface CleanupResult {
  processed: number;
  archived: number;
  deleted: number;
}

export function useCleanupPreview(settings: CleanupSettings) {
  return useQuery({
    queryKey: ['cleanup-preview', settings],
    queryFn: async () => {
      const res = await apiRequest('POST', '/api/cleanup/preview', settings);
      return res.json();
    },
    enabled: settings.enabled,
  });
}

export function useProcessCleanup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: CleanupSettings) => {
      const res = await apiRequest('POST', '/api/cleanup/process', settings);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate bill queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills/stats'] });
    },
  });
}

export function useArchivedBills(userId: string) {
  return useQuery({
    queryKey: ['archived-bills', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/archived-bills/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useRestoreArchivedBills() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (billIds: string[]) => {
      const res = await apiRequest('POST', '/api/archived-bills/restore', { billIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['archived-bills'] });
    },
  });
}

export function useDeleteArchivedBills() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (billIds: string[]) => {
      const res = await apiRequest('DELETE', '/api/archived-bills', { billIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-bills'] });
    },
  });
}