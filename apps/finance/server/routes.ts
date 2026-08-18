import type { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertAccountSchema, insertBillSchema, insertTransactionSchema, insertCategorySchema } from "../shared/schema";
import { isAuthenticated } from "../../../server/auth.js";
import { z } from "zod";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { ObjectStorageService } from "./replit_integrations/object_storage";

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampToLocalDate(dateStr: string): string {
  const today = getLocalDateString();
  return dateStr > today ? today : dateStr;
}

export async function registerFinanceRoutes(router: Router): Promise<void> {
  // File upload middleware
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
      }
    },
  });
router.use( (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  });

  // Auth routes
  router.get('/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Initialize default categories for new users (only once)
      if (!user) {
        // User doesn't exist yet, create them and initialize categories
        user = await storage.upsertUser({ id: userId });
        await storage.initializeDefaultCategories(userId);
      } else {
        // Check if user has categories already initialized
        const existingCategories = await storage.getCategories(userId);
        if (existingCategories.length === 0) {
          await storage.initializeDefaultCategories(userId);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route
  router.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: 'Error logging out' });
      }
      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: 'Error destroying session' });
        }
        res.redirect('/');
      });
    });
  });
  router.get("/membership/check", isAuthenticated, async (req: any, res) => {
    try {
      const email = req.user?.claims?.email;

      if (!email) {
        return res.json({
          hasAccess: false,
          reason: "no_email",
          redirectUrl: "https://felixpay.net/membership",
        });
      }

      const result = await verifyMembershipCached(email);

      if (!result.active || !result.hasAccess) {
        return res.json({
          hasAccess: false,
          reason: result.active ? "wrong_tier" : (result.status === "no_account" ? "no_subscription" : "expired"),
          tier: result.tier,
          requiredTier: getTierForTool(),
          redirectUrl: "https://felixpay.net/membership",
        });
      }

      res.json({
        hasAccess: true,
        tier: result.tier,
        expiresAt: result.expiresAt,
        allowedTools: result.allowedTools,
      });
    } catch (error) {
      console.error("Membership check failed:", error);
      res.json({
        hasAccess: false,
        reason: "error",
        redirectUrl: "https://felixpay.net/membership",
      });
    }
  });

  // Receipt/Invoice parsing with AI vision (images) or text extraction (PDFs)
  router.post("/parse-receipt", isAuthenticated, upload.single('receipt'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are a receipt/invoice parser. Extract the following information from the uploaded receipt or invoice. Return ONLY valid JSON with these fields:
- "amount": the total amount due as a number (e.g. 42.99). Use the final total/amount due, not subtotals.
- "date": the invoice/receipt date in YYYY-MM-DD format. If the year is not visible, assume the current year.
- "description": a brief description of the purchase/payment (vendor name + what was purchased, max 100 chars)
- "vendor": the vendor/merchant name
- "category_hint": suggest one of these categories: utilities, rent, insurance, phone, internet, subscriptions, groceries, dining, gas, transportation, shopping, entertainment, healthcare, education, travel, office, software, advertising, other

If you cannot determine a field, set it to null. Always return valid JSON.`;

      let content: string | null = null;
      const isPdf = req.file.mimetype === 'application/pdf';

      if (isPdf) {
        const uint8 = new Uint8Array(req.file.buffer);
        const parser = new PDFParse(uint8);
        const pdfResult = await parser.getText();
        const pdfText = pdfResult.pages.map((p: any) => p.text).join('\n');

        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Here is the text content extracted from a PDF invoice/receipt. Parse it and extract the amount, date, description, vendor, and category.\n\n---\n${pdfText}\n---`,
            },
          ],
          max_completion_tokens: 500,
          response_format: { type: "json_object" },
        });
        content = response.choices[0]?.message?.content ?? null;
      } else {
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';

        const response = await openai.responses.create({
          model: "gpt-5.2",
          instructions: systemPrompt,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_image",
                  image_url: `data:${mimeType};base64,${base64Image}`,
                },
                {
                  type: "input_text",
                  text: "Parse this receipt/invoice and extract the amount, date, description, vendor, and category.",
                },
              ],
            },
          ],
          text: {
            format: { type: "json_object" },
          },
        } as any);
        content = (response as any).output_text || (response as any).choices?.[0]?.message?.content;
      }

      if (!content) {
        return res.status(500).json({ message: "Failed to parse receipt - no response from AI" });
      }

      let receiptPath: string | null = null;
      try {
        const objStorage = new ObjectStorageService();
        const uploadURL = await objStorage.getObjectEntityUploadURL();
        const contentType = req.file.mimetype || 'application/octet-stream';
        
        const uploadRes = await fetch(uploadURL, {
          method: 'PUT',
          body: req.file.buffer,
          headers: { 'Content-Type': contentType },
        });
        
        if (uploadRes.ok) {
          receiptPath = objStorage.normalizeObjectEntityPath(uploadURL);
        } else {
          console.error("Failed to upload receipt to storage:", uploadRes.status);
        }
      } catch (storageErr) {
        console.error("Receipt storage error (non-fatal):", storageErr);
      }

      const parsed = JSON.parse(content);
      res.json({
        amount: parsed.amount ?? null,
        date: parsed.date ?? null,
        description: parsed.description ?? null,
        vendor: parsed.vendor ?? null,
        categoryHint: parsed.category_hint ?? null,
        receiptPath,
      });
    } catch (error: any) {
      console.error("Receipt parsing error:", error);
      res.status(500).json({ message: error.message || "Failed to parse receipt" });
    }
  });

  router.post("/parse-receipts-batch", isAuthenticated, upload.array('receipts', 10), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are a receipt/invoice parser. Extract the following information from the uploaded receipt or invoice. Return ONLY valid JSON with these fields:
- "amount": the total amount due as a number (e.g. 42.99). Use the final total/amount due, not subtotals.
- "date": the invoice/receipt date in YYYY-MM-DD format. If the year is not visible, assume the current year.
- "description": a brief description of the purchase/payment (vendor name + what was purchased, max 100 chars)
- "vendor": the vendor/merchant name
- "category_hint": suggest one of these categories: utilities, rent, insurance, phone, internet, subscriptions, groceries, dining, gas, transportation, shopping, entertainment, healthcare, education, travel, office, software, advertising, other

If you cannot determine a field, set it to null. Always return valid JSON.`;

      const receiptPaths: string[] = [];
      const parsedResults: Array<{ amount: number | null; date: string | null; description: string | null; vendor: string | null; categoryHint: string | null }> = [];

      for (const file of files) {
        let content: string | null = null;
        const isPdf = file.mimetype === 'application/pdf';

        if (isPdf) {
          const uint8 = new Uint8Array(file.buffer);
          const parser = new PDFParse(uint8);
          const pdfResult = await parser.getText();
          const pdfText = pdfResult.pages.map((p: any) => p.text).join('\n');

          const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Here is the text content extracted from a PDF invoice/receipt. Parse it and extract the amount, date, description, vendor, and category.\n\n---\n${pdfText}\n---`,
              },
            ],
            max_completion_tokens: 500,
            response_format: { type: "json_object" },
          });
          content = response.choices[0]?.message?.content ?? null;
        } else {
          const base64Image = file.buffer.toString('base64');
          const mimeType = file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';

          const response = await openai.responses.create({
            model: "gpt-5.2",
            instructions: systemPrompt,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_image",
                    image_url: `data:${mimeType};base64,${base64Image}`,
                  },
                  {
                    type: "input_text",
                    text: "Parse this receipt/invoice and extract the amount, date, description, vendor, and category.",
                  },
                ],
              },
            ],
            text: {
              format: { type: "json_object" },
            },
          } as any);
          content = (response as any).output_text || (response as any).choices?.[0]?.message?.content;
        }

        if (content) {
          const parsed = JSON.parse(content);
          parsedResults.push({
            amount: parsed.amount ?? null,
            date: parsed.date ?? null,
            description: parsed.description ?? null,
            vendor: parsed.vendor ?? null,
            categoryHint: parsed.category_hint ?? null,
          });
        }

        try {
          const objStorage = new ObjectStorageService();
          const uploadURL = await objStorage.getObjectEntityUploadURL();
          const contentType = file.mimetype || 'application/octet-stream';

          const uploadRes = await fetch(uploadURL, {
            method: 'PUT',
            body: file.buffer,
            headers: { 'Content-Type': contentType },
          });

          if (uploadRes.ok) {
            receiptPaths.push(objStorage.normalizeObjectEntityPath(uploadURL));
          }
        } catch (storageErr) {
          console.error("Batch receipt storage error (non-fatal):", storageErr);
        }
      }

      const totalAmount = parsedResults.reduce((sum, r) => sum + (r.amount || 0), 0);
      const roundedTotal = Math.round(totalAmount * 100) / 100;

      const dates = parsedResults.map(r => r.date).filter(Boolean);
      const mergedDate = dates.length > 0 ? dates[0] : null;

      const vendors = parsedResults.map(r => r.vendor).filter(Boolean);
      const uniqueVendors = [...new Set(vendors)];
      const mergedDescription = uniqueVendors.length > 0
        ? `${uniqueVendors.join(', ')} - ${parsedResults.length} receipts combined`
        : `${parsedResults.length} receipts combined`;

      const categoryHints = parsedResults.map(r => r.categoryHint).filter(Boolean);
      const mergedCategory = categoryHints.length > 0 ? categoryHints[0] : null;

      res.json({
        amount: roundedTotal,
        date: mergedDate,
        description: mergedDescription,
        vendor: uniqueVendors.join(', ') || null,
        categoryHint: mergedCategory,
        receiptPath: receiptPaths.join(','),
        receiptCount: parsedResults.length,
        individualAmounts: parsedResults.map(r => ({ amount: r.amount, vendor: r.vendor })),
      });
    } catch (error: any) {
      console.error("Batch receipt parsing error:", error);
      res.status(500).json({ message: error.message || "Failed to parse receipts" });
    }
  });

  // Accounts
  router.get("/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const date = req.query.date as string;
      
      console.log("💰 Fetching accounts with balance calculations...");
      
      const accounts = await storage.getAccountsWithBalance(userId, date);
      const assetTypes = ['checking', 'savings', 'cash', 'investment', 'rewards'];
      let debugAssets = 0, debugLiabilities = 0;
      accounts.forEach((acc: any) => {
        const bal = acc.currentBalanceCents || 0;
        if (assetTypes.includes(acc.type)) {
          debugAssets += bal;
        } else {
          debugLiabilities += Math.abs(bal);
        }
      });
      console.log(`✅ Successfully fetched ${accounts.length} accounts | Assets: ${debugAssets} | Liabilities: ${debugLiabilities} | NetWorth: ${debugAssets - debugLiabilities}`);
      res.json(accounts);
    } catch (error) {
      console.error("❌ Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts", error: String(error) });
    }
  });

  // Support both /api/accounts/:date and /api/accounts/:id patterns  
  router.get("/accounts/:dateOrId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const param = req.params.dateOrId;
      
      // Check if parameter looks like a date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
        // Treat as date parameter - get accounts with balances
        const accounts = await storage.getAccountsWithBalance(userId, param);
        res.json(accounts);
      } else {
        // Treat as account ID - get specific account
        const account = await storage.getAccount(userId, param);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        res.json(account);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account(s)" });
    }
  });

  router.post("/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(userId, validatedData);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ message: "Invalid account data" });
    }
  });

  // Bulk account creation for document scanner
  router.post("/accounts/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const { accounts } = req.body;
      
      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({ message: "Invalid accounts data - must be a non-empty array" });
      }

      const validatedAccounts = [];
      const errors = [];
      
      for (let i = 0; i < accounts.length; i++) {
        try {
          const accountData = {
            ...accounts[i],
            openingBalanceCents: Math.round((accounts[i].openingBalance || 0) * 100),
            openingDate: new Date().toISOString().split('T')[0],
            owner: accounts[i].owner || 'personal'
          };
          delete accountData.openingBalance; // Remove dollar amount, use cents
          
          const validated = insertAccountSchema.parse(accountData);
          validatedAccounts.push(validated);
        } catch (error) {
          errors.push({ index: i, account: accounts[i].name || `Account ${i + 1}`, error: error instanceof Error ? error.message : String(error) });
        }
      }

      if (validatedAccounts.length === 0) {
        return res.status(400).json({ 
          message: "No valid accounts to create", 
          errors 
        });
      }

      const createdAccounts = [];
      for (const accountData of validatedAccounts) {
        const account = await storage.createAccount(userId, accountData);
        createdAccounts.push(account);
      }

      res.status(201).json({
        message: `Successfully created ${createdAccounts.length} accounts`,
        accounts: createdAccounts,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk account creation error:", error);
      res.status(500).json({ message: "Failed to create accounts" });
    }
  });

  router.put("/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(userId, req.params.id, validatedData);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(400).json({ message: "Invalid account data" });
    }
  });

  router.patch("/accounts/:id", isAuthenticated, async (req, res) => {
    console.log('🔄 PATCH /api/accounts/:id called');
    console.log('Request details:', {
      params: req.params,
      body: req.body,
      userId: (req as any).user?.claims?.sub,
      method: req.method,
      url: req.url
    });
    
    try {
      console.log('📋 Validating account data with schema...');
      const validatedData = insertAccountSchema.partial().parse(req.body);
      console.log('✅ Data validation successful:', validatedData);
      
      const userId = (req as any).user.claims.sub;
      console.log('💾 Updating account in storage...');
      const account = await storage.updateAccount(userId, req.params.id, validatedData);
      
      if (!account) {
        console.error('❌ Account not found for ID:', req.params.id);
        return res.status(404).json({ message: "Account not found" });
      }
      
      console.log('✅ Account updated successfully:', account);
      res.json(account);
    } catch (error) {
      console.error('❌ Error updating account:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // Provide more specific error responses
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: `Validation error: ${error.message}` });
      } else {
        res.status(400).json({ message: "Invalid account data" });
      }
    }
  });

  router.delete("/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const success = await storage.deleteAccount(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Migrate account categories
  router.post("/accounts/migrate-categories", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.migrateAccountCategories();
      res.json({
        message: `Successfully updated ${result.updated} accounts with inferred categories`,
        ...result
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ message: "Failed to migrate account categories" });
    }
  });

  // Categories
  router.get("/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const categories = await storage.getCategories(userId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  router.post("/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      // Only validate the fields coming from the client (name and kind)
      const clientSchema = insertCategorySchema.omit({ userId: true });
      const validatedData = clientSchema.parse(req.body);
      // Add userId to the validated data before passing to storage
      const categoryData = { ...validatedData, userId };
      const category = await storage.createCategory(userId, categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  router.put("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(userId, req.params.id, validatedData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  router.delete("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const success = await storage.deleteCategory(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Businesses
  router.get("/businesses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const businessList = await storage.getBusinesses(userId);
      res.json(businessList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  router.post("/businesses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const schema = z.object({
        name: z.string().min(1, "Business name is required").max(100, "Business name too long"),
      });
      const validated = schema.parse(req.body);
      const business = await storage.createBusiness(userId, validated);
      res.status(201).json(business);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid business data", errors: error.errors });
      }
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create business" });
    }
  });

  router.delete("/businesses/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const success = await storage.deleteBusiness(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete business" });
    }
  });

  // Bills
  router.get("/bills", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const bills = await storage.getBills(userId);
      res.json(bills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  router.post("/bills", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(userId, validatedData);
      res.status(201).json(bill);
    } catch (error) {
      res.status(400).json({ message: "Invalid bill data" });
    }
  });

  router.put("/bills/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertBillSchema.partial().parse(req.body);
      const bill = await storage.updateBill(userId, req.params.id, validatedData);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(400).json({ message: "Invalid bill data" });
    }
  });

  router.delete("/bills/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const success = await storage.deleteBill(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bill" });
    }
  });

  // Transactions
  router.get("/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const date = req.query.date as string;
      const accountId = req.query.accountId as string;
      const transactions = await storage.getTransactions(userId, date, accountId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  router.post("/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(userId, validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid transaction data" });
    }
  });

  router.put("/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(userId, req.params.id, validatedData);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid transaction data" });
    }
  });

  router.delete("/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const success = await storage.deleteTransaction(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Transfers
  router.post("/transfers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      // Validation schema for transfer request
      const transferSchema = z.object({
        fromAccountId: z.string().uuid("Invalid from account ID"),
        toAccountId: z.string().uuid("Invalid to account ID"),
        amount: z.number().positive("Amount must be positive"),
        txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        description: z.string().min(1, "Description is required").max(200, "Description too long"),
      });
      
      const validatedData = transferSchema.parse(req.body);
      
      // Convert amount to cents
      const amountCents = Math.round(validatedData.amount * 100);
      
      const result = await storage.createTransfer(userId, {
        fromAccountId: validatedData.fromAccountId,
        toAccountId: validatedData.toAccountId,
        amountCents,
        txDate: validatedData.txDate,
        description: validatedData.description,
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Transfer creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid transfer data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create transfer" 
      });
    }
  });

  // Expense Management
  router.post("/expenses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      const expenseSchema = z.object({
        accountId: z.string().uuid("Invalid account ID").optional().nullable(),
        amount: z.number().positive("Amount must be positive"),
        txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        description: z.string().min(1, "Description is required").max(200, "Description too long"),
        categoryId: z.string().uuid("Invalid category ID"),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessId: z.string().uuid("Invalid business ID").optional().nullable(),
        taxOnly: z.boolean().optional().default(false),
        receiptPath: z.string().optional().nullable(),
      });
      
      const validatedData = expenseSchema.parse(req.body);
      
      if (!validatedData.taxOnly && !validatedData.accountId) {
        return res.status(400).json({ message: "Account is required for non-tax-only transactions" });
      }
      
      let amountCents: number;
      if (validatedData.accountId) {
        const account = await storage.getAccount(userId, validatedData.accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
        const isLiability = liabilityTypes.includes(account.type);
        amountCents = isLiability 
          ? Math.round(validatedData.amount * 100)
          : -Math.round(validatedData.amount * 100);
      } else {
        amountCents = -Math.round(validatedData.amount * 100);
      }
      
      const txData: any = {
        accountId: validatedData.accountId || null,
        amountCents,
        txDate: validatedData.txDate,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        isBusinessExpense: validatedData.isBusinessExpense,
        isPersonal: validatedData.isPersonal,
        taxOnly: validatedData.taxOnly,
      };
      if (validatedData.businessId) txData.businessId = validatedData.businessId;
      if (validatedData.receiptPath) txData.receiptPath = validatedData.receiptPath;
      
      const result = await storage.createTransaction(userId, txData);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Expense creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid expense data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create expense" 
      });
    }
  });

  // Bill Payment Management
  router.post("/bill-payments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      const billPaymentSchema = z.object({
        accountId: z.string().uuid("Invalid account ID").optional().nullable(),
        amount: z.number().positive("Amount must be positive"),
        txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        description: z.string().min(1, "Description is required").max(200, "Description too long"),
        categoryId: z.string().uuid("Invalid category ID"),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessId: z.string().uuid("Invalid business ID").optional().nullable(),
        taxOnly: z.boolean().optional().default(false),
        receiptPath: z.string().optional().nullable(),
      });
      
      const validatedData = billPaymentSchema.parse(req.body);
      
      if (!validatedData.taxOnly && !validatedData.accountId) {
        return res.status(400).json({ message: "Account is required for non-tax-only transactions" });
      }
      
      let amountCents: number;
      if (validatedData.accountId) {
        const account = await storage.getAccount(userId, validatedData.accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
        const isLiability = liabilityTypes.includes(account.type);
        amountCents = isLiability 
          ? Math.round(validatedData.amount * 100)
          : -Math.round(validatedData.amount * 100);
      } else {
        amountCents = -Math.round(validatedData.amount * 100);
      }
      
      const txData: any = {
        accountId: validatedData.accountId || null,
        amountCents,
        txDate: validatedData.txDate,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        isBusinessExpense: validatedData.isBusinessExpense,
        isPersonal: validatedData.isPersonal,
        taxOnly: validatedData.taxOnly,
      };
      if (validatedData.businessId) txData.businessId = validatedData.businessId;
      if (validatedData.receiptPath) txData.receiptPath = validatedData.receiptPath;
      
      const result = await storage.createTransaction(userId, txData);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Bill payment creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ 
          message: "Invalid bill payment data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create bill payment" 
      });
    }
  });

  // Credit Card Payment (combines transfer + bill tracking)
  router.post("/credit-card-payments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      // Validation schema for credit card payment
      const creditCardPaymentSchema = z.object({
        fromAccountId: z.string().uuid("Invalid source account ID"),
        creditCardAccountId: z.string().uuid("Invalid credit card account ID"),
        amount: z.number().positive("Amount must be positive"),
        txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        description: z.string().min(1, "Description is required").max(200, "Description too long"),
        categoryId: z.string().uuid("Invalid category ID"),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessId: z.string().uuid("Invalid business ID").optional().nullable(),
      });
      
      const validatedData = creditCardPaymentSchema.parse(req.body);
      
      // Convert amount to cents
      const amountCents = Math.round(validatedData.amount * 100);
      
      const ccPaymentData: any = {
        fromAccountId: validatedData.fromAccountId,
        creditCardAccountId: validatedData.creditCardAccountId,
        amountCents,
        txDate: validatedData.txDate,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        isBusinessExpense: validatedData.isBusinessExpense,
        isPersonal: validatedData.isPersonal,
      };
      if (validatedData.businessId) ccPaymentData.businessId = validatedData.businessId;
      
      const result = await storage.createCreditCardPayment(userId, ccPaymentData);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Credit card payment error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid credit card payment data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create credit card payment" 
      });
    }
  });

  // Income Management
  router.post("/income", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      // Validation schema for income request
      const incomeSchema = z.object({
        accountId: z.string().uuid("Invalid account ID"),
        amount: z.number().refine(val => val !== 0, "Amount cannot be zero"),
        txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        description: z.string().min(1, "Description is required").max(200, "Description too long"),
        categoryId: z.string().uuid("Invalid category ID"),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessId: z.string().uuid("Invalid business ID").optional().nullable(),
        taxOnly: z.boolean().optional().default(false),
      });
      
      const validatedData = incomeSchema.parse(req.body);
      
      // Convert amount to cents (positive for income, negative for losses like realized portfolio losses)
      const amountCents = Math.round(validatedData.amount * 100);
      
      const txData: any = {
        accountId: validatedData.accountId,
        amountCents,
        txDate: validatedData.txDate,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        isBusinessExpense: validatedData.isBusinessExpense,
        isPersonal: validatedData.isPersonal,
        taxOnly: validatedData.taxOnly,
      };
      if (validatedData.businessId) txData.businessId = validatedData.businessId;
      
      const result = await storage.createTransaction(userId, txData);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Income creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid income data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create income" 
      });
    }
  });

  // Cash Flow Management - Computed from actual transactions
  router.get("/cash-flow/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const startDate = req.query.start as string;
      const endDate = req.query.end as string || startDate;
      const type = req.query.type as string;

      if (!startDate || !type) {
        return res.status(400).json({ message: "start date and type are required" });
      }

      const transactions = await storage.getCashFlowTransactions(userId, startDate, endDate, type);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching cash flow transactions:", error);
      res.status(500).json({ message: "Failed to fetch cash flow transactions" });
    }
  });

  router.get("/cash-flow", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const date = req.query.date as string;
      
      // Get cash flow computed from actual transactions for this date
      const cashFlow = await storage.getComputedCashFlow(userId, date);
      if (!cashFlow || cashFlow.transactionCount === 0) {
        return res.status(404).json({ message: "No cash flow data found for this date" });
      }
      res.json(cashFlow);
    } catch (error) {
      console.error("❌ Error fetching cash flow:", error);
      res.status(500).json({ message: "Failed to fetch cash flow", error: String(error) });
    }
  });

  router.get("/cash-flow/weekly", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const startDate = req.query.start as string;
      const endDate = req.query.end as string;
      
      const cashFlowEntries = await storage.getComputedWeeklyCashFlow(userId, startDate, endDate);
      res.json(cashFlowEntries);
    } catch (error) {
      console.error("❌ Error fetching weekly cash flow:", error);
      res.status(500).json({ message: "Failed to fetch weekly cash flow", error: String(error) });
    }
  });

  router.get("/cash-flow/monthly", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const month = req.query.month as string; // YYYY-MM format
      
      const cashFlowEntries = await storage.getComputedMonthlyCashFlow(userId, month);
      res.json(cashFlowEntries);
    } catch (error) {
      console.error("❌ Error fetching monthly cash flow:", error);
      res.status(500).json({ message: "Failed to fetch monthly cash flow", error: String(error) });
    }
  });

  router.get("/cash-flow/yearly", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const year = req.query.year as string; // YYYY format
      
      const cashFlowEntries = await storage.getComputedYearlyCashFlow(userId, year);
      res.json(cashFlowEntries);
    } catch (error) {
      console.error("❌ Error fetching yearly cash flow:", error);
      res.status(500).json({ message: "Failed to fetch yearly cash flow", error: String(error) });
    }
  });

  // Import external data (legacy - can be removed)
  router.post("/import-external-data", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const { transactions } = req.body;
      
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: "Invalid transactions data" });
      }

      // Helper function to get or create category
      const getOrCreateCategory = async (name: string, kind: string) => {
        let category = await storage.getCategoryByName(userId, name);
        if (!category) {
          category = await storage.createCategory(userId, { name, kind, userId });
        }
        return category;
      };

      // Get or create categories for income, expense, bill
      const incomeCategory = await getOrCreateCategory("External Income", "income");
      const expenseCategory = await getOrCreateCategory("External Expense", "expense");
      const billCategory = await getOrCreateCategory("External Bill", "bill");

      const importedTransactions = [];

      for (const importData of transactions) {
        // Determine category based on type
        let categoryId;
        if (importData.type === 'income') {
          categoryId = incomeCategory.id;
        } else if (importData.type === 'bill') {
          categoryId = billCategory.id;
        } else {
          categoryId = expenseCategory.id;
        }

        // Create transaction with appropriate amount sign
        // Income = positive, Expense/Bill = negative
        let amountCents;
        if (importData.type === 'income') {
          amountCents = Math.abs(importData.amount * 100); // Positive for income
        } else {
          amountCents = -Math.abs(importData.amount * 100); // Negative for expenses/bills
        }

        const transactionData = {
          txDate: importData.date,
          accountId: importData.accountId,
          amountCents,
          categoryId,
          description: `${importData.description} (Imported ${importData.type})`,
        };

        const validatedData = insertTransactionSchema.parse(transactionData);
        const transaction = await storage.createTransaction(userId, validatedData);
        importedTransactions.push(transaction);
      }

      res.status(201).json({
        message: `Successfully imported ${importedTransactions.length} transactions`,
        transactions: importedTransactions
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(400).json({ message: "Failed to import external data" });
    }
  });


  // Daily Summary
  router.get("/daily-summary", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const summary = await storage.getDailySummary(userId, date);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily summary" });
    }
  });

  // Daily Balances
  router.post("/daily-balances/compute", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const date = req.body.date || new Date().toISOString().split('T')[0];
      const balances = await storage.computeAllDailyBalances(userId, date);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ message: "Failed to compute daily balances" });
    }
  });

  router.post("/accounts/:id/set-balance", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const accountId = req.params.id;
      const schema = z.object({
        correctBalanceCents: z.number().int(),
        date: z.string().optional(),
      });
      const { correctBalanceCents, date } = schema.parse(req.body);
      const targetDate = date || new Date().toISOString().split('T')[0];

      const account = await storage.getAccount(userId, accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const dailyBalance = await storage.computeDailyBalance(userId, accountId, targetDate);
      const currentBalanceCents = dailyBalance.closingCents;
      const adjustmentCents = correctBalanceCents - currentBalanceCents;

      if (adjustmentCents === 0) {
        return res.json({ message: "Balance is already correct", adjustmentCents: 0 });
      }

      let adjustmentCategory = await storage.getOrCreateAdjustmentCategory(userId);

      const adjustmentTx = await storage.createTransaction(userId, {
        txDate: targetDate,
        accountId,
        amountCents: adjustmentCents,
        categoryId: adjustmentCategory.id,
        description: `Balance correction to ${(correctBalanceCents / 100).toFixed(2)}`,
        billId: null,
        transferId: null,
      });

      await storage.clearAccountDailyBalances(userId, accountId);

      const newBalance = await storage.computeDailyBalance(userId, accountId, targetDate);

      res.json({
        message: "Balance corrected successfully",
        adjustmentCents,
        previousBalanceCents: currentBalanceCents,
        newBalanceCents: newBalance.closingCents,
        transactionId: adjustmentTx.id,
      });
    } catch (error) {
      console.error("Error setting account balance:", error);
      res.status(500).json({ message: "Failed to set account balance" });
    }
  });

  router.post("/accounts/bulk-set-balance", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const schema = z.object({
        corrections: z.array(z.object({
          accountId: z.string(),
          correctBalanceCents: z.number().int(),
        })),
        date: z.string().optional(),
      });
      const { corrections, date } = schema.parse(req.body);
      const targetDate = date || new Date().toISOString().split('T')[0];

      const adjustmentCategory = await storage.getOrCreateAdjustmentCategory(userId);
      const results: any[] = [];

      for (const { accountId, correctBalanceCents } of corrections) {
        const account = await storage.getAccount(userId, accountId);
        if (!account) continue;

        const dailyBalance = await storage.computeDailyBalance(userId, accountId, targetDate);
        const currentBalanceCents = dailyBalance.closingCents;
        const adjustmentCents = correctBalanceCents - currentBalanceCents;

        if (adjustmentCents === 0) {
          results.push({ accountId, name: account.name, skipped: true });
          continue;
        }

        await storage.createTransaction(userId, {
          txDate: targetDate,
          accountId,
          amountCents: adjustmentCents,
          categoryId: adjustmentCategory.id,
          description: `Balance correction to ${(correctBalanceCents / 100).toFixed(2)}`,
          billId: null,
          transferId: null,
        });

        await storage.clearAccountDailyBalances(userId, accountId);
        results.push({ accountId, name: account.name, adjustmentCents, previousBalanceCents: currentBalanceCents, newBalanceCents: correctBalanceCents });
      }

      res.json({ message: `Corrected ${results.filter(r => !r.skipped).length} accounts`, results });
    } catch (error) {
      console.error("Error bulk setting balances:", error);
      res.status(500).json({ message: "Failed to set balances" });
    }
  });

  router.post("/daily-balances/clear", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const count = await storage.clearAllDailyBalances(userId);
      console.log(`[BALANCE] User ${userId} cleared all cached balances (${count} entries)`);
      res.json({ message: `Cleared ${count} cached balance entries. Balances will be recomputed on next page load.`, count });
    } catch (error) {
      console.error("Error clearing daily balances:", error);
      res.status(500).json({ message: "Failed to clear daily balances" });
    }
  });

  const apiKeyAuth = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.MEMBERSHIP_VERIFY_API_KEY) {
      return res.status(401).json({ message: "Invalid API key" });
    }
    next();
  };

  router.get("/sync/accounts", apiKeyAuth, async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ message: "Email query parameter is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: `User not found for email: ${email}` });
      }

      const accounts = await storage.getAccounts(user.id);
      const categories = await storage.getCategories(user.id);

      res.json({
        accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type })),
        categories: categories.map(c => ({ id: c.id, name: c.name, kind: c.kind })),
      });
    } catch (error) {
      console.error("[SYNC] Account list error:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  router.post("/sync/expenses", apiKeyAuth, async (req, res) => {
    try {
      const syncSchema = z.object({
        email: z.string().email(),
        amount: z.number().positive(),
        description: z.string().min(1).transform(val => val.length > 200 ? val.slice(0, 197) + '...' : val),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        categoryName: z.string().optional(),
        accountName: z.string().optional(),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessName: z.string().optional(),
        sourceApp: z.string().optional().default("ExpenseWatch"),
        sourceId: z.string().optional(),
        receiptUrl: z.string().url().optional(),
        receiptBase64: z.string().optional(),
        receiptMimeType: z.string().optional(),
      });

      const data = syncSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(404).json({ message: `User not found for email: ${data.email}` });
      }

      const knownAppNames = ['expensewatch', 'billwatch', 'incomelift', 'financewatch'];
      const resolvedAccountName = data.accountName && !knownAppNames.includes(data.accountName.toLowerCase().trim())
        ? data.accountName : undefined;

      const accounts = await storage.getAccounts(user.id);
      let targetAccount = resolvedAccountName
        ? accounts.find(a => a.name.toLowerCase().trim() === resolvedAccountName.toLowerCase().trim())
          || accounts.find(a => a.name.toLowerCase().trim().includes(resolvedAccountName.toLowerCase().trim()))
          || accounts.find(a => resolvedAccountName.toLowerCase().trim().includes(a.name.toLowerCase().trim()))
        : null;

      if (!targetAccount) {
        const fallback = accounts.find(a => ['checking', 'savings'].includes(a.type)) || accounts[0];
        if (!fallback) {
          return res.status(404).json({ message: `No accounts found for user` });
        }
        if (resolvedAccountName) {
          console.log(`[SYNC] Account "${resolvedAccountName}" not found, using fallback: ${fallback.name}`);
        } else {
          console.log(`[SYNC] No valid accountName provided, using fallback: ${fallback.name}`);
        }
        targetAccount = fallback;
      }

      const categories = await storage.getCategories(user.id);
      let category = data.categoryName
        ? categories.find(c => c.name.toLowerCase().trim() === data.categoryName!.toLowerCase().trim())
          || categories.find(c => c.name.toLowerCase().trim().includes(data.categoryName!.toLowerCase().trim()))
        : null;

      if (!category) {
        let syncCategory = categories.find(c => c.name === "Synced Expense");
        if (!syncCategory) {
          syncCategory = await storage.createCategory(user.id, { name: "Synced Expense", kind: "expense", userId: user.id });
        }
        category = syncCategory;
      }

      let businessId: string | null = (targetAccount as any).businessId || null;
      if (!businessId && data.isBusinessExpense && data.businessName) {
        const businesses = await storage.getBusinesses(user.id);
        const biz = businesses.find(b => b.name.toLowerCase().trim() === data.businessName!.toLowerCase().trim());
        if (biz) businessId = biz.id;
      }

      let receiptPath: string | null = null;
      if (data.receiptUrl || data.receiptBase64) {
        try {
          const objStorage = new ObjectStorageService();
          const uploadURL = await objStorage.getObjectEntityUploadURL();
          let fileBuffer: Buffer;
          let contentType = data.receiptMimeType || 'application/octet-stream';

          if (data.receiptBase64) {
            fileBuffer = Buffer.from(data.receiptBase64, 'base64');
          } else {
            const dlRes = await fetch(data.receiptUrl!);
            if (dlRes.ok) {
              fileBuffer = Buffer.from(await dlRes.arrayBuffer());
              contentType = dlRes.headers.get('content-type') || contentType;
            } else {
              console.error(`[SYNC] Failed to download receipt from ${data.receiptUrl}: ${dlRes.status}`);
              fileBuffer = null as any;
            }
          }

          if (fileBuffer) {
            const uploadRes = await fetch(uploadURL, {
              method: 'PUT',
              body: fileBuffer,
              headers: { 'Content-Type': contentType },
            });
            if (uploadRes.ok) {
              receiptPath = objStorage.normalizeObjectEntityPath(uploadURL);
              console.log(`[SYNC] Receipt stored for expense: ${receiptPath}`);
            }
          }
        } catch (storageErr) {
          console.error("[SYNC] Receipt storage error (non-fatal):", storageErr);
        }
      }

      if (data.sourceId) {
        const existing = await storage.getTransactionByExternalSourceId(user.id, data.sourceId);
        if (existing) {
          console.log(`[SYNC] Duplicate skipped (sourceId: ${data.sourceId})`);
          return res.status(200).json({ message: "Already synced", transactionId: existing.id, duplicate: true });
        }
      }

      const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
      const isLiability = liabilityTypes.includes(targetAccount.type);
      const amountCents = isLiability
        ? Math.round(data.amount * 100)
        : -Math.round(data.amount * 100);

      const syncDate = clampToLocalDate(data.date);
      const txData: any = {
        accountId: targetAccount.id,
        amountCents,
        txDate: syncDate,
        description: `${data.description} (via ${data.sourceApp})`,
        categoryId: category.id,
        isBusinessExpense: data.isBusinessExpense,
        isPersonal: data.isPersonal || false,
      };
      if (businessId) txData.businessId = businessId;
      if (receiptPath) txData.receiptPath = receiptPath;
      if (data.sourceId) txData.externalSourceId = data.sourceId;

      const result = await storage.createTransaction(user.id, txData);
      console.log(`[SYNC] Expense synced from ${data.sourceApp} for ${data.email}: $${data.amount} - ${data.description} → ${targetAccount.name} (date: ${syncDate})${receiptPath ? ' [receipt stored]' : ''}`);

      res.status(201).json({
        message: "Expense synced successfully",
        transactionId: result.id,
        account: targetAccount.name,
        amount: data.amount,
        receiptStored: !!receiptPath,
      });
    } catch (error) {
      console.error("[SYNC] Expense sync error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to sync expense" });
    }
  });

  router.post("/sync/bill-payments", apiKeyAuth, async (req, res) => {
    try {
      const syncSchema = z.object({
        email: z.string().email(),
        amount: z.number().positive(),
        description: z.string().min(1).transform(val => val.length > 200 ? val.slice(0, 197) + '...' : val),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        categoryName: z.string().optional(),
        accountName: z.string().optional(),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessName: z.string().optional(),
        sourceApp: z.string().optional().default("BillWatch"),
        sourceId: z.string().optional(),
        receiptUrl: z.string().url().optional(),
        receiptBase64: z.string().optional(),
        receiptMimeType: z.string().optional(),
      });

      const data = syncSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(404).json({ message: `User not found for email: ${data.email}` });
      }

      const accounts = await storage.getAccounts(user.id);
      let targetAccount = data.accountName
        ? accounts.find(a => a.name.toLowerCase().trim() === data.accountName!.toLowerCase().trim())
          || accounts.find(a => a.name.toLowerCase().trim().includes(data.accountName!.toLowerCase().trim()))
          || accounts.find(a => data.accountName!.toLowerCase().trim().includes(a.name.toLowerCase().trim()))
        : null;

      if (!targetAccount) {
        const fallback = accounts.find(a => ['checking', 'savings'].includes(a.type)) || accounts[0];
        if (!fallback) {
          return res.status(404).json({ message: `No accounts found for user` });
        }
        console.log(`[SYNC] Account "${data.accountName}" not found, using fallback: ${fallback.name}`);
        targetAccount = fallback;
      }

      const categories = await storage.getCategories(user.id);
      let category = data.categoryName
        ? categories.find(c => c.name.toLowerCase().trim() === data.categoryName!.toLowerCase().trim() && c.kind === 'bill')
          || categories.find(c => c.name.toLowerCase().trim().includes(data.categoryName!.toLowerCase().trim()) && c.kind === 'bill')
          || categories.find(c => c.name.toLowerCase().trim() === data.categoryName!.toLowerCase().trim())
          || categories.find(c => c.name.toLowerCase().trim().includes(data.categoryName!.toLowerCase().trim()))
        : null;

      if (!category || category.kind !== 'bill') {
        let syncCategory = categories.find(c => c.name === "Synced Bill Payment");
        if (!syncCategory) {
          syncCategory = await storage.createCategory(user.id, { name: "Synced Bill Payment", kind: "bill", userId: user.id });
        }
        category = syncCategory;
      }

      let businessId: string | null = (targetAccount as any).businessId || null;
      if (!businessId && data.isBusinessExpense && data.businessName) {
        const businesses = await storage.getBusinesses(user.id);
        const biz = businesses.find(b => b.name.toLowerCase().trim() === data.businessName!.toLowerCase().trim());
        if (biz) businessId = biz.id;
      }

      let receiptPath: string | null = null;
      if (data.receiptUrl || data.receiptBase64) {
        try {
          const objStorage = new ObjectStorageService();
          const uploadURL = await objStorage.getObjectEntityUploadURL();
          let fileBuffer: Buffer;
          let contentType = data.receiptMimeType || 'application/octet-stream';

          if (data.receiptBase64) {
            fileBuffer = Buffer.from(data.receiptBase64, 'base64');
          } else {
            const dlRes = await fetch(data.receiptUrl!);
            if (dlRes.ok) {
              fileBuffer = Buffer.from(await dlRes.arrayBuffer());
              contentType = dlRes.headers.get('content-type') || contentType;
            } else {
              console.error(`[SYNC] Failed to download receipt from ${data.receiptUrl}: ${dlRes.status}`);
              fileBuffer = null as any;
            }
          }

          if (fileBuffer) {
            const uploadRes = await fetch(uploadURL, {
              method: 'PUT',
              body: fileBuffer,
              headers: { 'Content-Type': contentType },
            });
            if (uploadRes.ok) {
              receiptPath = objStorage.normalizeObjectEntityPath(uploadURL);
              console.log(`[SYNC] Receipt stored for bill payment: ${receiptPath}`);
            }
          }
        } catch (storageErr) {
          console.error("[SYNC] Receipt storage error (non-fatal):", storageErr);
        }
      }

      if (data.sourceId) {
        const existing = await storage.getTransactionByExternalSourceId(user.id, data.sourceId);
        if (existing) {
          console.log(`[SYNC] Duplicate bill payment skipped (sourceId: ${data.sourceId})`);
          return res.status(200).json({ message: "Already synced", transactionId: existing.id, duplicate: true });
        }
      }

      const liabilityTypes = ['credit', 'loan', 'mortgage', 'auto_loan', 'student_loan', 'heloc', 'business_loan'];
      const isLiability = liabilityTypes.includes(targetAccount.type);
      const amountCents = isLiability
        ? Math.round(data.amount * 100)
        : -Math.round(data.amount * 100);

      const syncDate = clampToLocalDate(data.date);
      const txData: any = {
        accountId: targetAccount.id,
        amountCents,
        txDate: syncDate,
        description: `${data.description} (via ${data.sourceApp})`,
        categoryId: category.id,
        isBusinessExpense: data.isBusinessExpense,
        isPersonal: data.isPersonal || false,
      };
      if (businessId) txData.businessId = businessId;
      if (receiptPath) txData.receiptPath = receiptPath;
      if (data.sourceId) txData.externalSourceId = data.sourceId;

      const result = await storage.createTransaction(user.id, txData);
      console.log(`[SYNC] Bill payment synced from ${data.sourceApp} for ${data.email}: $${data.amount} - ${data.description} → ${targetAccount.name} (date: ${syncDate})${receiptPath ? ' [receipt stored]' : ''}`);

      res.status(201).json({
        message: "Bill payment synced successfully",
        transactionId: result.id,
        account: targetAccount.name,
        amount: data.amount,
        receiptStored: !!receiptPath,
      });
    } catch (error) {
      console.error("[SYNC] Bill payment sync error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bill payment data", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to sync bill payment" });
    }
  });

  router.post("/sync/income", apiKeyAuth, async (req, res) => {
    try {
      const syncSchema = z.object({
        email: z.string().email(),
        amount: z.number().refine(val => val !== 0, "Amount cannot be zero"),
        description: z.string().min(1).transform(val => val.length > 200 ? val.slice(0, 197) + '...' : val),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        categoryName: z.string().optional(),
        accountName: z.string().optional(),
        isBusinessExpense: z.boolean().optional().default(false),
        isPersonal: z.boolean().optional().default(false),
        businessName: z.string().optional(),
        sourceApp: z.string().optional().default("IncomeLift"),
        sourceId: z.string().optional(),
      });

      const data = syncSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(404).json({ message: `User not found for email: ${data.email}` });
      }

      const accounts = await storage.getAccounts(user.id);
      let targetAccount = data.accountName
        ? accounts.find(a => a.name.toLowerCase().trim() === data.accountName!.toLowerCase().trim())
          || accounts.find(a => a.name.toLowerCase().trim().includes(data.accountName!.toLowerCase().trim()))
          || accounts.find(a => data.accountName!.toLowerCase().trim().includes(a.name.toLowerCase().trim()))
        : null;

      if (!targetAccount) {
        const fallback = accounts.find(a => ['checking', 'savings'].includes(a.type)) || accounts[0];
        if (!fallback) {
          return res.status(404).json({ message: `No accounts found for user` });
        }
        console.log(`[SYNC] Account "${data.accountName}" not found, using fallback: ${fallback.name}`);
        targetAccount = fallback;
      }

      const categories = await storage.getCategories(user.id);
      let category = data.categoryName
        ? categories.find(c => c.name.toLowerCase().trim() === data.categoryName!.toLowerCase().trim())
          || categories.find(c => c.name.toLowerCase().trim().includes(data.categoryName!.toLowerCase().trim()))
        : null;

      if (!category) {
        let syncCategory = categories.find(c => c.name === "Synced Income");
        if (!syncCategory) {
          syncCategory = await storage.createCategory(user.id, { name: "Synced Income", kind: "income", userId: user.id });
        }
        category = syncCategory;
      }

      let businessId: string | null = (targetAccount as any).businessId || null;
      if (!businessId && data.isBusinessExpense && data.businessName) {
        const businesses = await storage.getBusinesses(user.id);
        const biz = businesses.find(b => b.name.toLowerCase().trim() === data.businessName!.toLowerCase().trim());
        if (biz) businessId = biz.id;
      }

      if (data.sourceId) {
        const existing = await storage.getTransactionByExternalSourceId(user.id, data.sourceId);
        if (existing) {
          console.log(`[SYNC] Duplicate income skipped (sourceId: ${data.sourceId})`);
          return res.status(200).json({ message: "Already synced", transactionId: existing.id, duplicate: true });
        }
      }

      const amountCents = Math.round(data.amount * 100);

      const syncDate = clampToLocalDate(data.date);
      const txData: any = {
        accountId: targetAccount.id,
        amountCents,
        txDate: syncDate,
        description: `${data.description} (via ${data.sourceApp})`,
        categoryId: category.id,
        isBusinessExpense: data.isBusinessExpense,
        isPersonal: data.isPersonal || false,
      };
      if (businessId) txData.businessId = businessId;
      if (data.sourceId) txData.externalSourceId = data.sourceId;

      const result = await storage.createTransaction(user.id, txData);
      console.log(`[SYNC] Income synced from ${data.sourceApp} for ${data.email}: $${data.amount} - ${data.description} → ${targetAccount.name} (date: ${syncDate})`);

      res.status(201).json({
        message: "Income synced successfully",
        transactionId: result.id,
        account: targetAccount.name,
        amount: data.amount,
      });
    } catch (error) {
      console.error("[SYNC] Income sync error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid income data", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to sync income" });
    }
  });

  router.post("/accountant-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { label, filterType, filterYear } = req.body;
      const link = await storage.createAccountantLink(userId, label || "Tax Preparer View", filterType || "all", filterYear || "all");
      res.json(link);
    } catch (e) {
      res.status(500).json({ message: "Failed to create accountant link" });
    }
  });

  router.get("/accountant-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const links = await storage.getAccountantLinks(userId);
      res.json(links);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch accountant links" });
    }
  });

  router.delete("/accountant-link/:token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteAccountantLink(userId, req.params.token);
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ message: "Failed to revoke link" });
    }
  });

  router.get("/public/accountant/:token", async (req, res) => {
    try {
      const link = await storage.getAccountantLinkByToken(req.params.token);
      if (!link) return res.status(404).json({ message: "Link not found or expired" });
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await storage.getPublicAccountantData(link.userId, link.filterType, link.filterYear, startDate, endDate);
      res.json({ ...data, label: link.label, filterType: link.filterType, filterYear: link.filterYear });
    } catch (e) {
      console.error("[ACCOUNTANT] Public data error:", e);
      res.status(500).json({ message: "Failed to load data" });
    }
  });
}
