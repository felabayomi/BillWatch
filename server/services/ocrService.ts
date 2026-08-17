import Tesseract from 'tesseract.js';
import pdf2pic from 'pdf2pic';
import { PDFParse } from 'pdf-parse';
import OpenAI from 'openai';
import type { ParsedBillDocument, ParsedBillInfo } from './aiParser.ts';

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export class OCRService {
  private parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const numeric = Number(String(value).replace(/[$,\s]/g, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  private normalizeVisionBill(rawBill: any): ParsedBillInfo | null {
    if (!rawBill || typeof rawBill !== 'object') {
      return null;
    }

    const company = typeof rawBill.company === 'string' && rawBill.company.trim() ? rawBill.company.trim() : null;
    const amount = this.parseNullableNumber(rawBill.amount);
    const minimumPayment = this.parseNullableNumber(rawBill.minimumPayment);
    const originalAmount = this.parseNullableNumber(rawBill.originalAmount);
    const confidence = Number.isFinite(Number(rawBill.confidence)) ? Math.max(0, Math.min(1, Number(rawBill.confidence))) : 0.5;

    if (!company && amount === null && minimumPayment === null && !rawBill.description) {
      return null;
    }

    const installmentEntries = Array.isArray(rawBill.installments)
      ? rawBill.installments.map((entry: any) => ({
          amount: this.parseNullableNumber(entry?.amount) !== null ? String(this.parseNullableNumber(entry.amount)) : '0',
          dueDate: entry?.dueDate ? new Date(entry.dueDate) : null,
          installmentNumber: Number(entry?.installmentNumber ?? 1),
          isPaid: Boolean(entry?.isPaid),
        }))
      : null;

    const dueDateValue = rawBill.dueDate ? new Date(rawBill.dueDate) : null;

    return {
      company,
      accountNumber: typeof rawBill.accountNumber === 'string' && rawBill.accountNumber.trim() ? rawBill.accountNumber.trim() : null,
      amount: amount !== null ? String(amount) : null,
      minimumPayment: minimumPayment !== null ? String(minimumPayment) : null,
      dueDate: dueDateValue && !Number.isNaN(dueDateValue.getTime()) ? dueDateValue : null,
      category: typeof rawBill.category === 'string' && rawBill.category.trim() ? rawBill.category.trim() : null,
      description: typeof rawBill.description === 'string' && rawBill.description.trim() ? rawBill.description.trim() : null,
      confidence,
      payeeAddress: rawBill.payeeAddress ?? null,
      isRecurring: Boolean(rawBill.isRecurring),
      recurringType: rawBill.recurringType ?? null,
      installments: installmentEntries,
      totalInstallments: rawBill.totalInstallments ?? null,
      originalAmount: originalAmount !== null ? String(originalAmount) : null,
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async processImageBills(imageBuffer: Buffer, mimeType: string): Promise<ParsedBillDocument> {
    if (!openai) {
      throw new Error('OpenAI is not configured for image bill extraction');
    }

    const imageUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    const systemPrompt = `The image may contain one or multiple independent bills, installments, invoices, statements, or payment rows.

Extract EVERY separately payable item.

Do not assume one image equals one bill.

Do not merge records merely because they have the same merchant.

Repeated rows with different amounts, due dates, installment positions, account numbers, or invoice numbers are separate records.

Never invent $0 for an unreadable amount. Use null.

Never invent Unknown Company as a successful company value. Use null.

Never substitute today's date for an unreadable due date. Use null.

Return valid JSON only with this exact top-level shape:
{
  "bills": [
    {
      "company": string | null,
      "accountNumber": string | null,
      "amount": number | null,
      "minimumPayment": number | null,
      "dueDate": string | null,
      "category": string | null,
      "description": string | null,
      "payeeAddress": string | null,
      "isRecurring": boolean | null,
      "recurringType": string | null,
      "installments": number | null,
      "totalInstallments": number | null,
      "originalAmount": number | null,
      "confidence": number
    }
  ],
  "warnings": []
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract each separately payable bill, installment, invoice, or payment row from this image. If information is unreadable, use null instead of guessing.',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 2500,
    });

    const rawContent = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(rawContent) as any;
    const rawBills = Array.isArray(parsed?.bills) ? parsed.bills : [];

    const normalizedBills = rawBills
      .map((rawBill: any) => this.normalizeVisionBill(rawBill))
      .filter((bill): bill is ParsedBillInfo => bill !== null);

    return {
      bills: normalizedBills,
      confidence: normalizedBills.length > 0
        ? Math.max(0, Math.min(1, Number(parsed?.confidence ?? 0.9)))
        : 0,
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.filter((warning: unknown) => typeof warning === 'string') : [],
    };
  }

  private async extractTextWithOpenAI(imageBuffer: Buffer, mimeType: string): Promise<string> {
    if (!openai) {
      throw new Error('OpenAI is not configured for OCR');
    }

    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    console.log({
      stage: 'ocr-openai',
      openAIConfigured: Boolean(openaiApiKey),
      mimeType,
      bufferLength: imageBuffer.length,
      model: 'gpt-4o-mini',
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract all readable text from this bill image. Return only the text content, preserve the important lines and amounts, and do not add commentary.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all readable text from this document.' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content ?? '';
    if (!text || text.trim().length === 0) {
      throw new Error('OpenAI OCR returned no text');
    }

    return text.trim();
  }

  async extractText(imageBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      console.log('Starting OCR extraction, buffer size:', imageBuffer.length, 'mimeType:', mimeType);
      
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid or empty image buffer');
      }

      const allowedImageTypes = new Set([
        'image/jpeg',
        'image/png',
        'image/webp'
      ]);

      if (!allowedImageTypes.has(mimeType)) {
        throw new Error(`Unsupported image type: ${mimeType}`);
      }

      const base64Image = imageBuffer.toString('base64');
      const imageUrl = `data:${mimeType};base64,${base64Image}`;
      const recognizeTask = Tesseract.recognize(imageUrl, 'eng', {
        logger: () => undefined,
        psm: 6,
        oem: 1,
      });

      const { data: { text } } = await this.withTimeout(recognizeTask, 10000, 'OCR extraction');
      
      console.log('OCR extraction completed, extracted text length:', text.length);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the image');
      }
      
      return text.trim();
    } catch (error) {
      console.error('Tesseract OCR extraction failed, falling back to OpenAI vision:', error);

      try {
        const fallbackText = await this.extractTextWithOpenAI(imageBuffer, mimeType);
        console.log({ stage: 'ocr-complete', extractedTextLength: fallbackText.length });
        return fallbackText;
      } catch (fallbackError) {
        console.error('OpenAI OCR fallback failed:', fallbackError);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('timed out')) {
          throw new Error('OCR timed out while processing the document. Please try a clearer image or a smaller PDF.');
        }
        if (errorMessage.includes('Invalid or empty image buffer')) {
          throw new Error('Invalid image file. Please try a different image.');
        } else if (errorMessage.includes('No text could be extracted')) {
          throw new Error('No text found in image. Please ensure the bill is clearly visible and try again.');
        }
        
        throw new Error('Failed to extract text from document. Please ensure the image is clear and try again.');
      }
    }
  }

  // Enhanced OCR with preprocessing for better accuracy
  async extractTextEnhanced(imageBuffer: Buffer): Promise<{
    text: string;
    confidence: number;
  }> {
    try {
      const recognizeTask = Tesseract.recognize(imageBuffer, 'eng', {
        logger: () => undefined,
        psm: 6,
        oem: 1,
      });
      const result = await this.withTimeout(recognizeTask, 10000, 'Enhanced OCR extraction');
      
      return {
        text: result.data.text,
        confidence: result.data.confidence / 100 // Convert to 0-1 scale
      };
    } catch (error) {
      console.error('Enhanced OCR extraction failed:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  // Process PDF documents by converting to images and extracting text
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('Starting PDF processing, buffer size:', pdfBuffer.length);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Invalid or empty PDF buffer');
      }

      // First try direct PDF text extraction (faster for text-based PDFs)
      let directText = '';
      try {
        console.log('Attempting direct PDF text extraction...');
        const parser = new PDFParse({
  data: new Uint8Array(pdfBuffer),
});

try {
  const pdfData = await parser.getText();

  const extractedText =
    pdfData?.text?.trim() ?? '';

  if (extractedText.length > 10) {
    console.log(
      'Successfully extracted text directly from PDF'
    );

    console.log(
      'Direct PDF text length:',
      extractedText.length
    );

    directText = extractedText;

    if (extractedText.length > 100) {
      console.log(
        'Direct extraction successful with substantial content'
      );

      return directText;
    }
  }
        } finally {
          await parser.destroy();
        }
      } catch (directError: any) {
        console.error('[pdf-text:error]', {
          name: directError instanceof Error ? directError.name : 'UnknownError',
          message: directError instanceof Error ? directError.message : String(directError),
          bufferLength: pdfBuffer.length,
        });
      }

      // Keep PDF OCR in a low-cost mode for Vercel/serverless deployments.
      // We use direct text extraction first and only do OCR on the first page if needed.
      console.log('Converting PDF to a single page image for OCR extraction...');

      try {
        const fs = await import('fs');
        const path = await import('path');
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }

        const convert = pdf2pic.fromBuffer(pdfBuffer, {
          density: 180,
          saveFilename: 'page',
          savePath: tmpDir,
          format: 'png',
          width: 1200,
          height: 1600,
          quality: 80
        });

        const results = await this.withTimeout(convert.bulk(1, { responseType: 'buffer' }), 15000, 'PDF conversion');
        if (!results || results.length === 0) {
          throw new Error('Failed to convert PDF page to image - PDF may be corrupted or protected');
        }

        const firstPage = results.find(result => result.buffer && result.buffer.length > 0) ?? results[0];
        if (!firstPage?.buffer || firstPage.buffer.length === 0) {
          throw new Error('Converted PDF image is empty');
        }

        const pageText = await this.withTimeout(this.extractText(firstPage.buffer as Buffer, 'image/png'), 10000, 'PDF OCR');
        if (pageText && pageText.trim()) {
          const combinedText = `=== OCR EXTRACTED TEXT ===\n${pageText}\n`;
          if (directText && directText.trim()) {
            return '=== DIRECT PDF TEXT ===\n' + directText + '\n=== END DIRECT TEXT ===\n\n' + combinedText;
          }
          return combinedText;
        }

        throw new Error('No text could be extracted from PDF pages');
      } catch (conversionError: any) {
        console.error('PDF OCR fallback failed:', conversionError);

        if (directText && directText.trim().length > 10) {
          console.log('Using direct PDF text extraction after OCR fallback failure');
          return directText;
        }

        throw new Error(`Failed to process PDF document: ${conversionError?.message || 'Unknown error'}`);
      }

    } catch (error: any) {
      console.error('PDF processing failed:', error);
      
      // Final fallback: if we have any direct text, use it
      if (directText && directText.trim().length > 10) {
        console.log('PDF processing failed, but returning available direct text');
        return directText;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Invalid or empty PDF buffer')) {
        throw new Error('Invalid PDF file. Please try a different document.');
      } else if (errorMessage.includes('No text could be extracted from PDF pages')) {
        throw new Error('No text found in PDF. Please ensure the document is clear and contains readable text.');
      }
      
      throw new Error('Failed to process PDF document. Please try a different file or convert to image format.');
    }
  }

  // Process multiple pages from image uploads
  async extractTextFromMultipleImages(imageBuffers: Buffer[], mimeType: string = 'image/png'): Promise<string> {
    try {
      console.log(`Processing ${imageBuffers.length} images for multi-page document`);
      
      if (!imageBuffers || imageBuffers.length === 0) {
        throw new Error('No images provided for processing');
      }

      let combinedText = '';
      
      for (let i = 0; i < imageBuffers.length; i++) {
        console.log(`Processing image ${i + 1} of ${imageBuffers.length}...`);
        
        try {
          const pageText = await this.extractText(imageBuffers[i], mimeType);
          combinedText += `\n--- Page ${i + 1} ---\n${pageText}\n`;
        } catch (pageError) {
          console.warn(`Failed to extract text from image ${i + 1}:`, pageError);
          combinedText += `\n--- Page ${i + 1} ---\n[Could not extract text from this image]\n`;
        }
      }

      if (!combinedText.trim()) {
        throw new Error('No text could be extracted from any of the images');
      }

      console.log('Multi-image processing completed, total text length:', combinedText.length);
      return combinedText;

    } catch (error) {
      console.error('Multi-image processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Failed to process multiple images: ' + errorMessage);
    }
  }

  // Auto-detect document type and process accordingly
  async processDocument(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      console.log('Auto-detecting document type:', mimeType);
      
      if (mimeType === 'application/pdf') {
        return await this.extractTextFromPDF(buffer);
      } else if (mimeType.startsWith('image/')) {
        return await this.extractText(buffer, mimeType);
      } else {
        throw new Error(`Unsupported document type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }
}
