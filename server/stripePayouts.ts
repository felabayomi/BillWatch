// Stripe Global Payouts service for direct creditor payments
// Replaces BILL.com integration with native Stripe solution

import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

function requireStripe(): Stripe {
  if (!stripe) throw new Error("Stripe is not configured yet");
  return stripe;
}

interface PayoutRecipient {
  name: string;
  email?: string;
  accountNumber?: string;
  routingNumber?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

interface PayoutRequest {
  recipientId: string;
  amount: number;
  description: string;
  currency?: string;
  metadata?: Record<string, string>;
}

interface PayoutResult {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed';
  description: string;
  recipientId: string;
  estimatedDelivery?: string;
}

export class StripePayoutService {
  constructor() {
    console.log(`💳 Stripe Global Payouts Service initialized`);
    console.log(`🌐 Using Stripe API version: 2023-10-16`);
    console.log(`🔑 Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'YES' : 'NO'}`);
  }

  // Create or get existing payout recipient
  async createRecipient(recipient: PayoutRecipient): Promise<string> {
    try {
      console.log(`👤 Creating Stripe payout recipient: ${recipient.name}`);
      
      // Validate required banking information
      if (!recipient.accountNumber || !recipient.routingNumber) {
        throw new Error(`Missing banking information for ${recipient.name}. Please add the creditor's account number and routing number to enable direct bank transfers.`);
      }
      
      // Create a Connect Express account for the recipient
      const account = await requireStripe().accounts.create({
        type: 'express',
        country: 'US',
        email: recipient.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: recipient.name,
          support_email: recipient.email,
        },
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          account_number: recipient.accountNumber,
          routing_number: recipient.routingNumber,
          account_holder_name: recipient.name,
          account_type: 'checking',
        } as any,
      });

      console.log(`✅ Stripe recipient created: ${account.id}`);
      return account.id;
    } catch (error: any) {
      console.error('❌ Failed to create Stripe recipient:', error.message);
      throw new Error(`Failed to create payout recipient: ${error.message}`);
    }
  }

  // Send money to a recipient using Stripe transfers
  async sendPayout(request: PayoutRequest): Promise<PayoutResult> {
    try {
      console.log(`💸 Sending Stripe payout: $${request.amount} to ${request.recipientId}`);
      
      // Convert amount to cents
      const amountInCents = Math.round(request.amount * 100);

      // Create transfer to the connected account
      const transfer = await requireStripe().transfers.create({
        amount: amountInCents,
        currency: request.currency || 'usd',
        destination: request.recipientId,
        description: request.description,
        metadata: request.metadata || {},
      });

      console.log(`✅ Stripe transfer created: ${transfer.id}`);

      return {
        id: transfer.id,
        amount: request.amount,
        status: this.mapStripeStatus(transfer.reversed ? 'failed' : 'processing'),
        description: request.description,
        recipientId: request.recipientId,
        estimatedDelivery: 'Standard bank transfers typically arrive within 1-3 business days',
      };
    } catch (error: any) {
      console.error('❌ Stripe payout failed:', error.message);
      throw new Error(`Payout failed: ${error.message}`);
    }
  }

  // Alternative: Use Global Payouts API (if available in account)
  async sendGlobalPayout(request: PayoutRequest): Promise<PayoutResult> {
    try {
      console.log(`🌍 Sending Global Payout: $${request.amount} to ${request.recipientId}`);
      
      // Convert amount to cents
      const amountInCents = Math.round(request.amount * 100);

      // Create payout using Stripe's standard payouts API
      const payout = await requireStripe().payouts.create({
        amount: amountInCents,
        currency: request.currency || 'usd',
        description: request.description,
        metadata: request.metadata || {},
        method: 'standard',
      });

      console.log(`✅ Global payout created: ${payout.id}`);

      return {
        id: payout.id,
        amount: request.amount,
        status: this.mapStripeStatus(payout.status),
        description: request.description,
        recipientId: request.recipientId,
        estimatedDelivery: payout.arrival_date 
          ? new Date(payout.arrival_date * 1000).toLocaleDateString()
          : 'Standard bank transfers typically arrive within 1-3 business days',
      };
    } catch (error: any) {
      console.error('❌ Global payout failed:', error.message);
      throw new Error(`Global payout failed: ${error.message}`);
    }
  }

  // Check payout status
  async getPayoutStatus(payoutId: string): Promise<PayoutResult | null> {
    try {
      // Try to get as transfer first
      try {
        const transfer = await requireStripe().transfers.retrieve(payoutId);
        return {
          id: transfer.id,
          amount: transfer.amount / 100,
          status: this.mapStripeStatus(transfer.reversed ? 'failed' : 'sent'),
          description: transfer.description || 'Payment transfer',
          recipientId: transfer.destination as string,
        };
      } catch {
        // If not a transfer, try as payout
        const payout = await requireStripe().payouts.retrieve(payoutId);
        return {
          id: payout.id,
          amount: payout.amount / 100,
          status: this.mapStripeStatus(payout.status),
          description: payout.description || 'Payment payout',
          recipientId: 'direct_payout',
          estimatedDelivery: payout.arrival_date 
            ? new Date(payout.arrival_date * 1000).toLocaleDateString()
            : undefined,
        };
      }
    } catch (error: any) {
      console.error('❌ Failed to get payout status:', error.message);
      return null;
    }
  }

  // Test Stripe connectivity
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Stripe Global Payouts connectivity...');
      
      // Test by getting account information
      const account = await requireStripe().accounts.retrieve();
      console.log(`✅ Stripe account connected: ${account.id}`);
      console.log(`🏢 Business name: ${account.business_profile?.name || 'Not set'}`);
      console.log(`💳 Charges enabled: ${account.charges_enabled ? 'YES' : 'NO'}`);
      console.log(`💸 Payouts enabled: ${account.payouts_enabled ? 'YES' : 'NO'}`);
      
      return account.payouts_enabled;
    } catch (error: any) {
      console.error('❌ Stripe connectivity test failed:', error.message);
      return false;
    }
  }

  // Map Stripe status to our standard status
  private mapStripeStatus(stripeStatus: string): 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' {
    switch (stripeStatus) {
      case 'pending':
        return 'pending';
      case 'in_transit':
      case 'paid':
        return 'processing';
      case 'canceled':
      case 'failed':
        return 'failed';
      default:
        return 'sent';
    }
  }

  // Get supported payout methods for a country
  async getSupportedMethods(country: string = 'US'): Promise<string[]> {
    // Stripe supports various methods depending on the country
    const supportedMethods = {
      'US': ['ach', 'bank_transfer', 'instant'],
      'CA': ['bank_transfer'],
      'GB': ['bank_transfer', 'faster_payments'],
      'EU': ['sepa', 'bank_transfer'],
    };

    return supportedMethods[country] || ['bank_transfer'];
  }
}

export const stripePayoutService = new StripePayoutService();
