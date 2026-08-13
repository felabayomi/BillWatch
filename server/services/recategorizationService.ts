import { db } from "../db.js";
import { bills } from "@shared/schema";
import { eq, isNull, or, and } from "drizzle-orm";
import { AIParserService } from "./aiParser.js";

export class RecategorizationService {
  private aiParser = new AIParserService();

  /**
   * Re-categorize all existing bills that don't have categories or have empty categories
   */
  async recategorizeExistingBills(userId: string): Promise<{
    processed: number;
    categorized: number;
    failed: number;
    categories: Record<string, number>;
  }> {
    // Find bills without categories or with null/empty categories
    const billsToProcess = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          or(
            isNull(bills.category),
            eq(bills.category, "")
          )
        )
      );

    let categorized = 0;
    let failed = 0;
    const categories: Record<string, number> = {};

    for (const bill of billsToProcess) {
      try {
        // Create a text representation of the bill for AI analysis
        const billText = this.createBillTextForAnalysis(bill);
        
        // Use AI to determine category
        const parsedInfo = await this.aiParser.parseBillInformation(billText);
        
        if (parsedInfo.category) {
          // Update the bill with the detected category
          await db
            .update(bills)
            .set({ 
              category: parsedInfo.category,
              updatedAt: new Date()
            })
            .where(eq(bills.id, bill.id));

          categorized++;
          categories[parsedInfo.category] = (categories[parsedInfo.category] || 0) + 1;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to categorize bill ${bill.id}:`, error);
        failed++;
      }
    }

    return {
      processed: billsToProcess.length,
      categorized,
      failed,
      categories
    };
  }

  /**
   * Create a text representation of a bill for AI analysis
   */
  private createBillTextForAnalysis(bill: any): string {
    let billText = "";
    
    // Add company name - most important for categorization
    if (bill.company) {
      billText += `Company: ${bill.company}\n`;
    }
    
    // Add amount
    if (bill.amount) {
      billText += `Amount: $${bill.amount}\n`;
    }
    
    // Add any description
    if (bill.description) {
      billText += `Description: ${bill.description}\n`;
    }
    
    // Add extracted text if available
    if (bill.extractedData?.originalText) {
      billText += `Original bill text: ${bill.extractedData.originalText}\n`;
    }
    
    // If we have very little info, create a basic description
    if (billText.trim().length < 20) {
      billText = `Bill from ${bill.company || 'Unknown Company'} for $${bill.amount || '0.00'}`;
    }
    
    return billText.trim();
  }

  /**
   * Get preview of bills that would be re-categorized
   */
  async getRecategorizationPreview(userId: string): Promise<{
    billCount: number;
    sampleBills: Array<{
      id: string;
      company: string;
      amount: string;
      currentCategory: string | null;
    }>;
  }> {
    const billsToProcess = await db
      .select({
        id: bills.id,
        company: bills.company,
        amount: bills.amount,
        category: bills.category
      })
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          or(
            isNull(bills.category),
            eq(bills.category, "")
          )
        )
      )
      .limit(5); // Show first 5 as preview

    return {
      billCount: billsToProcess.length,
      sampleBills: billsToProcess.map(bill => ({
        id: bill.id,
        company: bill.company,
        amount: bill.amount,
        currentCategory: bill.category
      }))
    };
  }
}

export const recategorizationService = new RecategorizationService();
