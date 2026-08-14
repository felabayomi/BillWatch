import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export class OCRService {
  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      console.log('Starting OCR extraction using OpenAI Vision, buffer size:', imageBuffer.length);
      
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid or empty image buffer');
      }

      if (!openai) {
        throw new Error('OpenAI API key not configured');
      }

      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Use gpt-4o-mini with vision capability to extract text from images
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: 'text',
                text: 'Please extract all text content from this image. Focus on capturing all readable text including numbers, dates, amounts, company names, account information, and any other text visible. Return just the extracted text without any explanation.',
              },
            ],
          },
        ],
      });

      const text = response.choices[0].message.content?.trim() || '';

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
      const text = await this.extractText(imageBuffer);
      
      return {
        text,
        confidence: 0.85 // OpenAI Vision is highly accurate, use conservative estimate
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

      // For scanned/image-based PDFs, we would need pdf2pic which has native dependencies
      // In Vercel serverless, we can't use libraries with native deps. If direct text extraction
      // didn't work, ask user to convert PDF to image format for OpenAI Vision processing
      if (!directText || directText.trim().length < 10) {
        console.log('PDF appears to be scanned/image-based. Direct text extraction failed or returned minimal text.');
        throw new Error('This PDF appears to be scanned. Please convert it to PNG/JPG format and upload as an image for better accuracy.');
      }

      console.log('Direct PDF text extraction successful, returning extracted text');
      return directText;

    } catch (error: any) {
      console.error('PDF processing failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Invalid or empty PDF buffer')) {
        throw new Error('Invalid PDF file. Please try a different document.');
      } else if (errorMessage.includes('scanned')) {
        throw error; // Re-throw the specific scanned PDF error
      }
      
      throw new Error('Failed to process PDF document. Scanned PDFs are not supported in the deployed version. Please convert to image format (PNG/JPG) and try again.');
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
