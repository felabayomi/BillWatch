import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export class OCRService {
  async extractTextFromImage(imagePath: string): Promise<OCRResult> {
    try {
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => console.log(m)
      });
      
      return {
        text: data.text,
        confidence: data.confidence / 100 // Convert to decimal
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  async extractTextFromBuffer(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m)
      });
      
      return {
        text: data.text,
        confidence: data.confidence / 100 // Convert to decimal
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  preprocessText(text: string): string {
    // Clean up common OCR errors and normalize text
    return text
      .replace(/[^\w\s.,:\-$€£¥]/g, '') // Remove special chars except common ones
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Extract potential price patterns from OCR text
  extractPrices(text: string): string[] {
    const pricePatterns = [
      /\$\s*\d+\.?\d*/g, // $XX.XX
      /\d+\.\d{2}/g, // XX.XX
      /\d+,\d{2}/g, // XX,XX (European format)
    ];
    
    const prices: string[] = [];
    
    pricePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        prices.push(...matches);
      }
    });
    
    return prices;
  }

  // Extract potential merchant names
  extractMerchantNames(text: string): string[] {
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2);
    
    // Usually merchant name is at the top of the receipt
    return lines.slice(0, 3).filter(line => 
      !this.extractPrices(line).length && // Not a price line
      !/\d{2}\/\d{2}\/\d{2,4}/.test(line) && // Not a date
      !/\d{2}:\d{2}/.test(line) // Not a time
    );
  }

  // Extract dates from text
  extractDates(text: string): string[] {
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/g, // MM/DD/YYYY or MM/DD/YY
      /\d{1,2}-\d{1,2}-\d{2,4}/g, // MM-DD-YYYY
      /\d{4}-\d{1,2}-\d{1,2}/g, // YYYY-MM-DD
    ];
    
    const dates: string[] = [];
    
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });
    
    return dates;
  }
}

export const ocrService = new OCRService();
