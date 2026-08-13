import { storage } from "./storage.js";
import { emailService } from "./emailService.js";

interface Bill {
  id: string;
  userId: string;
  company: string;
  amount: number;
  dueDate: Date;
  status: string;
  remindersSent?: string[]; // Track which reminders were sent: ['14-day', '7-day']
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export class BillReminderService {
  
  // Check all bills and send reminders if needed
  async processAllReminders(): Promise<void> {
    try {
      console.log('🔍 Checking bills for upcoming due dates...');
      
      const users = await storage.getAllUsers();
      let remindersSent = 0;

      for (const user of users) {
        if (user.email) {
          const sentCount = await this.processUserReminders(user);
          remindersSent += sentCount;
        }
      }

      console.log(`📧 Sent ${remindersSent} bill reminders`);
    } catch (error) {
      console.error('Error processing bill reminders:', error);
    }
  }

  // Process reminders for a specific user
  async processUserReminders(user: User): Promise<number> {
    try {
      const bills = await storage.getBillsByUser(user.id);
      const upcomingBills = bills.filter((bill: any) => 
        bill.status === 'pending' && // Only unpaid bills
        bill.dueDate && 
        new Date(bill.dueDate) > new Date() // Not past due
      );

      let sentCount = 0;

      for (const bill of upcomingBills) {
        const daysUntilDue = this.calculateDaysUntilDue(new Date(bill.dueDate));
        const remindersSent = bill.remindersSent || [];

        // 14-day checkpoint: Early warning
        if (daysUntilDue <= 14 && daysUntilDue > 7 && !remindersSent.includes('14-day')) {
          await this.sendEarlyWarningReminder(user, bill);
          await this.markReminderSent(bill.id, '14-day');
          sentCount++;
        }
        
        // 7-day checkpoint: Urgent payment needed
        if (daysUntilDue <= 7 && daysUntilDue > 0 && !remindersSent.includes('7-day')) {
          await this.sendUrgentPaymentReminder(user, bill);
          await this.markReminderSent(bill.id, '7-day');
          sentCount++;
        }
      }

      return sentCount;
    } catch (error) {
      console.error(`Error processing reminders for user ${user.id}:`, error);
      return 0;
    }
  }

  // Send 14-day early warning reminder
  async sendEarlyWarningReminder(user: User, bill: any): Promise<void> {
    const daysUntilDue = this.calculateDaysUntilDue(new Date(bill.dueDate));
    
    try {
      await emailService.sendBillReminder({
        userEmail: user.email,
        userName: user.firstName || 'there',
        company: bill.company,
        amount: bill.amount.toString(),
        dueDate: new Date(bill.dueDate).toLocaleDateString(),
        daysUntilDue,
        reminderType: 'early-warning',
        billId: bill.id
      });
      
      console.log(`📧 14-day reminder sent to ${user.email} for ${bill.company}`);
    } catch (error) {
      console.error(`Failed to send early warning reminder for bill ${bill.id}:`, error);
    }
  }

  // Send 7-day urgent payment reminder
  async sendUrgentPaymentReminder(user: User, bill: any): Promise<void> {
    const daysUntilDue = this.calculateDaysUntilDue(new Date(bill.dueDate));
    
    try {
      await emailService.sendBillReminder({
        userEmail: user.email,
        userName: user.firstName || 'there',
        company: bill.company,
        amount: bill.amount.toString(),
        dueDate: new Date(bill.dueDate).toLocaleDateString(),
        daysUntilDue,
        reminderType: 'urgent',
        billId: bill.id
      });
      
      console.log(`📧 7-day urgent reminder sent to ${user.email} for ${bill.company}`);
    } catch (error) {
      console.error(`Failed to send urgent payment reminder for bill ${bill.id}:`, error);
    }
  }

  // Calculate days until due date
  private calculateDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Mark that a reminder has been sent for this bill
  async markReminderSent(billId: string, reminderType: '14-day' | '7-day'): Promise<void> {
    try {
      const bill = await storage.getBill(billId);
      if (bill) {
        const remindersSent = bill.remindersSent || [];
        if (!remindersSent.includes(reminderType)) {
          remindersSent.push(reminderType);
          await storage.updateBill(billId, { remindersSent });
        }
      }
    } catch (error) {
      console.error(`Failed to mark reminder sent for bill ${billId}:`, error);
    }
  }

  // Get reminder status for a bill (useful for UI)
  getReminderStatus(bill: any): string {
    const daysUntilDue = this.calculateDaysUntilDue(new Date(bill.dueDate));
    const remindersSent = bill.remindersSent || [];
    
    if (daysUntilDue <= 0) return 'overdue';
    if (daysUntilDue <= 7) {
      return remindersSent.includes('7-day') ? 'urgent-sent' : 'urgent-pending';
    }
    if (daysUntilDue <= 14) {
      return remindersSent.includes('14-day') ? 'warning-sent' : 'warning-pending';
    }
    return 'ok';
  }

  // Manual reminder trigger (useful for testing or admin actions)
  async sendManualReminder(billId: string, reminderType: '14-day' | '7-day'): Promise<boolean> {
    try {
      const bill = await storage.getBill(billId);
      if (!bill) return false;

      const user = await storage.getUser(bill.userId);
      if (!user?.email) return false;

      if (reminderType === '14-day') {
        await this.sendEarlyWarningReminder(user, bill);
      } else {
        await this.sendUrgentPaymentReminder(user, bill);
      }

      await this.markReminderSent(billId, reminderType);
      return true;
    } catch (error) {
      console.error(`Failed to send manual reminder for bill ${billId}:`, error);
      return false;
    }
  }
}

export const billReminderService = new BillReminderService();
