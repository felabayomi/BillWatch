import { storage } from "../storage.js";
import type { InsertReminder } from "@shared/schema";

export class ReminderService {
  async createDefaultReminders(billId: string, dueDate: Date): Promise<void> {
    // Default reminder schedule: 2 weeks, 1 week, 3 days, 1 day, same day
    const reminderSchedule = [
      { type: 'two_weeks' as const, days: 14 },
      { type: 'one_week' as const, days: 7 },
      { type: 'three_days' as const, days: 3 },
      { type: 'one_day' as const, days: 1 },
      { type: 'same_day' as const, days: 0 },
    ];

    for (const reminder of reminderSchedule) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - reminder.days);
      
      // Set reminder time to 9 AM by default
      reminderDate.setHours(9, 0, 0, 0);
      
      // Only create future reminders
      if (reminderDate > new Date()) {
        const reminderData: InsertReminder = {
          billId,
          reminderDate,
          reminderType: reminder.type,
          sent: false
        };
        
        await storage.createReminder(reminderData);
      }
    }
  }

  async createCustomReminders(
    billId: string, 
    dueDate: Date, 
    preferences: {
      twoWeeks?: boolean;
      oneWeek?: boolean;
      threeDays?: boolean;
      oneDay?: boolean;
      sameDay?: boolean;
      notificationTime?: string;
    }
  ): Promise<void> {
    const reminderTypes = [
      { enabled: preferences.twoWeeks, type: 'two_weeks' as const, days: 14 },
      { enabled: preferences.oneWeek, type: 'one_week' as const, days: 7 },
      { enabled: preferences.threeDays, type: 'three_days' as const, days: 3 },
      { enabled: preferences.oneDay, type: 'one_day' as const, days: 1 },
      { enabled: preferences.sameDay, type: 'same_day' as const, days: 0 },
    ];

    const notificationTime = preferences.notificationTime || '09:00';
    const [hours, minutes] = notificationTime.split(':').map(Number);

    for (const reminder of reminderTypes) {
      if (!reminder.enabled) continue;

      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - reminder.days);
      reminderDate.setHours(hours, minutes, 0, 0);
      
      // Only create future reminders
      if (reminderDate > new Date()) {
        const reminderData: InsertReminder = {
          billId,
          reminderDate,
          reminderType: reminder.type,
          sent: false
        };
        
        await storage.createReminder(reminderData);
      }
    }
  }

  async processOverdueReminders(): Promise<void> {
    const pendingReminders = await storage.getPendingReminders();
    
    for (const reminder of pendingReminders) {
      try {
        // Here you would implement actual notification sending
        // For now, just mark as sent
        await storage.updateReminder(reminder.id, { sent: true });
        
        console.log(`Reminder sent for bill ${reminder.billId}`);
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
      }
    }
  }

  async snoozeReminder(reminderId: string, snoozeUntil: Date): Promise<void> {
    await storage.updateReminder(reminderId, { snoozedUntil: snoozeUntil });
  }
}
