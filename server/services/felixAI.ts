import OpenAI from "openai";
import { storage } from "../storage.js";
import { Bill } from "@shared/schema";
import { format, addDays, startOfDay } from "date-fns";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface FelixResponse {
  response: string;
  messageType: "general" | "bill_add" | "bill_query" | "bill_update" | "financial_insight" | "reminder_request";
  actionTaken?: {
    billCreated?: string;
    billUpdated?: string;
    reminderSet?: string;
    query?: string;
  };
}

export class FelixAIService {
  async processMessage(userId: string, message: string): Promise<FelixResponse> {
    try {
      // Get user's current bills for context
      const userBills = await storage.getBillsByUser(userId);
      const billsContext = this.formatBillsForContext(userBills);

      const systemPrompt = `You are Felix, a helpful and friendly personal bill assistant. You help users manage their bills, track payments, and provide financial insights.

Current user's bills:
${billsContext}

Your capabilities:
1. Answer questions about bills (what's due, overdue, upcoming)
2. Provide financial insights and summaries
3. Calculate totals and provide specific amounts
4. Add new bills when requested

When answering questions:
- Always provide specific amounts and dates from the actual bill data above
- For "this week" queries, check bills due in the next 7 days
- For "next week" queries, check bills due in days 8-14 from now
- Be specific with dollar amounts and company names
- If no bills match the criteria, say so clearly

Current date: ${format(new Date(), 'yyyy-MM-dd')}

Respond naturally and helpfully with the actual bill information.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }, {
        timeout: 30000,
      });

      const aiResponse = response.choices[0].message.content;
      console.log("Full AI Response:", aiResponse);
      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      return {
        response: aiResponse,
        messageType: "general",
      };

    } catch (error) {
      console.error("Felix AI error:", error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
        messageType: "general",
      };
    }
  }

  private formatBillsForContext(bills: Bill[]): string {
    if (bills.length === 0) {
      return "No bills currently tracked.";
    }

    return bills
      .map(bill => 
        `- ${bill.company}: $${bill.amount} due ${format(new Date(bill.dueDate), 'MMM d, yyyy')} (${bill.status})`
      )
      .join('\n');
  }
}
