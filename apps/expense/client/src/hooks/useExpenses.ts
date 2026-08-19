import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@expense/lib/queryClient";
import type { Expense, InsertExpense, Draft, InsertDraft, Budget, InsertBudget, Category, InsertCategory } from "@expense-shared/schema";
import { useToast } from "@expense/hooks/use-toast";
import { isUnauthorizedError } from "@expense/lib/authUtils";
import { useEffect } from "react";

// Type definition for expense statistics
type ExpenseStats = {
  total: number;
  categoryBreakdown: Record<string, number>;
  dailySpending: Record<string, number>;
};

export function useExpenses(filters?: {
  month?: number;
  year?: number;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams();
  if (filters?.month) queryParams.append("month", filters.month.toString());
  if (filters?.year) queryParams.append("year", filters.year.toString());
  if (filters?.category) queryParams.append("category", filters.category);
  if (filters?.startDate) queryParams.append("startDate", filters.startDate.toISOString());
  if (filters?.endDate) queryParams.append("endDate", filters.endDate.toISOString());
  if (filters?.search) queryParams.append("search", filters.search);
  
  const queryString = queryParams.toString();
  const queryKey = queryString ? [`/api/expense/expenses?${queryString}`] : ["/api/expense/expenses"];

  const query = useQuery<Expense[]>({
    queryKey,
    retry: false,
  });

  // Handle errors with useEffect for TanStack Query v5
  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [query.error, toast]);

  return query;
}

export function useExpenseStats(month?: number, year?: number) {
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams();
  if (month) queryParams.append("month", month.toString());
  if (year) queryParams.append("year", year.toString());
  
  const queryString = queryParams.toString();
  const queryKey = queryString ? [`/api/expense/expenses/stats?${queryString}`] : ["/api/expense/expenses/stats"];

  const query = useQuery<ExpenseStats>({
    queryKey,
    queryFn: async () => {
      const url = queryString ? `/api/expense/expenses/stats?${queryString}` : "/api/expense/expenses/stats";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Handle errors with useEffect for TanStack Query v5
  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [query.error, toast]);

  return query;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expense: InsertExpense) => {
      const response = await apiRequest("POST", "/api/expense/expenses", expense);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all expense queries (including filtered ones)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/expenses");
        }
      });
      toast({
        title: "Success",
        description: "Expense added successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, expense }: { id: string; expense: Partial<InsertExpense> }) => {
      const response = await apiRequest("PUT", `/api/expense/expenses/${id}`, expense);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all expense queries (including filtered ones)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/expenses");
        }
      });
      toast({
        title: "Success",
        description: "Expense updated successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expense/expenses/${id}`);
    },
    onSuccess: () => {
      // Invalidate all expense queries (including filtered ones)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/expenses");
        }
      });
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Draft hooks
export function useDrafts() {
  const { toast } = useToast();

  const query = useQuery<Draft[]>({
    queryKey: ["/api/expense/drafts"],
    retry: false,
  });

  // Handle errors with useEffect for TanStack Query v5
  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [query.error, toast]);

  return query;
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (draft: InsertDraft) => {
      const response = await apiRequest("POST", "/api/expense/drafts", draft);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/drafts"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useApproveDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/expense/drafts/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/drafts"] });
      // Invalidate all expense queries (including filtered ones)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/expenses");
        }
      });
      toast({
        title: "Success",
        description: "Draft approved and expense created!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve draft. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expense/drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/drafts"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete draft. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDraft> }) => {
      const response = await apiRequest("PUT", `/api/expense/drafts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/drafts"] });
      toast({
        title: "Success",
        description: "Draft updated successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update draft. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// OCR and AI hooks
export function useScanReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const response = await fetch('/api/expense/ocr/scan', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense/drafts"] });
      toast({
        title: "Success",
        description: "Receipt scanned and parsed successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to scan receipt. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Budget hooks
export function useBudget(month: number, year: number) {
  const { toast } = useToast();
  
  // Format month and year to match API expectations (MM, YYYY)
  const formattedMonth = month.toString().padStart(2, '0');
  const formattedYear = year.toString();
  
  const query = useQuery<Budget>({
    queryKey: [`/api/expense/budgets/${formattedMonth}/${formattedYear}`],
    queryFn: async () => {
      const response = await fetch(`/api/expense/budgets/${formattedMonth}/${formattedYear}`, {
        credentials: "include"
      });
      if (response.status === 404) {
        // Budget not found is not an error - return null budget
        return null;
      }
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Handle errors with useEffect for TanStack Query v5
  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [query.error, toast]);

  return query;
}

export function useSetBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (budget: InsertBudget) => {
      const response = await apiRequest("POST", "/api/expense/budgets", budget);
      return response.json();
    },
    onSuccess: (data: Budget) => {
      // Invalidate the specific budget query
      const formattedMonth = data.month.padStart(2, '0');
      const formattedYear = data.year;
      queryClient.invalidateQueries({ queryKey: [`/api/expense/budgets/${formattedMonth}/${formattedYear}`] });
      
      // Also invalidate all budget-related queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/budgets");
        }
      });
      
      toast({
        title: "Success",
        description: "Budget updated successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update budget. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Category hooks
export function useCategories() {
  const { toast } = useToast();
  
  const query = useQuery<Category[]>({
    queryKey: ["/api/expense/categories"],
    retry: false,
  });

  // Handle errors with useEffect for TanStack Query v5
  useEffect(() => {
    if (query.error && isUnauthorizedError(query.error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [query.error, toast]);

  return query;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: InsertCategory) => {
      return await apiRequest("POST", "/api/expense/categories", category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/categories");
        }
      });
      
      toast({
        title: "Success",
        description: "Category created successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: Partial<InsertCategory> }) => {
      return await apiRequest("PUT", `/api/expense/categories/${id}`, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/categories");
        }
      });
      
      toast({
        title: "Success",
        description: "Category updated successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/expense/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/expense/categories");
        }
      });
      
      toast({
        title: "Success",
        description: "Category deleted successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    },
  });
}
