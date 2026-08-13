import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export interface ParsedBillInfo {
  company: string | null;
  accountNumber: string | null;
  amount: string | null;
  minimumPayment: string | null;
  dueDate: Date | null;
  category: string | null;
  description: string | null;
  confidence: number;
  // Payee address fields
  payeeAddress: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  // Recurring bill fields
  isRecurring: boolean;
  recurringType: "payment_plan" | "monthly" | "weekly" | "biweekly" | "yearly" | "custom" | null;
  installments: Array<{
    amount: string;
    dueDate: Date;
    installmentNumber: number;
    isPaid: boolean;
  }> | null;
  totalInstallments: number | null;
  originalAmount: string | null; // Total amount across all installments
}

export interface RecurringBillSeries {
  seriesId: string;
  company: string;
  accountNumber: string | null;
  category: string | null;
  description: string;
  recurringType: "payment_plan" | "monthly" | "weekly" | "biweekly" | "yearly" | "custom";
  totalAmount: string;
  installments: Array<{
    amount: string;
    dueDate: Date;
    installmentNumber: number;
  }>;
}

export class AIParserService {
  // Helper method to parse dates in local timezone (avoids UTC conversion issues)
  private parseLocalDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    // If it's already a proper format like "2025-09-18", parse it manually to avoid UTC conversion
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // For other formats, try normal parsing but ensure it's in local timezone
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Fallback to current date if parsing fails
    return new Date();
  }

  async parseBillInformation(extractedText: string): Promise<ParsedBillInfo> {
    try {
      console.log('Starting AI parsing for extracted text, length:', extractedText.length);
      console.log('--- EXTRACTED TEXT FOR PARSING (first 800 chars) ---');
      console.log(extractedText.substring(0, 800));
      console.log('--- END EXTRACTED TEXT SAMPLE ---');
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text provided for AI parsing');
      }
      
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      if (!openai) throw new Error("OpenAI is not configured yet");

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an expert at parsing financial documents, bills, and statements from extracted text.
            You specialize in credit card statements, bank statements, utility bills, and various invoice types.
            
            DOCUMENT TYPES YOU MUST HANDLE:
            
            1. CREDIT CARD STATEMENTS (including partial/summary sections):
            - Look for: Bank names (Synchrony, Chase, Capital One, Citi, American Express, Discover, Bank of America)
            - Card types: Amazon Prime, secured cards, rewards cards
            - Key fields: Statement date, due date, minimum payment, total balance, account numbers
            - Common patterns: "Prime Secured Card", "Statement Date", "Payment Due Date", "Minimum Payment Due"
            - Rewards info: "Rewards Earned", "Cashback", "Points"
            - PARTIAL DOCUMENTS: Even if only showing rewards summary or partial info, identify what you can
            - CONTEXT CLUES: Use any available information to make educated identifications
            
            2. BANK STATEMENTS:
            - Monthly account statements, checking/savings summaries
            - Look for account balances, statement periods, bank names
            
            3. UTILITY BILLS:
            - Electric, gas, water, trash, internet, phone
            - Companies: ConEd, PSE&G, National Grid, Comcast, Verizon, AT&T
            
            4. MEDICAL/INSURANCE:
            - Medical bills, insurance statements, EOBs
            - Look for patient names, service dates, amounts due
            
            5. OTHER BILLS:
            - Rent, mortgage, subscription services, shopping receipts
            
            CATEGORY MAPPING:
            - Credit Card: Any credit card statement (Synchrony, Chase, Capital One, Citi, Amex, Discover, etc.)
            - Banking: Bank statements, account summaries
            - Utilities: Electric, gas, water, trash service
            - Internet: Internet/cable providers
            - Phone: Mobile/landline service providers
            - Medical: Healthcare, insurance, dental, vision
            - Insurance: Auto, home, life insurance
            - Shopping: Retail purchases, online orders
            - Subscription: Streaming, software, membership fees
            
            PAYMENT PLANS: Look for payment plans, installment schedules, or recurring payments:
            - "Payment 1: Sep 19, 2025 - $23.97"
            - "Installment breakdown:"
            - "Your plan summary:"
            - "Weekly payments of $33.60"
            - "Installment 1", "Installment 2", etc.
            
            IMPORTANT FOR INSTALLMENTS:
            - Extract ALL installments including the FIRST one
            - Amounts may have asterisks (*) or other symbols - IGNORE these and extract the numeric value
            - Example: "$98.60 *" should be extracted as "98.60"
            - The first installment often has a different amount than subsequent ones - capture it accurately
            - Each installment MUST have its own amount, even if different from others
            
            EXTRACTION RULES:
            
            For CREDIT CARD STATEMENTS specifically:
            - Company: Extract the bank name (e.g., "Synchrony Bank", "Chase", "Capital One") 
            - Description: Include card type (e.g., "Amazon Prime Secured Card", "Chase Freedom")
            - Amount: Look for "Minimum Payment Due", "Amount Due", "Payment Amount", "New Balance", "Total Balance"
            - Due Date: Find "Payment Due Date", "Due Date", "Pay By", dates in MM/DD/YYYY format
            - Account: Look for masked account numbers, card numbers, reference numbers
            - Balance: Total balance, current balance, outstanding balance
            
            IMPORTANT: Payment information can appear ANYWHERE in the document:
            - Scan ALL sections: headers, body, footers, sidebars, summary sections
            - Look for payment info in any page of multi-page documents
            - Due dates can be in various formats and locations
            - Minimum payments might be in summary tables, payment coupons, or account details
            - Check every section thoroughly - don't assume location
            
            For ALL DOCUMENTS - COMPREHENSIVE SCANNING:
            - Scan EVERY PAGE and EVERY SECTION of multi-page documents
            - Look for dollar amounts with $ symbols anywhere in the text
            - Extract company names from headers, footers, watermarks, or any location
            - Find due dates in any format: MM/DD/YYYY, Month Day Year, etc.
            - Account numbers can appear in headers, footers, or body text
            - Payment information might be in tables, summary sections, or payment stubs
            - Don't miss information just because it's in an unexpected location
            
            Return your response as JSON with these fields:
            - company: string (exact company/issuer name from document)
            - accountNumber: string (account number, card number, or reference number)
            - amount: string (primary amount due - minimum payment for credit cards, total due for others)
            - minimumPayment: string (minimum payment due for credit cards, null for others)
            - totalBalance: string (total balance for credit cards, null for others)
            - dueDate: string (payment due date in ISO format YYYY-MM-DD)
            - statementDate: string (statement/bill date in ISO format YYYY-MM-DD)
            - category: string (Credit Card, Banking, Utilities, Internet, Phone, Medical, Insurance, Shopping, Subscription, Other)
            - description: string (descriptive title including card type, service type, etc.)
            - confidence: number (confidence score 0-1 for extraction accuracy)
            - payeeAddress: object with fields {name, address1, address2, city, state, zip, country} (payment address/mailing address where checks should be sent, typically found at bottom of bills or payment stubs)
            
            For recurring bills and payment plans:
            - isRecurring: boolean (true if this is a payment plan or installment schedule)
            - recurringType: string ("payment_plan" for installments, "weekly", "monthly", etc.)
            - installments: array of objects with {amount: string, dueDate: string, installmentNumber: number, isPaid: boolean}
            - totalInstallments: number (total number of payments in the plan)
            - originalAmount: string (total amount owed across all installments)
            
            DETECTING PAID INSTALLMENTS:
            - Look for checkmarks (✓, ✔), "Paid" labels, green indicators, or completion markers
            - Past dates with payment confirmation are likely paid
            - Set isPaid: true for installments that show as already paid
            - Set isPaid: false for upcoming/unpaid installments
            - If uncertain, default to isPaid: false
            
            EXTRACTING INSTALLMENT DATES (CRITICAL):
            - Each installment MUST have a dueDate - never return null for installment dates
            - Parse dates like "January 8", "Jan 29", "February 13" into ISO format (YYYY-MM-DD)
            - If only month/day is given, assume the current or next occurrence of that date (2025/2026)
            - For dates in the past within the last 30 days, use the current year
            - For future dates, use the current year or next year as appropriate
            - Example: "January 29" → "2026-01-29", "February 13" → "2026-02-13"
            
            If this is NOT a recurring/installment bill, set isRecurring to false and other recurring fields to null.
            If a field cannot be determined, return null for that field.`
          },
          {
            role: "user",
            content: `Extract bill information from this text. Even if this appears to be a partial document (like just a rewards summary), identify what you can from the available information:\n\n${extractedText}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log('--- AI PARSING RESULT ---');
      console.log(JSON.stringify(result, null, 2));
      console.log('--- END AI RESULT ---');
      
      // Process installments if they exist
      let installments = null;
      if (result.installments && Array.isArray(result.installments)) {
        installments = result.installments.map((inst: any) => ({
          amount: inst.amount || "0",
          dueDate: this.parseLocalDate(inst.dueDate),
          installmentNumber: inst.installmentNumber || 1,
          isPaid: inst.isPaid === true
        }));
      }

      console.log('=== AI PARSER FINAL VALUES ===');
      console.log('result.amount:', result.amount, 'type:', typeof result.amount);
      console.log('result.minimumPayment:', result.minimumPayment, 'type:', typeof result.minimumPayment);
      
      // Clean currency symbols for database (keep as string for Drizzle decimal type)
      const cleanAmount = result.amount 
        ? result.amount.toString().replace(/[\$,]/g, '').trim()
        : (result.minimumPayment ? result.minimumPayment.toString().replace(/[\$,]/g, '').trim() : null);
      const cleanMinPayment = result.minimumPayment 
        ? result.minimumPayment.toString().replace(/[\$,]/g, '').trim()
        : null;
      
      // Validate that cleaned amounts are valid numbers
      const validAmount = cleanAmount && !isNaN(parseFloat(cleanAmount)) ? cleanAmount : null;
      const validMinPayment = cleanMinPayment && !isNaN(parseFloat(cleanMinPayment)) ? cleanMinPayment : null;
      
      console.log('Cleaned amount (string):', validAmount, 'valid number:', !isNaN(parseFloat(validAmount || '0')));
      console.log('Cleaned minimumPayment (string):', validMinPayment, 'valid number:', !isNaN(parseFloat(validMinPayment || '0')));
      
      return {
        company: result.company || null,
        accountNumber: result.accountNumber || null,
        amount: validAmount,
        minimumPayment: validMinPayment,
        dueDate: result.dueDate ? this.parseLocalDate(result.dueDate) : (result.statementDate ? this.parseLocalDate(result.statementDate) : null),
        category: result.category || null,
        description: result.description || null,
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        payeeAddress: result.payeeAddress || null,
        isRecurring: Boolean(result.isRecurring),
        recurringType: result.recurringType || null,
        installments,
        totalInstallments: result.totalInstallments || null,
        originalAmount: result.originalAmount || null
      };
    } catch (error) {
      console.error('AI parsing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('AI parsing error details:', errorMessage);
      
      // Fallback: try to extract basic information using regex patterns
      console.log('Falling back to regex parsing...');
      return this.fallbackParsing(extractedText);
    }
  }

  private fallbackParsing(text: string): ParsedBillInfo {
    console.log('Using fallback parsing for text:', text.substring(0, 500));
    
    // Enhanced regex patterns for credit card statements and bills
    const amountPattern = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g;
    const accountPattern = /(?:account|acct|card)[\s#:]*([•*\d]{4,})/gi;
    
    // Credit card specific patterns - more precise matching
    const creditCardCompanies = /\b(synchrony|syncbank)\b|\bchase\b(?!\s*purchases)|\bcapital one\b|\bciti\b|\bcitibank\b|\bamerican express\b|\bamex\b|\bdiscover\b|\bbank of america\b|\bwells fargo\b/gi;
    const cardTypePattern = /\bprime secured card\b|\bamazon\b(?=\.com|\s+prime|\s+card)|\bvisa\b|\bmastercard\b|\bamex\b/gi;
    const rewardsPattern = /rewards earned[^$]*\$(\d+\.?\d*)/gi;
    const amazonPattern = /(amazon\.com|syncbank\.com\/amazon)/gi;
    
    const amounts = text.match(amountPattern);
    const dates = text.match(datePattern);
    const accounts = text.match(accountPattern);
    const companies = text.match(creditCardCompanies);
    const cardTypes = text.match(cardTypePattern);
    const rewards = text.match(rewardsPattern);
    const amazonRefs = text.match(amazonPattern);
    
    let dueDate: Date | null = null;
    if (dates && dates.length > 0) {
      try {
        dueDate = new Date(dates[dates.length - 1]); // Use last date found
      } catch {
        dueDate = null;
      }
    }
    
    // Determine company name with better logic
    let company: string | null = null;
    
    // Look for Synchrony/syncbank specifically
    const syncMatch = text.match(/\b(synchrony|syncbank)\b/gi);
    if (syncMatch || amazonRefs) {
      company = 'Synchrony Bank';
    } else if (companies && companies.length > 0) {
      // Use the first valid company match
      company = companies[0];
    }
    
    // Determine category first
    let category: string | null = null;
    if (companies || cardTypes || text.toLowerCase().includes('card') || text.toLowerCase().includes('credit')) {
      category = "Credit Card";
    }
    
    // For documents with limited info, try to infer from context
    if (!company && text.toLowerCase().includes('rewards') && text.includes('$')) {
      // This appears to be a credit card rewards summary
      company = 'Credit Card Company';
      category = 'Credit Card';
    }
    
    // Add card type information
    if (company && cardTypes && cardTypes.length > 0) {
      const cardType = cardTypes[0].toLowerCase().includes('prime') ? 'Prime Secured Card' : cardTypes[0];
      company += ` (${cardType})`;
    } else if (company === 'Synchrony Bank' && amazonRefs && amazonRefs.length > 0) {
      company += ' (Amazon Prime Card)';
    }
    
    
    // For credit card statements, look for amounts
    let amount: string | null = null;
    if (amounts && amounts.length > 0) {
      // Sort amounts and pick the most relevant one
      const sortedAmounts = amounts
        .map(a => parseFloat(a.replace(/\$|,/g, '')))
        .filter(a => a > 0 && a < 50000) // Reasonable range
        .sort((a, b) => a - b);
      
      if (sortedAmounts.length > 0) {
        // For rewards summaries, use the reward amount
        amount = sortedAmounts[0].toString();
      }
    }
    
    // If no amount found but we have context, try to extract from rewards patterns
    if (!amount && text.toLowerCase().includes('rewards earned')) {
      const rewardAmount = text.match(/\$(\d+\.?\d*)/);
      if (rewardAmount) {
        amount = rewardAmount[1];
      }
    }
    
    return {
      company,
      accountNumber: accounts ? accounts[0].replace(/[^\d•*]/g, '') : null,
      amount,
      minimumPayment: amount, // Same as amount for fallback
      dueDate,
      category,
      description: company ? `${company} statement` : "Credit card or financial statement",
      confidence: 0.4, // Slightly higher confidence for enhanced fallback
      payeeAddress: null, // Fallback parsing can't extract addresses
      isRecurring: true, // Assume credit cards are recurring
      recurringType: "monthly",
      installments: null,
      totalInstallments: null,
      originalAmount: null
    };
  }
}
