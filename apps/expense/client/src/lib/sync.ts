import { queryClient, apiRequest } from "./queryClient";
import type { Expense, Draft } from "@expense-shared/schema";

interface SyncData {
  expenses: Expense[];
  drafts: Draft[];
  syncTimestamp: string;
}

interface LocalSyncState {
  lastSyncTimestamp?: string;
  pendingExpenses: Partial<Expense>[];
  pendingDrafts: Partial<Draft>[];
}

const SYNC_STORAGE_KEY = "expensewatch_sync_state";

export class SyncManager {
  private getSyncState(): LocalSyncState {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Failed to parse sync state:", error);
      }
    }
    
    return {
      pendingExpenses: [],
      pendingDrafts: [],
    };
  }

  private setSyncState(state: LocalSyncState): void {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state));
  }

  async sync(): Promise<boolean> {
    try {
      const syncState = this.getSyncState();
      
      const response = await apiRequest("POST", "/api/expense/sync", {
        localExpenses: syncState.pendingExpenses,
        localDrafts: syncState.pendingDrafts,
        lastSyncTimestamp: syncState.lastSyncTimestamp,
      });
      
      const syncData: SyncData = await response.json();
      
      // Update local cache with server data
      if (syncData.expenses.length > 0) {
        queryClient.setQueryData(["/api/expense/expenses"], syncData.expenses);
      }
      
      if (syncData.drafts.length > 0) {
        queryClient.setQueryData(["/api/expense/drafts"], syncData.drafts);
      }
      
      // Update sync state
      this.setSyncState({
        lastSyncTimestamp: syncData.syncTimestamp,
        pendingExpenses: [],
        pendingDrafts: [],
      });
      
      return true;
    } catch (error) {
      console.error("Sync failed:", error);
      return false;
    }
  }

  addPendingExpense(expense: Partial<Expense>): void {
    const syncState = this.getSyncState();
    syncState.pendingExpenses.push(expense);
    this.setSyncState(syncState);
  }

  addPendingDraft(draft: Partial<Draft>): void {
    const syncState = this.getSyncState();
    syncState.pendingDrafts.push(draft);
    this.setSyncState(syncState);
  }

  hasPendingChanges(): boolean {
    const syncState = this.getSyncState();
    return syncState.pendingExpenses.length > 0 || syncState.pendingDrafts.length > 0;
  }

  getLastSyncTime(): Date | null {
    const syncState = this.getSyncState();
    return syncState.lastSyncTimestamp ? new Date(syncState.lastSyncTimestamp) : null;
  }

  // Auto-sync when coming back online
  setupAutoSync(): void {
    window.addEventListener("online", () => {
      if (this.hasPendingChanges()) {
        this.sync();
      }
    });

    // Sync every 5 minutes when online
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, 5 * 60 * 1000);
  }

  // Offline-first helpers
  isOnline(): boolean {
    return navigator.onLine;
  }

  getOfflineData<T>(queryKey: string[]): T | null {
    return queryClient.getQueryData(queryKey) || null;
  }

  setOfflineData<T>(queryKey: string[], data: T): void {
    queryClient.setQueryData(queryKey, data);
  }
}

export const syncManager = new SyncManager();

// Initialize auto-sync when the module loads
if (typeof window !== "undefined") {
  syncManager.setupAutoSync();
}
