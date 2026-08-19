import OpenAI from "openai";
import { z } from "zod";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

const ExpenseParseSchema = z.object({
  amount: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }
      if (typeof value === "number") {
        return Math.abs(value);
      }
      if (typeof value === "string") {
        const normalized = value
          .trim()
          .replace(/[$,\s]/g, "");
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) {
          return Math.abs(parsed);
        }
      }
      return value;
    },
    z.number().optional(),
  ),
  description: z.string().optional(),
  category: z.string().optional(),
  merchant: z.string().optional(),
  date: z.string().optional(), // ISO date string
  paymentMethod: z.string().optional(),
  location: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

export type ParsedExpense = z.infer<typeof ExpenseParseSchema>;

export class AIService {
  async parseExpenseFromImage(imageBuffer: Buffer, mimeType: string): Promise<ParsedExpense> {
    try {
      const base64Image = imageBuffer.toString("base64");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert expense parsing assistant. Extract expense data from receipt images and bank/card app transaction screenshots. Always respond with valid JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Look at this image and extract expense information. It may be a traditional receipt OR a bank/card app transaction detail screen.

For bank/card app screens: the merchant name appears near the top, the amount is a large dollar figure right below the merchant name, and the date is labeled "Transaction: MM/DD/YYYY".

Extract and respond in JSON:
- amount: The transaction amount as a positive number (no currency symbols or signs)
- description: Clean merchant/store name
- category: Best match from: groceries, dining-out, transportation, entertainment, shopping, health, self-care, hobbies, gifts, charity, household-supplies, subscriptions, education, travel, utilities, other
- merchant: The business/store name
- date: Transaction date in ISO format (YYYY-MM-DD)
- paymentMethod: credit-card, debit-card, cash, check, or digital-wallet. "Card Tapped"/"Card Swiped" = debit-card, "Tap to Pay" = digital-wallet
- location: Address or city/state if shown
- confidence: 0.0 to 1.0
- reasoning: Brief explanation

If a field is not visible, omit it.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from AI vision");

      const parsed = JSON.parse(content);
      return ExpenseParseSchema.parse(parsed);
    } catch (error) {
      console.error("AI vision parsing failed:", error);
      return { confidence: 0.1, reasoning: `Vision parsing failed: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  async parseExpenseFromText(text: string, ocrConfidence?: number): Promise<ParsedExpense> {
    try {
      const prompt = `
You are an expert at parsing expense data from OCR text. The text may come from two main sources:

1. TRADITIONAL RECEIPT: Amount usually appears near the bottom labeled "Total", "TOTAL", "Amount Due", etc.

2. BANK/CARD APP TRANSACTION SCREEN: Amount appears near the TOP right after the merchant name. Look for these patterns:
   - Merchant name on one line, then a dollar amount like "$14.50" on the very next line
   - Date labeled as "Transaction: MM/DD/YYYY" or "Date: MM/DD/YYYY"
   - Payment method labeled as "Method" followed by "Card Tapped" (= debit-card), "Card Swiped" (= debit-card), "Card Inserted" (= credit-card or debit-card), "Tap to Pay" (= digital-wallet)
   - Category labeled as "Category" followed by values like "GROCERY STORES, SUPERMARKETS" (= groceries), "RESTAURANTS" (= dining-out), "GAS STATIONS" (= transportation), "DEPARTMENT STORES" (= shopping), etc.
   - Transaction description labeled "Transaction description" — use this for additional context but prefer merchant name as the description
   - Address under "Merchant info" section = location

OCR Text:
${text}

${ocrConfidence ? `OCR Confidence: ${(ocrConfidence * 100).toFixed(1)}%` : ''}

Extract the following and respond in JSON:
- amount: The total amount as a positive number (no currency symbols). Strip any minus sign. For bank screens, it's usually the large dollar figure near the top right after the merchant name.
- description: Clean merchant/store name (e.g. "Nelia African Market" not the raw transaction description string)
- category: Best match from: groceries, dining-out, transportation, entertainment, shopping, health, self-care, hobbies, gifts, charity, household-supplies, subscriptions, education, travel, utilities, other. Map bank category labels: GROCERY STORES → groceries, RESTAURANTS → dining-out, GAS STATIONS → transportation, DEPARTMENT STORES → shopping.
- merchant: The business/store name
- date: Transaction date in ISO format (YYYY-MM-DD). Parse "MM/DD/YYYY" format correctly.
- paymentMethod: credit-card, debit-card, cash, check, or digital-wallet. "Card Tapped" and "Card Swiped" = debit-card. "Tap to Pay" = digital-wallet.
- location: Address or city/state if found
- confidence: 0.0 to 1.0 — use 0.85+ for clear bank transaction screens
- reasoning: Brief explanation

If a field cannot be determined, omit it. Prioritize accuracy.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert expense parsing assistant. You handle two types of documents: (1) traditional receipts where the total is at the bottom, and (2) bank/card app transaction detail screens where the amount appears near the top right after the merchant name, alongside fields like 'Transaction: MM/DD/YYYY', 'Method: Card Tapped', and 'Category: GROCERY STORES'. Always extract the amount regardless of its position or formatting. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI service");
      }

      const parsed = JSON.parse(content);
      
      // Validate the response
      const validated = ExpenseParseSchema.parse(parsed);
      
      // Adjust confidence based on OCR confidence if available
      if (ocrConfidence && validated.confidence) {
        validated.confidence = Math.min(validated.confidence, ocrConfidence);
      }
      
      return validated;
    } catch (error) {
      console.error("AI parsing failed:", error);
      
      // Return a low-confidence fallback
      return {
        confidence: 0.1,
        reasoning: `Failed to parse expense data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async categorizePurchase(description: string): Promise<{
    category: string;
    confidence: number;
    reasoning: string;
  }> {
    try {
      const prompt = `
Categorize this purchase description into one of these categories:
groceries, dining-out, transportation, entertainment, shopping, health, self-care, hobbies, gifts, charity, household-supplies, subscriptions, education, travel, utilities, other

Purchase: "${description}"

Respond in JSON format with:
- category: The best matching category
- confidence: Your confidence (0.0 to 1.0)  
- reasoning: Brief explanation
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI service");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("AI categorization failed:", error);
      return {
        category: "other",
        confidence: 0.1,
        reasoning: "Failed to categorize"
      };
    }
  }

  async enhanceExpenseDescription(rawDescription: string): Promise<{
    cleanDescription: string;
    suggestedMerchant: string;
    confidence: number;
  }> {
    try {
      const prompt = `
Clean up and enhance this expense description from OCR text:
"${rawDescription}"

Respond in JSON format with:
- cleanDescription: A clean, readable description
- suggestedMerchant: The likely merchant/business name
- confidence: Your confidence in the cleanup (0.0 to 1.0)
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI service");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("AI enhancement failed:", error);
      return {
        cleanDescription: rawDescription,
        suggestedMerchant: rawDescription,
        confidence: 0.1
      };
    }
  }
}

export const aiService = new AIService();
