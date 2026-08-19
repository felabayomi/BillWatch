/**
 * Partner API Routes for Revolut Integration
 * 
 * These routes are completely separate from user-facing ExpenseWatch routes.
 * They provide OCR and AI parsing capabilities for partner integration.
 */

import { Router } from "express";
import multer from "multer";
import { ocrService } from "./services/ocrService";
import { aiService } from "./services/aiService";
import { DEMO_MODE } from "./demo";
import { partnerAuthMiddleware } from "./middleware/partnerAuth";
import { mockPartnerData } from "./mock/partnerMockData";

const router = Router();

// Configure multer for receipt uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply API key authentication to all partner routes
router.use(partnerAuthMiddleware);

/**
 * POST /api/partner/scan-receipt
 * 
 * Upload a receipt image and extract text via OCR
 * 
 * @body receipt: Image file (JPEG/PNG)
 * @returns { raw_text: string, confidence: number, status: string }
 */
router.post("/scan-receipt", upload.single('receipt'), async (req, res) => {
  try {
    // Demo mode: return mock data
    if (DEMO_MODE) {
      return res.json(mockPartnerData.scanReceipt);
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: "Bad Request",
        message: "No receipt image provided" 
      });
    }

    // Extract text using OCR
    const ocrResult = await ocrService.extractTextFromBuffer(
      req.file.buffer, 
      req.file.mimetype
    );
    
    res.json({
      raw_text: ocrResult.text,
      confidence: ocrResult.confidence,
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("OCR scan error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: "Failed to process receipt image" 
    });
  }
});

/**
 * POST /api/partner/parse-expense
 * 
 * Parse OCR text into structured expense data using AI
 * 
 * @body { raw_text: string, ocr_confidence?: number }
 * @returns { amount, merchant, date, category, confidence, currency }
 */
router.post("/parse-expense", async (req, res) => {
  try {
    // Demo mode: return mock data
    if (DEMO_MODE) {
      return res.json(mockPartnerData.parseExpense);
    }

    const { raw_text, ocr_confidence } = req.body;
    
    if (!raw_text) {
      return res.status(400).json({ 
        error: "Bad Request",
        message: "raw_text is required" 
      });
    }

    // Parse expense data using AI
    const parsedExpense = await aiService.parseExpenseFromText(
      raw_text, 
      ocr_confidence || 0
    );
    
    res.json({
      amount: parsedExpense.amount,
      merchant: parsedExpense.description,
      date: parsedExpense.date,
      category: parsedExpense.category,
      location: parsedExpense.location,
      confidence: parsedExpense.confidence,
      currency: "USD",
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Parse expense error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: "Failed to parse expense data" 
    });
  }
});

/**
 * POST /api/partner/categorize
 * 
 * Categorize an expense based on description
 * 
 * @body { description: string }
 * @returns { category, subcategory, confidence }
 */
router.post("/categorize", async (req, res) => {
  try {
    // Demo mode: return mock data
    if (DEMO_MODE) {
      return res.json(mockPartnerData.categorize);
    }

    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ 
        error: "Bad Request",
        message: "description is required" 
      });
    }

    // Categorize using AI
    const category = await aiService.categorizePurchase(description);
    
    res.json({
      category: category.category,
      confidence: category.confidence,
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Categorization error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: "Failed to categorize expense" 
    });
  }
});

/**
 * POST /api/partner/scan-and-parse
 * 
 * Combined endpoint: Upload receipt, extract text, and parse in one call
 * 
 * @body receipt: Image file (JPEG/PNG)
 * @returns { raw_text, parsed_expense, confidence }
 */
router.post("/scan-and-parse", upload.single('receipt'), async (req, res) => {
  try {
    // Demo mode: return mock data
    if (DEMO_MODE) {
      return res.json(mockPartnerData.scanAndParse);
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: "Bad Request",
        message: "No receipt image provided" 
      });
    }

    // Step 1: OCR
    const ocrResult = await ocrService.extractTextFromBuffer(
      req.file.buffer, 
      req.file.mimetype
    );
    
    // Step 2: AI Parsing
    const parsedExpense = await aiService.parseExpenseFromText(
      ocrResult.text, 
      ocrResult.confidence
    );
    
    res.json({
      raw_text: ocrResult.text,
      ocr_confidence: ocrResult.confidence,
      parsed_expense: {
        amount: parsedExpense.amount,
        merchant: parsedExpense.description,
        date: parsedExpense.date,
        category: parsedExpense.category,
        location: parsedExpense.location,
        currency: "USD"
      },
      ai_confidence: parsedExpense.confidence,
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Scan and parse error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: "Failed to scan and parse receipt" 
    });
  }
});

export { router as partnerApiRouter };
