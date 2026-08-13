import { billReminderService } from "./billReminderService";

export class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  // Run reminder checks every 6 hours (4 times per day)
  private readonly INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  
  constructor() {
    console.log('📋 Reminder scheduler initialized');
  }

  // Start the automated reminder checking
  start(): void {
    if (this.intervalId) {
      console.log('⚠️ Reminder scheduler already running');
      return;
    }

    console.log('🚀 Starting automated bill reminder scheduler (checks every 6 hours)');
    
    // Run immediately on startup
    this.runReminderCheck();
    
    // Then run every 6 hours
    this.intervalId = setInterval(() => {
      this.runReminderCheck();
    }, this.INTERVAL_MS);
  }

  // Stop the automated reminder checking
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Reminder scheduler stopped');
    }
  }

  // Run reminder check (can be called manually or automatically)
  async runReminderCheck(): Promise<{ success: boolean; error?: string }> {
    if (this.isProcessing) {
      console.log('⏳ Reminder check already in progress, skipping...');
      return { success: false, error: 'Already processing' };
    }

    try {
      this.isProcessing = true;
      console.log('📋 Running automated bill reminder check...');
      
      const startTime = Date.now();
      await billReminderService.processAllReminders();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Reminder check completed in ${duration}ms`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error during reminder check:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.isProcessing = false;
    }
  }

  // Get scheduler status
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    intervalMs: number;
    nextCheckEstimate?: Date;
  } {
    const nextCheck = this.intervalId 
      ? new Date(Date.now() + this.INTERVAL_MS)
      : undefined;

    return {
      isRunning: !!this.intervalId,
      isProcessing: this.isProcessing,
      intervalMs: this.INTERVAL_MS,
      nextCheckEstimate: nextCheck
    };
  }

  // Manual trigger for testing
  async triggerManualCheck(): Promise<{ success: boolean; error?: string }> {
    console.log('🔧 Manual reminder check triggered');
    return await this.runReminderCheck();
  }
}

// Singleton instance
export const reminderScheduler = new ReminderScheduler();