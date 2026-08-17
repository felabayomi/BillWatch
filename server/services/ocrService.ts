import Tesseract from 'tesseract.js';
import pdf2pic from 'pdf2pic';

export class OCRService {
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
      console.log('Sample extracted text (first 300 chars):', text.substring(0, 300));
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the image');
      }
      
      return text.trim();
    } catch (error) {
      console.error('OCR extraction failed:', error);
      
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
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
        const pdfData = await pdfParse(pdfBuffer);
        if (pdfData && pdfData.text && pdfData.text.trim().length > 10) {
          console.log('Successfully extracted text directly from PDF, pages:', pdfData.numpages || 1);
          console.log('Direct PDF text length:', pdfData.text.length);
          directText = pdfData.text.trim();
          
          // If we have substantial text, return it (OCR might fail with missing binaries)
          if (pdfData.text.length > 100) {
            console.log('Direct extraction successful with substantial content');
            return directText;
          }
        } else {
          console.log('PDF contains minimal text, trying OCR...');
        }
      } catch (directError: any) {
        console.log('Direct PDF text extraction failed:', directError?.message || 'Unknown error');
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
