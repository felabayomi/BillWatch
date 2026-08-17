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
  private parseLabeledBill(text: string): ParsedBillInfo | null {
  if (!text || !text.trim()) {
    return null;
  }

  const normalized = text.replace(/\r/g, "");

  const companyPatterns = [
    /Bill issued by:\s*([^,\n]+)/i,
    /payable to\s+([A-Za-z0-9 .&'-]+)/i,
    /\b(Potomac Edison)\b/i,
  ];

  let company: string | null = null;

  for (const pattern of companyPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      company = match[1].trim();
      break;
    }
  }

  const amountPatterns = [
    /Amount Due(?:\s+by\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4})?\s*:?\s*\$?\s*([\d,]+\.\d{2})/i,
    /Total Current Charges\s+\$?\s*([\d,]+\.\d{2})/i,
    /Please Pay\s+\$?\s*([\d,]+\.\d{2})/i,
  ];

  let amount: string | null = null;

  for (const pattern of amountPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      amount = match[1].replace(/,/g, "");
      break;
    }
  }

  const dueDatePatterns = [
    /Due Date\s*:?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
    /Amount Due by\s+([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i,
  ];

  let dueDate: Date | null = null;

  for (const pattern of dueDatePatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      dueDate = this.parseLocalDate(match[1]);
      if (dueDate) break;
    }
  }

  const accountMatch =
    normalized.match(
      /Account Number\s*:?\s*([0-9][0-9\s-]{4,})/i
    );

  const accountNumber = accountMatch?.[1]
    ? accountMatch[1].trim().replace(/\s+/g, " ")
    : null;

  if (!company && !amount && !dueDate && !accountNumber) {
    return null;
  }

  return {
    company,
    accountNumber,
    amount,
    minimumPayment: null,
    dueDate,
    category: "Utilities",
    description: company
      ? `${company} utility bill`
      : "Utility bill",
    confidence:
      company && amount && dueDate
        ? 0.95
        : 0.7,
    payeeAddress: null,
    isRecurring: true,
    recurringType: "monthly",
    installments: null,
    totalInstallments: null,
    originalAmount: null,
  };
}
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

  private parseInstallmentDueDate(dueText: string | null | undefined): Date | null {
    if (!dueText || !dueText.trim()) {
      return null;
    }

    const normalized = dueText.trim().replace(/^due\s+/i, "");
    const monthMatch = normalized.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    const dayMatch = normalized.match(/\b(\d{1,2})\b/);

    if (!monthMatch || !dayMatch) {
      return null;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.findIndex((month) => month.toLowerCase() === monthMatch[1].toLowerCase());
    const day = Number(dayMatch[1]);

    if (monthIndex === -1 || !Number.isFinite(day)) {
      return null;
    }

    const year = new Date().getFullYear();
    const parsed = new Date(year, monthIndex, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseInstallmentRows(text: string): ParsedBillInfo[] {
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const matches: ParsedBillInfo[] = [];

    for (const row of rows) {
      const rowMatch = row.match(/^(?<company>[A-Za-z0-9&.()\/\- ]+?)\s+\$?(?<amount>\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\s+(?<installmentNumber>\d+)\s+of\s+(?<totalInstallments>\d+)\s+(?:due\s+)?(?<dueText>.*)$/i);

      if (!rowMatch?.groups) continue;

      const company = (rowMatch.groups.company || "").trim();
      const amount = rowMatch.groups.amount.replace(/,/g, "");
      const installmentNumber = Number(rowMatch.groups.installmentNumber);
      const totalInstallments = Number(rowMatch.groups.totalInstallments);
      const dueText = rowMatch.groups.dueText?.trim();
      const dueDate = this.parseInstallmentDueDate(dueText);

      if (!company || !Number.isFinite(installmentNumber) || !Number.isFinite(totalInstallments)) continue;

      matches.push({
        company,
        accountNumber: null,
        amount,
        minimumPayment: amount,
        dueDate,
        category: "Credit Card",
        description: `${company} payment plan`,
        confidence: 0.95,
        payeeAddress: null,
        isRecurring: true,
        recurringType: "payment_plan",
        installments: [{
          amount,
          dueDate,
          installmentNumber,
          isPaid: false,
        }],
        totalInstallments,
        originalAmount: amount,
      });
    }

    return matches;
  }

    private async parseSingleBillSection(
    extractedText: string
  ): Promise<ParsedBillInfo[]> {
    if (!extractedText || extractedText.trim().length === 0) {
      return [];
    }

    // First: detect multiple installment/payment-plan rows.
    const installmentRows = this.parseInstallmentRows(extractedText);

    if (installmentRows.length > 0) {
      return installmentRows;
    }

    // Second: try the fast deterministic parser.
    const deterministicBill = this.parseLabeledBill(extractedText);

    if (
      deterministicBill &&
      deterministicBill.company &&
      deterministicBill.amount &&
      deterministicBill.dueDate &&
      deterministicBill.confidence >= 0.9
    ) {
      console.log({
        stage: "deterministic-parser",
        matched: true,
        confidence: deterministicBill.confidence,
      });

      return [deterministicBill];
    }

    // Third: use OpenAI only when deterministic parsing
    // could not confidently identify the bill.
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content:
                `You are parsing extracted OCR text from uploaded bills. ` +
                `The uploaded document may contain one bill or multiple independent bills. ` +
                `Identify every distinct bill. Do not merge separate companies/accounts into one bill. ` +
                `A single bill may span multiple pages, so do not assume every page is a separate bill. ` +
                `Use issuer/company, account number, invoice number, statement period, and document headers ` +
                `to determine bill boundaries. Return valid JSON with a top-level "bills" array. ` +
                `Each item should match the ParsedBillInfo shape. ` +
                `If a field is unknown, use null.`,
            },
            {
              role: "user",
              content: extractedText,
            },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(
          response.choices[0]?.message?.content || "{}"
        ) as any;

        const candidates = Array.isArray(parsed?.bills)
          ? parsed.bills
          : [parsed];

        const normalized = candidates
          .map((item: any) => this.normalizeBill(item))
          .filter(
            (item) =>
              item &&
              (
                item.company ||
                item.amount ||
                item.description ||
                item.dueDate
              )
          );

        if (normalized.length > 0) {
          return normalized;
        }
      } catch (error) {
        console.error({
          stage: "ai-parser",
          errorName:
            error instanceof Error ? error.name : "unknown",
          errorMessage:
            error instanceof Error
              ? error.message
              : String(error),
          extractedTextLength: extractedText.length,
        });
      }
    }

    // Final fallback: keep a partially detected bill if one exists.
    if (deterministicBill) {
      return [deterministicBill];
    }

    // This function must ALWAYS return an array.
    return [];
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
      const parsedBills = await this.parseSingleBillSection(section.text);
      if (parsedBills.length > 0) {
        bills.push(...parsedBills);
        confidence = Math.max(confidence, ...parsedBills.map((bill) => bill.confidence));
      }
    }

    if (bills.length === 0) {
      warnings.push("No valid bill candidates could be extracted from this document.");
      return {
        bills: [],
        confidence: 0,
        warnings,
      };
    }

    return {
      bills,
      confidence,
      warnings,
    };
  }

  private fallbackParsing(text: string): ParsedBillInfo {
    return {
      company: null,
      accountNumber: null,
      amount: null,
      minimumPayment: null,
      dueDate: null,
      category: null,
      description: null,
      confidence: 0,
      payeeAddress: null,
      isRecurring: false,
      recurringType: null,
      installments: null,
      totalInstallments: null,
      originalAmount: null,
    };
  }
}
