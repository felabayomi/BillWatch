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

  // Detect documents that represent an already-paid receipt/payment.
  const isPaidReceipt =
    /\b(receipt|payment receipt)\b/i.test(normalized) &&
    /\b(amount paid|date paid|paid on|payment date)\b/i.test(normalized);

  // -----------------------------
  // Company / vendor
  // -----------------------------
  const companyPatterns = [
    /Bill issued by:\s*([^,\n]+)/i,
    /payable to\s+([A-Za-z0-9 .&'-]+)/i,
    /\b(Potomac Edison)\b/i,

    // Receipt / invoice formats
    /(?:Merchant|Vendor|Company)\s*:??\s*([^\n]+)/i,
    /(?:Sold by|Paid to)\s*:??\s*([^\n]+)/i,
  ];

  let company: string | null = null;

  for (const pattern of companyPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      company = match[1].trim();
      break;
    }
  }

  // Stripe-style receipts often put the company near the top without
  // explicitly labeling it "Vendor".
  if (!company && isPaidReceipt) {
    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const ignoredLine =
      /^(?:---\s*page\s+\d+\s*---|page\s+\d+\s+of\s+\d+|receipt|invoice|payment receipt|amount paid|date paid|payment method|subtotal|tax|total|description|quantity|qty|unit price|price|amount|bill to)$/i;

    const candidate = lines.find(
      (line) =>
        line.length >= 2 &&
        line.length <= 100 &&
        !ignoredLine.test(line) &&
        !/^\$?\d+(?:\.\d{2})?$/.test(line) &&
        !/^(https?:\/\/|www\.)/i.test(line) &&
        !/^(invoice number|receipt number|date paid)\b/i.test(line)
    );

    if (candidate) {
      company = candidate;
    }
  }

  // -----------------------------
  // Amount
  // -----------------------------
  const amountPatterns = [
    // Prefer actual amount paid on receipts.
    /Amount Paid\s*:?\s*\$?\s*([\d,]+\.\d{2})/i,
    /Total Paid\s*:?\s*\$?\s*([\d,]+\.\d{2})/i,

    // Normal unpaid bills.
    /Amount Due(?:\s+by\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4})?\s*:?\s*\$?\s*([\d,]+\.\d{2})/i,
    /Total Current Charges\s+\$?\s*([\d,]+\.\d{2})/i,
    /Please Pay\s+\$?\s*([\d,]+\.\d{2})/i,

    // Generic receipt total as a last deterministic option.
    /\bTotal\s*:?\s*\$?\s*([\d,]+\.\d{2})/i,
  ];

  let amount: string | null = null;

  for (const pattern of amountPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      amount = match[1].replace(/,/g, "");
      break;
    }
  }

  // -----------------------------
  // Date
  // -----------------------------
  const dueDatePatterns = [
    /Due Date\s*:?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
    /Amount Due by\s+([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i,

    // Paid receipts do not have a due date. Use the transaction/payment
    // date as the effective date for the existing ParsedBillInfo model.
    /Date Paid\s*:?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
    /Paid On\s*:?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
    /Payment Date\s*:?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
  ];

  let dueDate: Date | null = null;

  for (const pattern of dueDatePatterns) {
    const match = normalized.match(pattern);

    if (match?.[1]) {
      dueDate = this.parseLocalDate(match[1]);
      if (dueDate) break;
    }
  }

  // -----------------------------
  // Account / invoice identifier
  // -----------------------------
  const accountPatterns = [
    /Account Number\s*:?\s*([A-Za-z0-9][A-Za-z0-9\s-]{3,})/i,
    /Invoice(?:\s+Number)?\s*:?\s*([A-Za-z0-9_-]+)/i,
    /Receipt(?:\s+Number)?\s*:?\s*([A-Za-z0-9_-]+)/i,
  ];

  let accountNumber: string | null = null;

  for (const pattern of accountPatterns) {
    const match = normalized.match(pattern);

    if (match?.[1]) {
      accountNumber = match[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  if (!company && !amount && !dueDate) {
    return null;
  }

  const hasCoreFields = Boolean(company && amount && dueDate);

  return {
    company,
    accountNumber,
    amount,
    minimumPayment: null,
    dueDate,

    // Do NOT classify every deterministic document as Utilities.
    category: isPaidReceipt ? null : "Utilities",

    description: company
      ? isPaidReceipt
        ? `${company} paid receipt`
        : `${company} bill`
      : isPaidReceipt
        ? "Paid receipt"
        : "Bill",

    confidence: hasCoreFields ? 0.95 : 0.7,

    payeeAddress: null,

    // A receipt alone is not evidence that something is recurring.
    isRecurring: isPaidReceipt ? false : true,
    recurringType: isPaidReceipt ? null : "monthly",

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

  private splitDocumentSections(
    extractedDocument: string
  ): Array<{ name: string; text: string }> {
    const document = extractedDocument
      .replace(/\r\n/g, "\n")
      .trim();

    if (!document) {
      return [];
    }

    /*
     * IMPORTANT:
     * PAGE markers are OCR/PDF metadata, NOT bill boundaries.
     *
     * One bill may span several pages. Splitting on "--- PAGE 1 ---"
     * causes each page to be parsed independently and can create
     * duplicate/partial bills.
     *
     * Only explicit FILE boundaries represent independently uploaded
     * documents.
     */
    const fileSegments = document.split(
      /(?=\n?===\s*FILE\b)/i
    );

    if (fileSegments.length > 1) {
      return fileSegments
        .map((segment, index) => ({
          name: `file-${index + 1}`,
          text: segment.trim(),
        }))
        .filter((segment) => segment.text.length > 0);
    }

    return [
      {
        name: "document",
        text: document,
      },
    ];
  }

  private normalizeCompanyName(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const company = String(value)
      .replace(/\s+/g, " ")
      .trim();

    if (!company) {
      return null;
    }

    // OCR/PDF structural markers are never company names.
    const invalidCompanyPatterns = [
      /^---\s*page\s+\d+\s*---$/i,
      /^page\s+\d+(?:\s+of\s+\d+)?$/i,
      /^===\s*file\b.*===?$/i,
      /^(receipt|payment receipt|invoice|bill)$/i,
      /^(amount paid|total paid|amount due|due date)$/i,
    ];

    if (invalidCompanyPatterns.some((pattern) => pattern.test(company))) {
      return null;
    }

    // A value containing no letters is not a useful company name.
    if (!/[A-Za-z]/.test(company)) {
      return null;
    }

    return company;
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
      company: this.normalizeCompanyName(result?.company),
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
                `You are parsing OCR text extracted from uploaded bills, invoices, statements, and payment receipts. ` +
                `The uploaded document may contain one bill or multiple independent bills. ` +
                `Identify every genuinely distinct bill. ` +
                `A single bill may span multiple pages. PAGE markers such as "--- PAGE 1 ---", "PAGE 1", or "Page 1 of 2" are OCR metadata and NEVER represent a company, vendor, payee, or separate bill. ` +
                `Do not create a separate bill merely because a new page begins. ` +
                `Only create multiple bills when the document clearly contains different companies, accounts, invoices, or independent transactions. ` +
                `Do not create partial duplicate records from different portions of the same bill. ` +
                `Never use PAGE markers, FILE markers, "Receipt", "Invoice", or "Bill" by themselves as the company name. ` +
                `For receipts, identify the merchant/vendor from the document content. ` +
                `For an already-paid receipt, use the amount paid as amount and the payment/transaction date as dueDate because the current data model requires a date. ` +
                `A paid receipt is not automatically recurring. ` +
                `Use issuer/company, account number, invoice number, statement period, transaction identifiers, and document headers to determine actual bill boundaries. ` +
                `Return valid JSON with a top-level "bills" array. ` +
                `Each item should match the ParsedBillInfo shape. ` +
                `If a field cannot be reliably determined, return null rather than inventing a value.`,
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
          .filter((item) => {
            if (!item) return false;
            /*
             * At review time, a realistic candidate must have a company plus
             * at least one of amount or due date. This keeps OCR fragments out
             * without rejecting genuine bills that are missing one field.
             */
            const hasCompany = Boolean(item.company);
            const hasAmount = Boolean(item.amount || item.minimumPayment);
            const hasDate = Boolean(item.dueDate);
            return hasCompany && (hasAmount || hasDate);
          });

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
