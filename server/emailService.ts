import nodemailer from 'nodemailer';

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PaymentConfirmation {
  userEmail: string;
  amount: string;
  company: string;
  paymentMethod: string;
  transactionId: string;
}

interface DeliveryTracking {
  userEmail: string;
  company: string;
  amount: string;
  status: 'processing' | 'mailed' | 'delivered' | 'completed';
  estimatedDelivery?: string;
}

interface BillReminder {
  userEmail: string;
  userName: string;
  company: string;
  amount: string;
  dueDate: string;
  daysUntilDue: number;
  reminderType: 'early-warning' | 'urgent';
  billId: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if custom SMTP credentials are provided for professional email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.setupCustomSMTP();
    } else if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_API_KEY) {
      // SendGrid configuration for production
      this.setupSendGrid();
    } else {
      // Use nodemailer test account for development
      this.createTestAccount();
    }
  }

  private setupCustomSMTP() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates if needed
        }
      });

      console.log(`📧 Professional email service initialized using ${process.env.SMTP_HOST}`);
      console.log(`📤 Emails will be sent from: ${this.getFromAddress()}`);
      console.log(`↩️ Replies will go to: ${this.getReplyToAddress()}`);
    } catch (error) {
      console.error('Failed to set up custom SMTP:', error);
      this.createTestAccount(); // Fallback to test account
    }
  }

  private setupSendGrid() {
    // SendGrid implementation would go here if needed
    console.log('🚀 Using SendGrid for production email service');
  }

  // Get the professional "from" address
  private getFromAddress(): string {
    return process.env.EMAIL_FROM || 'no-reply@billwatch.pro';
  }

  // Get the professional "reply-to" address  
  private getReplyToAddress(): string {
    return process.env.EMAIL_REPLY_TO || 'support@billwatch.pro';
  }

  // Get the company name for branding
  private getCompanyName(): string {
    return process.env.COMPANY_NAME || 'BillWatch';
  }

  // Test email functionality
  async sendTestEmail(userEmail: string): Promise<boolean> {
    if (!this.transporter) return false;

    const subject = "BillWatch Email System Test - Setup Confirmed";
    const html = this.generateTestEmailHTML();
    const text = `This is a test email from BillWatch to confirm your professional email setup is working correctly.

✅ FROM: no-reply@billwatch.pro
✅ REPLY-TO: support@billwatch.pro
✅ SMTP Connection: Active
✅ Email Templates: Working

Your BillWatch notification system is fully operational!

If you have any questions, reply to this email and it will go directly to support@billwatch.pro.

Best regards,
The BillWatch Team`;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }

  private generateTestEmailHTML(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BillWatch Email Test</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">BillWatch Email Test</h1>
                <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Professional Setup Confirmed</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">✅</div>
                    <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Email System Active!</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 16px;">Your professional email configuration is working perfectly</p>
                </div>
                
                <!-- Status Checks -->
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 25px; margin: 30px 0;">
                    <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600;">System Status:</h3>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="color: #10b981; margin-right: 10px; font-size: 18px;">✅</span>
                        <span style="color: #374151; font-size: 15px;"><strong>FROM:</strong> no-reply@billwatch.pro</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="color: #10b981; margin-right: 10px; font-size: 18px;">✅</span>
                        <span style="color: #374151; font-size: 15px;"><strong>REPLY-TO:</strong> support@billwatch.pro</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="color: #10b981; margin-right: 10px; font-size: 18px;">✅</span>
                        <span style="color: #374151; font-size: 15px;"><strong>SMTP Connection:</strong> Active</span>
                    </div>
                    
                    <div style="display: flex; align-items: center;">
                        <span style="color: #10b981; margin-right: 10px; font-size: 18px;">✅</span>
                        <span style="color: #374151; font-size: 15px;"><strong>Email Templates:</strong> Working</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">Your automated bill reminder system is now sending professional notifications from <strong>no-reply@billwatch.pro</strong></p>
                    
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 500;">💡 Need Support? Simply reply to this email!</p>
                        <p style="margin: 5px 0 0 0; color: #3730a3; font-size: 13px;">All replies automatically go to support@billwatch.pro</p>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">This test email confirms your BillWatch notification system is operational</p>
                <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">BillWatch Professional Email System</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  private async createTestAccount() {
    try {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('📧 Email service initialized for development');
      console.log('Test account:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }

  async sendPaymentConfirmation({
    userEmail,
    amount,
    company,
    paymentMethod,
    transactionId
  }: PaymentConfirmation): Promise<boolean> {
    if (!this.transporter) return false;

    const subject = `BillWatch Payment Confirmation - ${company}`;
    const html = this.generatePaymentConfirmationHTML({
      amount,
      company,
      paymentMethod,
      transactionId,
      userEmail
    });

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: `Payment of $${amount} to ${company} has been confirmed. Transaction ID: ${transactionId}`
    });
  }

  async sendDeliveryUpdate({
    userEmail,
    company,
    amount,
    status,
    estimatedDelivery
  }: DeliveryTracking): Promise<boolean> {
    if (!this.transporter) return false;

    const statusMessages = {
      processing: `Your payment to ${company} is being processed`,
      mailed: `Check has been mailed to ${company}`,
      delivered: `Check has been delivered to ${company}`,
      completed: `Payment to ${company} has been processed`
    };

    const subject = `Payment Update - ${statusMessages[status]}`;
    const html = this.generateDeliveryUpdateHTML({
      company,
      amount,
      status,
      estimatedDelivery,
      userEmail
    });

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: statusMessages[status] + (estimatedDelivery ? ` Expected delivery: ${estimatedDelivery}` : '')
    });
  }

  async sendBillReminder({
    userEmail,
    userName,
    company,
    amount,
    dueDate,
    daysUntilDue,
    reminderType,
    billId
  }: BillReminder): Promise<boolean> {
    if (!this.transporter) return false;

    const isUrgent = reminderType === 'urgent';
    const subject = isUrgent 
      ? `Urgent Bill Reminder: ${company} due in ${daysUntilDue} days`
      : `Bill Reminder: ${company} due in ${daysUntilDue} days`;

    const html = this.generateBillReminderHTML({
      userName,
      company,
      amount,
      dueDate,
      daysUntilDue,
      reminderType,
      userEmail,
      billId
    });

    const text = isUrgent
      ? `URGENT: Your ${company} bill for $${amount} is due in ${daysUntilDue} days (${dueDate}). Pay now to avoid late fees.`
      : `Reminder: Your ${company} bill for $${amount} is due in ${daysUntilDue} days (${dueDate}). Start preparing for payment.`;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }

  private async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      if (!this.transporter) return false;

      const info = await this.transporter.sendMail({
        from: `"${this.getCompanyName()}" <${this.getFromAddress()}>`,
        replyTo: this.getReplyToAddress(),
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
        headers: {
          'List-Unsubscribe': `<mailto:${this.getReplyToAddress()}?subject=Unsubscribe>`,
          'X-Mailer': 'BillWatch Notification System',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
        },
      });

      console.log('📧 Email sent successfully:', info.messageId);
      console.log(`📤 From: ${this.getFromAddress()}`);
      console.log(`📨 To: ${notification.to}`);
      console.log(`↩️ Reply-To: ${this.getReplyToAddress()}`);
      
      // Log delivery status for debugging
      if (info.response) {
        console.log('📬 SMTP Response:', info.response);
      }
      if (info.envelope) {
        console.log('✉️ Email Envelope:', info.envelope);
      }

      // If using test account, log preview URL
      if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
        console.log('🔗 Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  private generatePaymentConfirmationHTML({
    amount,
    company,
    paymentMethod,
    transactionId,
    userEmail
  }: PaymentConfirmation): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .confirmation-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .amount { font-size: 24px; color: #10B981; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Confirmed ✅</h1>
        </div>
        <div class="content">
            <div class="confirmation-box">
                <h2>Your payment has been successfully processed!</h2>
                <p>We've received your payment and it's being sent directly to ${company}.</p>
            </div>
            
            <div class="details">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> <span class="amount">$${amount}</span></p>
                <p><strong>Recipient:</strong> ${company}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod === 'card' ? 'Credit/Debit Card' : paymentMethod}</p>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="confirmation-box">
                <h3>What happens next?</h3>
                <p>🏦 We're processing your payment through BILL.com</p>
                <p>📮 A physical check will be mailed to ${company}</p>
                <p>📧 You'll receive updates as your payment progresses</p>
                <p>⏱️ Expected delivery: 1-2 business days</p>
            </div>
        </div>
        <div class="footer">
            <p>Thank you for using BillWatch!</p>
            <p>This email was sent to ${userEmail}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateDeliveryUpdateHTML({
    company,
    amount,
    status,
    estimatedDelivery,
    userEmail
  }: DeliveryTracking): string {
    const statusEmoji = {
      processing: '🔄',
      mailed: '📮',
      delivered: '📨',
      completed: '✅'
    };

    const statusColor = {
      processing: '#F59E0B',
      mailed: '#3B82F6',
      delivered: '#10B981',
      completed: '#10B981'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor[status]}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor[status]}; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .amount { font-size: 18px; color: ${statusColor[status]}; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .status-icon { font-size: 48px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status-icon">${statusEmoji[status]}</div>
            <h1>Payment Update</h1>
        </div>
        <div class="content">
            <div class="status-box">
                <h2>Status Update for ${company}</h2>
                <p class="amount">$${amount}</p>
                ${status === 'processing' ? '<p>Your payment is being processed and will be sent via check.</p>' : ''}
                ${status === 'mailed' ? '<p>Your check has been mailed and is on its way to the creditor.</p>' : ''}
                ${status === 'delivered' ? '<p>Your check has been successfully delivered to the creditor.</p>' : ''}
                ${status === 'completed' ? '<p>Your payment has been fully processed and completed!</p>' : ''}
            </div>
            
            ${estimatedDelivery ? `
            <div class="details">
                <h3>Expected Delivery</h3>
                <p><strong>${estimatedDelivery}</strong></p>
            </div>
            ` : ''}

            <div class="details">
                <h3>Track Your Payment</h3>
                <p>You can always check the status of your payments in your BillWatch dashboard.</p>
                <p><strong>Payment sent to:</strong> ${company}</p>
                <p><strong>Amount:</strong> $${amount}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="footer">
            <p>Thank you for using BillWatch!</p>
            <p>This email was sent to ${userEmail}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateBillReminderHTML({
    userName,
    company,
    amount,
    dueDate,
    daysUntilDue,
    reminderType,
    userEmail,
    billId
  }: {
    userName: string;
    company: string;
    amount: string;
    dueDate: string;
    daysUntilDue: number;
    reminderType: 'early-warning' | 'urgent';
    userEmail: string;
    billId: string;
  }): string {
    const isUrgent = reminderType === 'urgent';
    const urgencyColor = isUrgent ? '#ef4444' : '#f59e0b';
    const urgencyIcon = isUrgent ? '⚠️' : '📅';
    const urgencyTitle = isUrgent ? 'Payment Required Soon' : 'Payment Reminder';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bill Reminder - BillWatch</title>
    <style>
        body { 
            margin: 0; padding: 0; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; color: #333; 
            background-color: #f8f9fa; 
        }
        .container { 
            max-width: 600px; margin: 0 auto; 
            background-color: #ffffff; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 30px; text-align: center; 
        }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .urgency-alert { 
            background-color: ${urgencyColor}; 
            color: white; padding: 15px; 
            text-align: center; font-weight: 600; 
        }
        .content { padding: 30px; }
        .greeting { text-align: center; margin-bottom: 25px; }
        .greeting h2 { color: #333; margin: 0 0 10px 0; font-size: 22px; }
        .greeting p { color: #666; margin: 0; font-size: 16px; }
        .bill-card { 
            background-color: #f8f9ff; 
            border: 1px solid #e0e7ff; 
            border-radius: 8px; padding: 20px; 
            margin: 20px 0; 
        }
        .bill-header { 
            display: flex; justify-content: space-between; 
            align-items: center; margin-bottom: 15px; 
        }
        .bill-header h3 { color: #4f46e5; margin: 0; font-size: 18px; }
        .days-badge { 
            background-color: ${urgencyColor}; 
            color: white; padding: 4px 12px; 
            border-radius: 20px; font-size: 14px; 
            font-weight: 600; 
        }
        .bill-details { border-top: 1px solid #e0e7ff; padding-top: 15px; }
        .detail-row { 
            display: flex; justify-content: space-between; 
            margin-bottom: 8px; 
        }
        .detail-label { color: #666; font-weight: 500; }
        .detail-value { color: #333; font-weight: 600; }
        .amount { font-size: 16px; }
        .due-date { color: ${urgencyColor}; }
        .action-box { 
            background-color: ${isUrgent ? '#fef2f2' : '#fffbeb'}; 
            border: 1px solid ${isUrgent ? '#fecaca' : '#fed7aa'}; 
            border-radius: 8px; padding: 20px; 
            margin: 20px 0; 
        }
        .action-box h4 { 
            color: ${urgencyColor}; 
            margin: 0 0 10px 0; 
            font-size: 16px; 
        }
        .action-box p { 
            color: #666; margin: 0; 
            font-size: 14px; line-height: 1.5; 
        }
        .cta-section { text-align: center; margin: 30px 0; }
        .cta-button { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; text-decoration: none; 
            padding: 15px 30px; border-radius: 8px; 
            font-weight: 600; font-size: 16px; 
            display: inline-block; 
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); 
        }
        .email-note { 
            text-align: center; margin-top: 20px; 
            color: #999; font-size: 12px; 
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 20px; text-align: center; 
            border-top: 1px solid #e9ecef; 
        }
        .footer p { color: #666; margin: 0; font-size: 12px; }
        @media only screen and (max-width: 600px) {
            .bill-header { flex-direction: column; align-items: flex-start; }
            .days-badge { margin-top: 10px; }
            .detail-row { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>${urgencyIcon} BillWatch</h1>
            <p>${urgencyTitle}</p>
        </div>
        
        <!-- Urgency Alert -->
        <div class="urgency-alert">
            ${isUrgent 
                ? `URGENT: Bill due in ${daysUntilDue} days - Pay now to avoid late fees!`
                : `Reminder: Bill due in ${daysUntilDue} days - Start preparing for payment`
            }
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <div class="greeting">
                <h2>Hello ${userName}!</h2>
                <p>
                    ${isUrgent 
                        ? 'Your bill payment is urgently needed to avoid being late.'
                        : 'We wanted to give you an early heads up about your upcoming bill.'
                    }
                </p>
            </div>
            
            <!-- Bill Details Card -->
            <div class="bill-card">
                <div class="bill-header">
                    <h3>${company}</h3>
                    <span class="days-badge">${daysUntilDue} days left</span>
                </div>
                <div class="bill-details">
                    <div class="detail-row">
                        <span class="detail-label">Amount Due:</span>
                        <span class="detail-value amount">$${amount}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Due Date:</span>
                        <span class="detail-value due-date">${dueDate}</span>
                    </div>
                </div>
            </div>
            
            <!-- Action Message -->
            <div class="action-box">
                <h4>${isUrgent ? '🚨 Action Required' : '💡 What to do next'}</h4>
                <p>
                    ${isUrgent 
                        ? `Don't forget to pay this bill to avoid late fees. Contact ${company} directly or use your preferred payment method.`
                        : `Start preparing to pay this bill. You'll get another reminder closer to the due date, but paying early is always better.`
                    }
                </p>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-section">
                <a href="${process.env.APP_URL ? new URL('/bills', process.env.APP_URL).href : '#'}" 
                   class="cta-button">
                    ${isUrgent ? '📋 View Bill' : '👀 View Bill'}
                </a>
            </div>
            
            <div class="email-note">
                <p>
                    This reminder was sent to ${userEmail}<br>
                    You're receiving this because you have bills tracked in BillWatch
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>
                © ${new Date().getFullYear()} BillWatch. Helping you stay on top of your bills.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

export const emailService = new EmailService();
