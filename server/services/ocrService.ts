import Tesseract from 'tesseract.js';
import pdf2pic from 'pdf2pic';

export class OCRService {
  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      console.log('Starting OCR extraction, buffer size:', imageBuffer.length);
      
      // Validate buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid or empty image buffer');
      }
      
      // Use Tesseract.js for text extraction with optimized settings
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      console.log('OCR extraction completed, extracted text length:', text.length);
      console.log('Sample extracted text (first 300 chars):', text.substring(0, 300));
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the image');
      }
      
      return text.trim();
    } catch (error) {
      console.error('OCR extraction failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more specific error messages
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
      const result = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m),
      });
      
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
        const pdfParse = require('pdf-parse');
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

      // Fallback to OCR for better text extraction quality
      console.log('Converting PDF to images for OCR extraction...');

      // Convert PDF to images and use OCR (for image-based/scanned PDFs)
      try {
        // Create tmp directory if it doesn't exist
        const fs = await import('fs');
        const path = await import('path');
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }

        const convert = pdf2pic.fromBuffer(pdfBuffer, {
          density: 300, // Higher resolution for better OCR
          saveFilename: 'page',
          savePath: tmpDir,
          format: 'png',
          width: 1800, // Larger width for better text recognition
          height: 2400, // Larger height for better text recognition
          quality: 100
        });

        // Convert ALL pages for comprehensive scanning
        console.log('Converting all PDF pages to images for comprehensive OCR...');
        const results = await convert.bulk(-1, { responseType: 'buffer' }); // -1 = all pages
        console.log(`PDF conversion result: ${results.length} images from PDF`);
        
        if (!results || results.length === 0) {
          throw new Error('Failed to convert PDF pages to images - PDF may be corrupted or protected');
        }
        
        // Check if buffers are valid
        const validResults = results.filter(result => result.buffer && result.buffer.length > 0);
        console.log(`Valid image buffers: ${validResults.length} of ${results.length}`);
        
        if (validResults.length === 0) {
          throw new Error('All converted images are empty - PDF conversion failed');
        }
        
        let combinedText = '';
        
        // Process each page individually with comprehensive OCR
        for (let i = 0; i < validResults.length; i++) {
          console.log(`\n=== SCANNING PAGE ${i + 1} of ${validResults.length} ===`);
          
          try {
            const pageText = await this.extractText(validResults[i].buffer as Buffer);
            console.log(`Page ${i + 1} extracted ${pageText.length} characters`);
            console.log(`Page ${i + 1} sample:`, pageText.substring(0, 200));
            
            // Add page text with clear separation
            combinedText += `\n\n=== PAGE ${i + 1} CONTENT ===\n${pageText}\n=== END PAGE ${i + 1} ===\n`;
            
            // Log if this page contains key billing terms
            const billingTerms = ['due', 'payment', 'balance', 'minimum', 'total', 'amount', 'account'];
            const foundTerms = billingTerms.filter(term => pageText.toLowerCase().includes(term));
            if (foundTerms.length > 0) {
              console.log(`Page ${i + 1} contains billing terms:`, foundTerms);
            }
            
          } catch (pageError) {
            console.warn(`Failed to extract text from page ${i + 1}:`, pageError);
            combinedText += `\n\n=== PAGE ${i + 1} CONTENT ===\n[Could not extract text from this page]\n=== END PAGE ${i + 1} ===\n`;
          }
        }

        if (!combinedText.trim()) {
          // If OCR failed but we have direct text, use that
          if (directText) {
            console.log('OCR failed, using direct PDF text extraction');
            return directText;
          }
          throw new Error('No text could be extracted from PDF pages');
        }

        console.log('OCR processing completed, total text length:', combinedText.length);
        
        // Always combine direct text and OCR text for maximum coverage
        let finalText = '';
        if (directText && directText.trim()) {
          console.log('Adding direct PDF text extraction to results');
          finalText += '=== DIRECT PDF TEXT ===\n' + directText + '\n=== END DIRECT TEXT ===\n\n';
        }
        
        finalText += '=== OCR EXTRACTED TEXT ===\n' + combinedText;
        
        console.log(`Final combined text length: ${finalText.length} characters`);
        return finalText;
        
      } catch (conversionError: any) {
        console.error('PDF to image conversion failed:', conversionError);
        
        // If OCR fails but we have direct text, use that
        if (directText && directText.trim().length > 10) {
          console.log('OCR failed, but using direct PDF text extraction instead');
          return directText;
        }
        
        throw new Error(`Failed to convert PDF to images for OCR processing: ${conversionError?.message || 'Unknown error'}`);
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
  async extractTextFromMultipleImages(imageBuffers: Buffer[]): Promise<string> {
    try {
      console.log(`Processing ${imageBuffers.length} images for multi-page document`);
      
      if (!imageBuffers || imageBuffers.length === 0) {
        throw new Error('No images provided for processing');
      }

      let combinedText = '';
      
      for (let i = 0; i < imageBuffers.length; i++) {
        console.log(`Processing image ${i + 1} of ${imageBuffers.length}...`);
        
        try {
          const pageText = await this.extractText(imageBuffers[i]);
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
        return await this.extractText(buffer);
      } else {
        throw new Error(`Unsupported document type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }
}
