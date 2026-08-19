import type { Router } from "express";
import { storage } from "./storage";
import { storage as financeStorage } from "../../finance/server/storage.js";
import { isAuthenticated } from "../../../server/auth.js";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { ObjectPermission, setObjectAclPolicy } from "./objectAcl";
import { ocrService } from "./services/ocrService";
import { aiService } from "./services/aiService";
import { syncToFinanceWatch, getFinanceWatchSyncData } from "./services/syncService";
import multer from "multer";
import { z } from "zod";
import { insertExpenseSchema, insertDraftSchema, insertBudgetSchema, insertCategorySchema, insertAccountSchema } from "../shared/schema";
import { toZonedTime } from "date-fns-tz";

// Mountain Time timezone for date conversions
const APP_TIMEZONE = 'America/Denver';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

async function ensureExpenseUser(req: any) {
  const userId = req.user?.claims?.sub;

  if (!userId) {
    throw new Error("Authenticated user ID not available");
  }

  const existing =
    await storage.getUser(userId);

  if (existing) {
    return existing;
  }

  // Prefer the shared auth email.
  let email =
    req.user?.claims?.email ||
    req.user?.email ||
    null;

  // FinanceWatch already knows this Financial OS user,
  // so use it as a fallback source for identity data.
  const financeUser =
    await financeStorage.getUser(userId);

  if (!email) {
    email = financeUser?.email || null;
  }

  if (!email) {
    throw new Error(
      "Unable to initialize ExpenseWatch user: email not available",
    );
  }

  return storage.upsertUser({
    id: userId,
    email,
    firstName:
      req.user?.claims?.first_name ??
      financeUser?.firstName ??
      null,
    lastName:
      req.user?.claims?.last_name ??
      financeUser?.lastName ??
      null,
    profileImageUrl:
      req.user?.claims?.image_url ??
      financeUser?.profileImageUrl ??
      null,
  });
}

export async function registerExpenseRoutes(router: Router): Promise<void> {

  router.patch('/user/currency', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currency } = req.body;
      
      if (!currency || typeof currency !== 'string') {
        return res.status(400).json({ message: "Invalid currency code" });
      }
      
      const user = await storage.updateUserCurrency(userId, currency);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user currency:", error);
      res.status(500).json({ message: "Failed to update currency" });
    }
  });

  // Object storage routes
  router.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  router.post("/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Expense routes
  router.get("/expenses", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { month, year, category, startDate, endDate, search } = req.query;
      
      const filters: any = {};
      if (month) filters.month = parseInt(month as string);
      if (year) filters.year = parseInt(year as string);
      if (category) filters.category = category as string;
      if (search) filters.search = search as string;
      
      // Convert UTC dates to Mountain Time for database filtering
      // Database stores dates as timestamp without timezone in Mountain Time
      if (startDate) {
        const utcDate = new Date(startDate as string);
        filters.startDate = toZonedTime(utcDate, APP_TIMEZONE);
      }
      if (endDate) {
        const utcDate = new Date(endDate as string);
        filters.endDate = toZonedTime(utcDate, APP_TIMEZONE);
      }
      
      const expenses = await storage.getExpenses(userId, filters);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  router.post("/expenses", isAuthenticated, async (req, res) => {
    try {
      const user = await ensureExpenseUser(req);
      const userId = user.id;
      const expenseData = insertExpenseSchema.parse(req.body);

      const expense = await storage.createExpense(userId, expenseData);
      syncToFinanceWatch(userId, user.email, expense).catch((err) =>
        console.error("Background sync to FinanceWatch failed:", err),
      );

      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  router.put("/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const expenseData = insertExpenseSchema.partial().parse(req.body);
      
      const expense = await storage.updateExpense(id, userId, expenseData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  router.delete("/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteExpense(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  router.get("/expenses/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { month, year } = req.query;
      
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
      
      const stats = await storage.getExpenseStats(userId, targetMonth, targetYear);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching expense stats:", error);
      res.status(500).json({ message: "Failed to fetch expense statistics" });
    }
  });

  router.get("/expenses/months", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const months = await storage.getExpenseMonths(userId);
      res.json(months);
    } catch (error) {
      console.error("Error fetching expense months:", error);
      res.status(500).json({ message: "Failed to fetch expense months" });
    }
  });

  router.post("/sync/resync-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      // Minimum allowed sync date — the date the FinanceWatch API was set up
      const MIN_SYNC_DATE = new Date("2026-02-21T00:00:00.000Z");

      const requestedDate = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00.000Z`) : MIN_SYNC_DATE;
      const startDate = requestedDate < MIN_SYNC_DATE ? MIN_SYNC_DATE : requestedDate;

      const allExpenses = await storage.getExpenses(userId, { startDate });
      let synced = 0;
      let failed = 0;

      for (const expense of allExpenses) {
        try {
          await syncToFinanceWatch(userId, user.email, expense);
          synced++;
        } catch {
          failed++;
        }
      }

      res.json({ total: allExpenses.length, synced, failed });
    } catch (error) {
      console.error("Error resyncing all expenses:", error);
      res.status(500).json({ message: "Failed to resync expenses" });
    }
  });

  router.get("/sync/finance-watch-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

const expenseUser = await storage.getUser(userId);

const userEmail =
  expenseUser?.email ||
  req.user?.claims?.email ||
  "";

const data = await getFinanceWatchSyncData(
  userId,
  userEmail,
);
      
      const normalizedAccounts = Array.isArray(data.accounts)
        ? data.accounts.map((a: any) => typeof a === "object" && a !== null ? a.name : String(a))
        : [];
      const normalizedCategories = Array.isArray(data.categories)
        ? data.categories.map((c: any) => typeof c === "object" && c !== null ? c.name : String(c))
        : [];
      res.json({ accounts: normalizedAccounts, categories: normalizedCategories });
    } catch (error) {
      console.error("Error fetching FinanceWatch data:", error);
      res.status(500).json({ message: "Failed to fetch FinanceWatch data" });
    }
  });

  // Account routes
  router.get("/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const accounts = await storage.getAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  router.post("/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await ensureExpenseUser(req);
      const userId = user.id;
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(userId, validatedData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating ExpenseWatch account:", error);
      res.status(500).json({
        message: "Failed to create account",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.put("/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const accountData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(id, userId, accountData);
      if (!account) return res.status(404).json({ message: "Account not found" });
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid account data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  router.delete("/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const deleted = await storage.deleteAccount(id, userId);
      if (!deleted) return res.status(404).json({ message: "Account not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Draft routes
  router.get("/drafts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const drafts = await storage.getDrafts(userId);
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ message: "Failed to fetch drafts" });
    }
  });

  router.post("/drafts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Clean the request body to handle null values BEFORE parsing (same as draft approval fix)
      const cleanRequestBody = {
        ...req.body,
        expenseDate: req.body.expenseDate ?? undefined, // Allow undefined but not null for optional date
      };
      
      const draftData = insertDraftSchema.parse(cleanRequestBody);
      
      const draft = await storage.createDraft(userId, draftData);
      res.status(201).json(draft);
    } catch (error) {
      console.error("Error creating draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid draft data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create draft" });
    }
  });

  router.put("/drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const draftData = insertDraftSchema.partial().parse(req.body);
      
      const draft = await storage.updateDraft(id, userId, draftData);
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
      
      res.json(draft);
    } catch (error) {
      console.error("Error updating draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid draft data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update draft" });
    }
  });

  router.delete("/drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteDraft(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Draft not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ message: "Failed to delete draft" });
    }
  });

  // Convert draft to expense
  router.post("/drafts/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const user = await ensureExpenseUser(req);
      const userId = user.id;
      const { id } = req.params;
      
      // Get the draft
      const drafts = await storage.getDrafts(userId);
      const draft = drafts.find(d => d.id === id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
      
      // Convert draft to expense using EXACT same approach as working manual expense creation
      // Clean the draft data by removing nulls and setting defaults BEFORE parsing
      // Ensure expense date is in Mountain Time to match frontend filtering
      const getCurrentMountainTimeDate = () => {
        // Get current date in Mountain Time (UTC-7 for MDT, UTC-8 for MST)
        // For now, using UTC-7 (Mountain Daylight Time)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const mountainTime = new Date(utc + (-7 * 3600000)); // UTC-7
        return mountainTime;
      };
      
      // Validate expense date - if it's obviously wrong (more than 1 year old or future), use today
      const validateExpenseDate = (date) => {
        if (!date) return getCurrentMountainTimeDate();
        
        const expenseDate = new Date(date);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        
        // If date is more than 1 year old or more than 1 month in future, use today instead
        if (expenseDate < oneYearAgo || expenseDate > oneMonthFuture) {
          console.log(`Invalid expense date detected: ${expenseDate}, using current date instead`);
          return getCurrentMountainTimeDate();
        }
        
        return expenseDate;
      };
      
      const cleanDraftData = {
        amount: draft.amount ?? "0.00",
        description: draft.description ?? "Scanned receipt", 
        category: draft.category ?? "other",
        subcategory: draft.subcategory,
        expenseDate: validateExpenseDate(draft.expenseDate),
        paymentMethod: draft.paymentMethod,
        location: draft.location,
        notes: draft.notes,
        tags: draft.tags ?? [],
        type: draft.type ?? "personal",
        businessName: draft.businessName,
        financeWatchAccount: draft.financeWatchAccount,
        financeWatchCategory: draft.financeWatchCategory,
        receiptImageUrl: draft.receiptImageUrl,
        scannedData: {
          originalText: draft.originalText,
          confidence: draft.confidence,
          source: draft.source ?? "ocr"
        }
      };
      
      // Use EXACT same validation pattern as working manual expense creation
      const expenseData = insertExpenseSchema.parse(cleanDraftData);

      const expense = await storage.createExpense(userId, expenseData);
      syncToFinanceWatch(userId, user.email, expense).catch((err) =>
        console.error("Background sync to FinanceWatch failed:", err),
      );

      // Delete the draft
      await storage.deleteDraft(id, userId);
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error approving draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to approve draft" });
    }
  });

  // OCR and AI routes
  router.post("/ocr/scan", isAuthenticated, upload.single('receipt'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const userId = req.user?.claims?.sub;
      
      // Primary: OCR text extraction + AI text parsing (stable, works for all receipt types)
      const ocrResult = await ocrService.extractTextFromBuffer(req.file.buffer, req.file.mimetype);
      let parsedExpense = await aiService.parseExpenseFromText(ocrResult.text, ocrResult.confidence);

      // Fallback: if amount is still missing, use GPT-4o Vision to read it directly from the image
      if (!parsedExpense.amount) {
        console.log("Amount missing from OCR parse, trying vision fallback");
        const visionResult = await aiService.parseExpenseFromImage(req.file.buffer, req.file.mimetype);
        // Merge vision result into parsed expense, only filling gaps
        parsedExpense = {
          amount: visionResult.amount ?? parsedExpense.amount,
          description: parsedExpense.description ?? visionResult.description,
          category: parsedExpense.category ?? visionResult.category,
          merchant: parsedExpense.merchant ?? visionResult.merchant,
          date: parsedExpense.date ?? visionResult.date,
          paymentMethod: parsedExpense.paymentMethod ?? visionResult.paymentMethod,
          location: parsedExpense.location ?? visionResult.location,
          confidence: Math.max(parsedExpense.confidence, visionResult.confidence),
          reasoning: parsedExpense.reasoning,
        };
      }
      
      // Upload receipt image to object storage
      let receiptImageUrl = null;
      try {
        const objectStorageService = new ObjectStorageService();
        const privateObjectDir = objectStorageService.getPrivateObjectDir();
        
        // Generate unique filename for the receipt
        const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `receipts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const fullPath = `${privateObjectDir}/${fileName}`;
        
        // Parse the path to get bucket and object name
        const pathParts = fullPath.split('/').filter(p => p);
        const bucketName = pathParts[0];
        const objectName = pathParts.slice(1).join('/');
        
        // Upload the file buffer directly to storage
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        
        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          metadata: {
            contentType: req.file.mimetype,
          },
        });
        
        // Set ACL policy for the receipt (private, user-only access)
        await setObjectAclPolicy(file, {
          owner: userId,
          visibility: "private",
        });
        
        // Return normalized path that can be accessed via /objects/ endpoint
        receiptImageUrl = `/objects/${fileName}`;
        
        console.log(`Receipt image uploaded successfully: ${receiptImageUrl}`);
      } catch (storageError) {
        console.error("Failed to upload receipt image:", storageError);
        // Continue processing even if image upload fails
      }
      
      // Create a draft expense
      const draftData: any = {
        amount: parsedExpense.amount ? parsedExpense.amount.toString() : null,
        description: parsedExpense.description,
        category: parsedExpense.category,
        expenseDate: parsedExpense.date ? new Date(parsedExpense.date) : new Date(),
        paymentMethod: parsedExpense.paymentMethod,
        location: parsedExpense.location,
        originalText: ocrResult.text || null,
        confidence: parsedExpense.confidence.toString(),
        source: "ocr",
        receiptImageUrl
      };
      
      const draft = await storage.createDraft(userId, draftData);
      
      res.json({
        draft,
        parsedExpense
      });
    } catch (error) {
      console.error("OCR scanning failed:", error);
      res.status(500).json({ message: "Failed to process receipt image" });
    }
  });

  router.post("/ai/parse-expense", isAuthenticated, async (req, res) => {
    try {
      const { text, ocrConfidence } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "No text provided for parsing" });
      }
      
      const parsedExpense = await aiService.parseExpenseFromText(text, ocrConfidence);
      res.json(parsedExpense);
    } catch (error) {
      console.error("AI parsing failed:", error);
      res.status(500).json({ message: "Failed to parse expense data" });
    }
  });

  router.post("/ai/categorize", isAuthenticated, async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "No description provided for categorization" });
      }
      
      const category = await aiService.categorizePurchase(description);
      res.json(category);
    } catch (error) {
      console.error("AI categorization failed:", error);
      res.status(500).json({ message: "Failed to categorize expense" });
    }
  });

  // Budget routes
  router.get("/budgets/:month/:year", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { month, year } = req.params;
      
      // Validate month and year format
      if (!/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
        return res.status(400).json({ message: "Invalid month or year format" });
      }
      
      const budget = await storage.getBudget(userId, month, year);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.json(budget);
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });

  router.post("/budgets", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const budgetData = insertBudgetSchema.parse(req.body);
      
      const budget = await storage.upsertBudget(userId, budgetData);
      res.json(budget);
    } catch (error) {
      console.error("Error creating/updating budget:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create/update budget" });
    }
  });

  router.delete("/budgets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteBudget(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Category routes
  router.get("/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const categories = await storage.getCategories(userId);
      
      // Auto-seed default categories for new users
      if (categories.length === 0) {
        await storage.seedDefaultCategories(userId);
        const seededCategories = await storage.getCategories(userId);
        // Prevent any caching and 304 responses that can break JSON parsing
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json(seededCategories);
        return;
      }
      
      // Prevent any caching and 304 responses that can break JSON parsing
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  router.post("/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const categoryData = insertCategorySchema.parse(req.body);
      
      const category = await storage.createCategory(userId, categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  router.put("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const categoryData = insertCategorySchema.partial().parse(req.body);
      
      const category = await storage.updateCategory(id, userId, categoryData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  router.delete("/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteCategory(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Sync endpoint
  router.post("/sync", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { localExpenses, localDrafts, lastSyncTimestamp } = req.body;
      
      // Get server data since last sync
      const serverExpenses = await storage.getExpenses(userId);
      const serverDrafts = await storage.getDrafts(userId);
      
      // Filter server data by timestamp if provided
      let newServerExpenses = serverExpenses;
      let newServerDrafts = serverDrafts;
      
      if (lastSyncTimestamp) {
        const syncDate = new Date(lastSyncTimestamp);
        newServerExpenses = serverExpenses.filter(e => 
          e.updatedAt && e.updatedAt > syncDate
        );
        newServerDrafts = serverDrafts.filter(d => 
          d.updatedAt && d.updatedAt > syncDate
        );
      }
      
      // TODO: Implement conflict resolution for local vs server data
      // For now, server data takes precedence
      
      res.json({
        expenses: newServerExpenses,
        drafts: newServerDrafts,
        syncTimestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Sync failed:", error);
      res.status(500).json({ message: "Failed to sync data" });
    }
  });

}
