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
  payeeAddress: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  isRecurring: boolean;
  recurringType: "payment_plan" | "monthly" | "weekly" | "biweekly" | "yearly" | "custom" | null;
  installments: Array<{
    amount: string;
    dueDate: Date | null;
    installmentNumber: number;
    isPaid: boolean;
  }> | null;
  totalInstallments: number | null;
  originalAmount: string | null;
}

export interface ParsedBillDocument {
  bills: ParsedBillInfo[];
  confidence: number;
  warnings: string[];
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
  private parseLocalDate(dateString?: string | null): Date | null {
    if (!dateString) {
      return null;
    }

    const iso = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const [, year, month, day] = iso;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private splitDocumentSections(extractedDocument: string): Array<{ name: string; text: string }> {
    const document = extractedDocument.replace(/\r\n/g, "\n").trim();
    if (!document) {
      return [];
    }

    const segments = document.split(/(?=\n===\s*FILE\b|\n---\s*PAGE\b|\n\s*---\s*PAGE\b)/i);
    if (segments.length > 1) {
      return segments
        .map((segment, index) => ({ name: `section-${index + 1}`, text: segment.trim() }))
        .filter((segment) => segment.text.length > 0);
    }

    return [{ name: "document", text: document }];
  }

  private normalizeBill(result: any): ParsedBillInfo {
    const amountValue = result?.amount ?? result?.minimumPayment ?? null;
    const parseAmount = (value: unknown): string | null => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const cleaned = String(value).replace(/[$,*\s]/g, "").trim();
      const match = cleaned.match(/-?\d+(?:\.\d+)?/);
      return match ? match[0] : null;
    };

    const bill: ParsedBillInfo = {
      company: result?.company || null,
      accountNumber: result?.accountNumber || null,
      amount: parseAmount(amountValue),
      minimumPayment: parseAmount(result?.minimumPayment ?? null),
      dueDate: result?.dueDate ? this.parseLocalDate(result.dueDate) : null,
      category: result?.category || null,
      description: result?.description || null,
      confidence: Number.isFinite(Number(result?.confidence)) ? Math.max(0, Math.min(1, Number(result.confidence))) : 0,
      payeeAddress: result?.payeeAddress || null,
      isRecurring: Boolean(result?.isRecurring),
      recurringType: result?.recurringType || null,
      installments: Array.isArray(result?.installments)
        ? result.installments.map((inst: any) => ({
            amount: parseAmount(inst?.amount) || "0",
            dueDate: inst?.dueDate ? this.parseLocalDate(inst.dueDate) : null,
            installmentNumber: Number(inst?.installmentNumber || 1),
            isPaid: Boolean(inst?.isPaid),
          }))
        : null,
      totalInstallments: result?.totalInstallments ?? null,
      originalAmount: parseAmount(result?.originalAmount ?? null),
    };

    if (!bill.amount && result?.minimumPayment) {
      bill.amount = parseAmount(result.minimumPayment);
    }

    if (bill.dueDate === null && result?.statementDate) {
      bill.dueDate = this.parseLocalDate(result.statementDate);
    }

    return bill;
  }

  private async parseSingleBillSection(extractedText: string): Promise<ParsedBillInfo | null> {
    try {
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text provided for AI parsing");
      }

      if (!openai) {
        throw new Error("OpenAI is not configured yet");
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are parsing extracted OCR text from uploaded bills. The uploaded document may contain one bill or multiple independent bills. Identify every distinct bill. Do not merge separate companies/accounts into one bill. A single bill may span multiple pages, so do not assume every page is a separate bill. Use issuer/company, account number, invoice number, statement period, and document headers to determine bill boundaries. Return valid JSON with a top-level "bills" array. Each item should match the ParsedBillInfo shape. If a field is unknown, use null.`
          },
          {
            role: "user",
            content: extractedText
          }
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}") as any;
      const candidates = Array.isArray(parsed?.bills) ? parsed.bills : [parsed];
      const normalized = candidates.map((item: any) => this.normalizeBill(item)).filter((item) => item && (item.company || item.amount || item.description || item.dueDate));

      if (normalized.length > 0) {
        return normalized[0];
      }

      return null;
    } catch (error) {
      console.error({
        stage: "ai-parser",
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
        extractedTextLength: extractedText?.length ?? 0,
      });

      return this.fallbackParsing(extractedText);
    }
  }

  async parseBillInformation(extractedDocument: string): Promise<ParsedBillDocument> {
    const sanitizedDocument = extractedDocument || "";
    if (!sanitizedDocument.trim()) {
      return {
        bills: [],
        confidence: 0,
        warnings: ["No bill text was provided for parsing."],
      };
    }

    const sections = this.splitDocumentSections(sanitizedDocument);
    const bills: ParsedBillInfo[] = [];
    const warnings: string[] = [];
    let confidence = 0;

    for (const section of sections) {
      const parsedBill = await this.parseSingleBillSection(section.text);
      if (parsedBill) {
        bills.push(parsedBill);
        confidence = Math.max(confidence, parsedBill.confidence);
      }
    }

    if (bills.length === 0) {
      const fallbackBill = this.fallbackParsing(sanitizedDocument);
      bills.push(fallbackBill);
      confidence = fallbackBill.confidence;
      warnings.push("Fallback parsing was used because no bill fields could be extracted.");
    }

    return {
      bills,
      confidence,
      warnings,
    };
  }

  private fallbackParsing(text: string): ParsedBillInfo {
    const lower = text.toLowerCase();
    const companyMatch = text.match(/\b(synchrony|syncbank|capital one|chase|citi|citibank|american express|amex|discover|bank of america|wells fargo)\b/gi);
    const amazonMatch = text.match(/amazon/i);
    const cardTypeMatch = text.match(/(?:amazon\s+prime|prime secured|visa|mastercard|amex)/gi);

    let company: string | null = companyMatch && companyMatch.length > 0 ? companyMatch[0] : null;
    if (amazonMatch && !company) {
      company = "Amazon";
    }
    if (company && /synchrony|syncbank/i.test(company)) {
      company = "Synchrony Bank";
      if (amazonMatch) {
        company += " (Amazon Prime Card)";
      }
    } else if (company && /amazon/i.test(company)) {
      company = "Amazon";
    }

    if (!company && (lower.includes("credit") || lower.includes("card") || lower.includes("payment due"))) {
      company = "Credit Card Company";
    }

    const matchCurrency = (pattern: RegExp): string | null => {
      const matches = text.match(pattern);
      if (!matches || matches.length === 0) return null;
      const candidate = (matches[1] || matches[0]).replace(/[$,]/g, "").trim();
      const numeric = candidate.match(/-?\d+(?:\.\d+)?/);
      return numeric ? numeric[0] : null;
    };

    const totalMinimumDue =
      matchCurrency(/total minimum payment due\s*[:\-]?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/i) ||
      matchCurrency(/minimum payment due\s*[:\-]?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/i) ||
      matchCurrency(/amount due\s*[:\-]?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/i) ||
      null;

    const newBalance =
      matchCurrency(/new balance\s*[:\-]?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/i) ||
      matchCurrency(/balance\s*[:\-]?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/i) ||
      null;

    const amount = totalMinimumDue || newBalance || null;
    const minimumPayment = totalMinimumDue || amount || null;

    const matchDate = (pattern: RegExp): Date | null => {
      const match = text.match(pattern);
      if (!match) return null;
      const parsed = new Date(match[1] || match[0]);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const dueDate =
      matchDate(/payment due date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      matchDate(/due date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      null;

    let category: string | null = null;
    if (lower.includes("minimum payment") || lower.includes("payment due") || lower.includes("new balance") || lower.includes("credit") || lower.includes("card") || (company && /synchrony|chase|capital one|citi|discover|bank of america|wells fargo|amex/i.test(company))) {
      category = "Credit Card";
    } else if (lower.includes("water") || lower.includes("electric") || lower.includes("utility")) {
      category = "Utilities";
    } else if (lower.includes("internet") || lower.includes("comcast") || lower.includes("verizon") || lower.includes("att")) {
      category = "Internet";
    } else if (lower.includes("phone") || lower.includes("mobile")) {
      category = "Phone";
    }

    const description = company ? `${company}${cardTypeMatch ? ` (${cardTypeMatch[0]})` : ""}` : "Financial statement";

    return {
      company,
      accountNumber: null,
      amount,
      minimumPayment,
      dueDate,
      category,
      description,
      confidence: amount || dueDate || company ? 0.4 : 0,
      payeeAddress: null,
      isRecurring: false,
      recurringType: null,
      installments: null,
      totalInstallments: null,
      originalAmount: null,
    };
  }
}
