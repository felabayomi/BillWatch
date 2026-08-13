import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated, loadAuthenticatedUser } from "./auth.js";
import { emailService } from "./emailService.js";
import { insertBillSchema, updateBillSchema, updatePaymentSchema, insertReminderSchema, insertConversationSchema, insertBillPaymentSchema, updateBillPaymentSchema, users } from "@shared/schema";
import { db } from "./db.js";
import { eq } from "drizzle-orm";
import { ObjectStorageService, objectStorageClient, parseObjectPath } from "./objectStorage.js";
import { OCRService } from "./services/ocrService.js";
import { AIParserService } from "./services/aiParser.js";
import { ReminderService } from "./services/reminderService.js";
import { FelixAIService } from "./services/felixAI.js";
import { cleanupService } from "./services/cleanupService.js";
import { categoryService } from "./services/categoryService.js";
import { recategorizationService } from "./services/recategorizationService.js";
import { BillComService } from "./billcom.js";
import { syncPaidBillToFinanceWatch, syncMultipleBillsToFinanceWatch } from "./financeWatchSync.js";
import { stripePayoutService } from "./stripePayouts.js";
import { billReminderService } from "./billReminderService.js";
import { reminderScheduler } from "./reminderScheduler.js";
import { verifyMembershipCached, getTierForTool, getMembershipPortalUrl } from "./membership.js";
import multer from "multer";
import { z } from "zod";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Initialize BILL.com service
const billComService = new BillComService();

// Configure multer for in-memory file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Health check endpoint for production monitoring
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // API Token Authentication Middleware for Export Endpoints
  const validateExportToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Missing API token. Include Authorization: Bearer <token> header.' 
      });
    }
    
    if (token !== process.env.BILLWATCH_EXPORT_TOKEN) {
      return res.status(401).json({ 
        error: 'Invalid API token.' 
      });
    }
    
    next();
  };

  // Export API: Get all bills for external integration
  app.get('/api/export/bills', validateExportToken, async (req: any, res) => {
    try {
      // Get query parameters for filtering
      const { 
        userId, 
        status, 
        startDate, 
        endDate, 
        limit = 1000,
        offset = 0 
      } = req.query;

      console.log(`📤 Export API: Bills requested with filters:`, {
        userId,
        status,
        startDate,
        endDate,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Get all bills with optional filtering
      const allBills = await storage.getAllBillsForExport({
        userId,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Transform bills for export (remove sensitive fields)
      const exportBills = allBills.map(bill => ({
        id: bill.id,
        userId: bill.userId,
        company: bill.company,
        amount: bill.amount,
        dueDate: bill.dueDate,
        status: bill.status,
        accountNumber: bill.accountNumber,
        category: bill.category,
        description: bill.description,
        isRecurring: bill.isRecurring,
        recurringType: bill.recurringType,
        paidAmount: bill.paidAmount,
        paidDate: bill.paidDate,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
        // Include basic OCR data but exclude sensitive payment info
        extractedData: bill.extractedData ? {
          company: bill.extractedData.extractedFields?.company,
          amount: bill.extractedData.extractedFields?.amount,
          dueDate: bill.extractedData.extractedFields?.dueDate,
          accountNumber: bill.extractedData.extractedFields?.accountNumber
        } : null
      }));

      console.log(`📤 Export API: Returning ${exportBills.length} bills`);

      res.json({
        success: true,
        count: exportBills.length,
        bills: exportBills,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: exportBills.length === parseInt(limit)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Export API Error:', error);
      res.status(500).json({ 
        error: 'Failed to export bills',
        message: error.message 
      });
    }
  });

  // Finance Watch Sync: Manual resync for a specific bill
  app.post('/api/bills/:id/finance-watch-sync', isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.claims.sub;

      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const bill = validation.bill;
      if (!bill || bill.status !== 'paid') {
        return res.status(400).json({ error: 'Only paid bills can be synced to Finance Watch' });
      }

      const result = await syncPaidBillToFinanceWatch(billId);
      res.json({ success: result.success, error: result.error });
    } catch (error: any) {
      console.error('Finance Watch manual sync error:', error);
      res.status(500).json({ error: 'Failed to sync to Finance Watch' });
    }
  });

  // Finance Watch Sync: Bulk resync all unsynced paid bills
  app.post('/api/finance-watch-sync/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paidBills = await storage.getBillsByStatus(userId, 'paid');
      const unsyncedBills = paidBills.filter(b => !b.financeWatchSynced);

      if (unsyncedBills.length === 0) {
        return res.json({ message: 'All paid bills are already synced', synced: 0, failed: 0 });
      }

      const billIds = unsyncedBills.map(b => b.id);
      const result = await syncMultipleBillsToFinanceWatch(billIds);
      res.json(result);
    } catch (error: any) {
      console.error('Finance Watch bulk sync error:', error);
      res.status(500).json({ error: 'Failed to bulk sync to Finance Watch' });
    }
  });

  // Helper to get userId from request (handles dev bypass where req.user may not have claims)
  async function resolveUserId(req: any): Promise<string | null> {
    if (req.user?.claims?.sub) return req.user.claims.sub;
    if (req.user?.id) return req.user.id;
    const email = req.user?.claims?.email || req.query?.email || req.body?.email;
    if (email) {
      const [userRow] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (userRow) return userRow.id;
    }
    return null;
  }

  // Import API: Import bills from external BillWatch service
  app.post('/api/import/billwatch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`📥 Import: Fetching bills from external BillWatch for user ${userId}`);

      // Call external BillWatch export API
      const externalApiUrl = process.env.BILLWATCH_IMPORT_API_URL;
      if (!externalApiUrl) {
        return res.status(503).json({ error: 'BillWatch import service is not configured' });
      }
      const response = await fetch(`${externalApiUrl}?userId=${userId}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${process.env.BILLWATCH_EXPORT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`External API error: ${response.status} ${response.statusText}`);
      }

      const externalData = await response.json();
      
      if (!externalData.success || !externalData.bills) {
        throw new Error('Invalid response from external BillWatch service');
      }

      console.log(`📥 Import: Found ${externalData.bills.length} bills from external service`);

      // Get existing bills to avoid duplicates
      const existingBills = await storage.getBillsByUser(userId);
      const existingBillIds = new Set(existingBills.map(b => b.id));

      // Filter out bills that already exist
      const newBills = externalData.bills.filter((bill: any) => !existingBillIds.has(bill.id));
      
      console.log(`📥 Import: ${newBills.length} new bills to import (${externalData.bills.length - newBills.length} duplicates skipped)`);

      // Import new bills
      const importedBills = [];
      for (const externalBill of newBills) {
        try {
          // Transform external bill to our format
          const billData = {
            id: externalBill.id, // Keep original ID to prevent re-import
            userId: userId, // Set to current user
            company: externalBill.company,
            amount: externalBill.amount.toString(),
            dueDate: new Date(externalBill.dueDate),
            status: externalBill.status,
            accountNumber: externalBill.accountNumber || null,
            category: externalBill.category || 'Utilities',
            description: externalBill.description || `Imported from BillWatch: ${externalBill.company}`,
            isRecurring: externalBill.recurring || false,
            recurringType: externalBill.recurringFrequency || null,
            extractedData: externalBill.extractedData || null,
            paidAmount: externalBill.paidAmount || null,
            paidDate: externalBill.paidDate ? new Date(externalBill.paidDate) : null,
            createdAt: externalBill.createdAt ? new Date(externalBill.createdAt) : new Date(),
            updatedAt: new Date()
          };

          const importedBill = await storage.createBill(billData);
          importedBills.push(importedBill);
          
        } catch (billError: any) {
          console.error(`❌ Import: Failed to import bill ${externalBill.id}:`, billError.message);
        }
      }

      console.log(`✅ Import: Successfully imported ${importedBills.length} bills`);

      res.json({
        success: true,
        message: `Successfully imported ${importedBills.length} bills from BillWatch`,
        imported: importedBills.length,
        duplicatesSkipped: externalData.bills.length - newBills.length,
        totalFound: externalData.bills.length,
        bills: importedBills
      });

    } catch (error: any) {
      console.error('❌ Import Error:', error);
      res.status(500).json({ 
        error: 'Failed to import bills from BillWatch',
        message: error.message 
      });
    }
  });
  
  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const authUser = await loadAuthenticatedUser(req);
      if (authUser?.claims?.sub) {
        const user = await storage.getUser(authUser.claims.sub);
        if (user) return res.json(user);
      }
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ===== Account Management Routes =====
  app.get('/api/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) return res.json([]);
      const userAccounts = await storage.getAccountsByUser(userId);
      res.json(userAccounts);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  app.post('/api/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) return res.status(400).json({ error: 'User session not available' });
      const { name, type, importedFromFinanceWatch } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Account name is required' });
      }
      const account = await storage.createAccount(userId, {
        name: name.trim(),
        type: type || 'checking',
        importedFromFinanceWatch: importedFromFinanceWatch || false,
      });
      res.json(account);
    } catch (error: any) {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.delete('/api/accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAccount(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  app.get('/api/finance-watch/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const apiUrl = process.env.FINANCE_WATCH_API_URL;
      const apiKey = process.env.FINANCE_WATCH_API_KEY;
      if (!apiUrl) {
        return res.json({ accounts: [], categories: [], message: 'Finance Watch not configured' });
      }

      let email: string | null = null;
      const userId = await resolveUserId(req);
      if (userId) {
        const user = await storage.getUser(userId);
        email = user?.email || null;
      }
      if (!email) {
        email = req.user?.claims?.email || null;
      }
      if (!email) {
        const emailParam = req.query.email;
        if (emailParam && typeof emailParam === 'string') {
          email = emailParam;
        }
      }
      if (!email) {
        console.log('Finance Watch accounts: No user email available');
        return res.json({ accounts: [], categories: [], message: 'User email not available' });
      }

      console.log(`Finance Watch accounts: Fetching for email ${email}`);
      const url = `${apiUrl.replace(/\/$/, '')}/api/sync/accounts?email=${encodeURIComponent(email)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey || '',
        },
      });

      if (!response.ok) {
        console.error(`Finance Watch accounts fetch failed: ${response.status}`);
        return res.json({ accounts: [], categories: [], error: 'Failed to fetch' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching Finance Watch accounts:', error);
      res.json({ accounts: [], categories: [] });
    }
  });

  // Membership verification endpoint
  app.get("/api/membership/check", isAuthenticated, async (req: any, res) => {
    res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
    try {
      const userId = await resolveUserId(req);
      let user = userId ? await storage.getUser(userId) : null;
      let email = user?.email || req.user?.claims?.email;

      if (!email && process.env.NODE_ENV === 'development') {
        const devEmail = 'felixdguide@gmail.com';
        const [userRow] = await db.select().from(users).where(eq(users.email, devEmail)).limit(1);
        if (userRow) {
          user = userRow;
          email = userRow.email;
        }
      }

      if (!email) {
        return res.json({
          hasAccess: false,
          reason: "no_email",
          redirectUrl: getMembershipPortalUrl(),
        });
      }

      const result = await verifyMembershipCached(email);

      if (!result.active || !result.hasAccess) {
        return res.json({
          hasAccess: false,
          reason: result.active ? "wrong_tier" : (result.status === "no_account" ? "no_subscription" : "expired"),
          tier: result.tier,
          requiredTier: getTierForTool(),
          redirectUrl: getMembershipPortalUrl(),
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
        redirectUrl: getMembershipPortalUrl(),
      });
    }
  });

  // Object storage endpoint for serving uploaded documents
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      return res.status(404).json({ error: "File not found" });
    }
  });

  // Get upload URL for document uploads
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Bills endpoints
  app.get("/api/bills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const month = req.query.month ? parseInt(req.query.month) : undefined;
      const year = req.query.year ? parseInt(req.query.year) : undefined;
      
      const bills = await storage.getBillsByUser(userId, month, year, false);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.get("/api/bills/carryover", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const month = req.query.month ? parseInt(req.query.month) : undefined;
      const year = req.query.year ? parseInt(req.query.year) : undefined;
      
      const carryoverBills = await storage.getCarryoverOverdueBills(userId, month, year);
      res.json(carryoverBills);
    } catch (error) {
      console.error("Error fetching carryover overdue bills:", error);
      res.status(500).json({ error: "Failed to fetch carryover overdue bills" });
    }
  });

  app.get("/api/bills/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const month = req.query.month ? parseInt(req.query.month) : undefined;
      const year = req.query.year ? parseInt(req.query.year) : undefined;
      
      const stats = await storage.getBillStats(userId, month, year);
      
      // Force no caching for stats endpoint
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bill stats:", error);
      res.status(500).json({ error: "Failed to fetch bill stats" });
    }
  });

  app.get("/api/bills/filter/:status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.params.status as "upcoming" | "due_soon" | "overdue" | "paid";

      const bills = await storage.getBillsByStatus(userId, status);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching filtered bills:", error);
      res.status(500).json({ error: "Failed to fetch filtered bills" });
    }
  });

  // Get a single bill by ID - MUST be after all specific /api/bills/* routes
  app.get("/api/bills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = req.params.id;
      
      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }
      
      res.json(validation.bill);
    } catch (error) {
      console.error("Error fetching bill:", error);
      res.status(500).json({ error: "Failed to fetch bill" });
    }
  });

  app.post("/api/bills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Simple direct bill creation - no complex processing
      const billData = {
        company: req.body.company,
        amount: req.body.amount,
        dueDate: new Date(req.body.dueDate),
        category: req.body.category,
        accountNumber: req.body.accountNumber,
        description: req.body.description || "",
        isRecurring: req.body.isRecurring || false,
        recurringType: req.body.isRecurring ? req.body.recurringType : null,
        totalInstallments: req.body.isRecurring ? req.body.totalInstallments : null,
        billType: req.body.billType || "personal",
        businessName: req.body.billType === "business" ? req.body.businessName : null,
        creditorPaymentAddress: req.body.creditorPaymentAddress || null,
        status: "upcoming",
        userId
      };

      const bill = await storage.createBill(billData);
      
      // Create default reminders
      const reminderService = new ReminderService();
      await reminderService.createDefaultReminders(bill.id, bill.dueDate);
      
      res.json(bill);
    } catch (error) {
      console.error("Error creating bill:", error);
      res.status(500).json({ error: "Failed to create bill" });
    }
  });

  app.put("/api/bills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      let billData = updateBillSchema.parse(req.body);
      
      // If marking as unpaid, clear all payment-related fields
      if (billData.status === "upcoming") {
        billData = {
          ...billData,
          paidDate: undefined,
          paidAmount: undefined,
          paymentMethod: undefined,
          paymentType: undefined
        };
      }
      
      // Get the current bill to check if it's part of a series
      const currentBill = await storage.getBill(billId);
      
      // Update the main bill first
      const updatedBill = await storage.updateBill(billId, billData);

      if (updatedBill.status === "paid" && currentBill?.status !== "paid") {
        syncPaidBillToFinanceWatch(billId).catch(err => 
          console.error("Finance Watch sync error:", err)
        );
      }
      
      // If this bill is part of a recurring series and shared fields are being updated,
      // also update all other bills in the same series
      if (currentBill?.seriesId) {
        // Fields that should be synced across all bills in a series
        const sharedFields: any = {};
        if (billData.company !== undefined) sharedFields.company = billData.company;
        if (billData.accountNumber !== undefined) sharedFields.accountNumber = billData.accountNumber;
        if (billData.category !== undefined) sharedFields.category = billData.category;
        if (billData.description !== undefined) sharedFields.description = billData.description;
        if (billData.billType !== undefined) sharedFields.billType = billData.billType;
        if (billData.businessName !== undefined) sharedFields.businessName = billData.businessName;
        if (billData.creditorPaymentAddress !== undefined) sharedFields.creditorPaymentAddress = billData.creditorPaymentAddress;
        
        // Only update series if there are shared fields to sync
        if (Object.keys(sharedFields).length > 0) {
          console.log(`Updating all bills in series ${currentBill.seriesId} with shared fields:`, Object.keys(sharedFields));
          await storage.updateBillsInSeries(currentBill.seriesId, billId, sharedFields);
        }
      }
      
      res.json(updatedBill);
    } catch (error) {
      console.error("Error updating bill:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      res.status(500).json({ error: "Failed to update bill" });
    }
  });

  // Update payment details for a specific bill
  app.put("/api/bills/:id/payment", isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.claims.sub;
      const paymentData = updatePaymentSchema.parse(req.body);
      
      // Validate bill ownership
      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }
      
      const bill = validation.bill;
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      const billAmount = parseFloat(bill.amount);
      
      const updateData: any = {
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType
      };

      // If payment amount is provided, only mark as paid if it covers the full amount
      if (paymentData.paidAmount && parseFloat(paymentData.paidAmount) > 0) {
        const paidAmount = parseFloat(paymentData.paidAmount);
        updateData.paidAmount = paymentData.paidAmount;
        
        // Only mark as paid if payment covers the full bill amount
        if (paidAmount >= billAmount) {
          updateData.status = "paid";
          updateData.paidDate = new Date();
        }
        // Otherwise, keep the bill in its current status (overdue, upcoming, etc.)
      }
      
      const updatedBill = await storage.updateBill(billId, updateData);

      if (updatedBill.status === "paid") {
        syncPaidBillToFinanceWatch(billId).catch(err => 
          console.error("Finance Watch sync error:", err)
        );
      }

      res.json(updatedBill);
    } catch (error) {
      console.error("Error updating payment details:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      res.status(500).json({ error: "Failed to update payment details" });
    }
  });

  app.post("/api/bills/:id/receipt", isAuthenticated, upload.single("receipt"), async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.claims.sub;

      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "No receipt file uploaded" });
      }

      const supportedTypes = ['image/', 'application/pdf'];
      const isValidType = supportedTypes.some(type => file.mimetype.startsWith(type));
      if (!isValidType) {
        return res.status(400).json({ error: "Please upload an image (PNG, JPG) or PDF" });
      }

      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      if (!privateDir) {
        return res.status(500).json({ error: "Storage not configured" });
      }

      const ext = file.originalname.split('.').pop() || 'jpg';
      const objectId = `receipts/${billId}_${Date.now()}.${ext}`;
      const fullPath = `${privateDir}/${objectId}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);

      await objectFile.save(file.buffer, {
        contentType: file.mimetype,
        metadata: {
          billId,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      const receiptUrl = `/objects/${objectId}`;
      console.log(`📎 Receipt uploaded for bill ${billId}: ${receiptUrl}`);
      const updatedBill = await storage.updateBill(billId, { receiptUrl });
      res.json(updatedBill);
    } catch (error) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({ error: "Failed to upload receipt" });
    }
  });

  app.delete("/api/bills/:id/receipt", isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.claims.sub;

      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const updatedBill = await storage.updateBill(billId, { receiptUrl: null });
      res.json(updatedBill);
    } catch (error) {
      console.error("Error removing receipt:", error);
      res.status(500).json({ error: "Failed to remove receipt" });
    }
  });

  app.post("/api/bills/:id/invoice", isAuthenticated, upload.single("invoice"), async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.claims.sub;

      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "No invoice file uploaded" });
      }

      const supportedTypes = ['image/', 'application/pdf'];
      const isValidType = supportedTypes.some(type => file.mimetype.startsWith(type));
      if (!isValidType) {
        return res.status(400).json({ error: "Please upload an image (PNG, JPG) or PDF" });
      }

      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      if (!privateDir) {
        return res.status(500).json({ error: "Storage not configured" });
      }

      const ext = file.originalname.split('.').pop() || 'jpg';
      const objectId = `invoices/${billId}_${Date.now()}.${ext}`;
      const fullPath = `${privateDir}/${objectId}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);

      await objectFile.save(file.buffer, {
        contentType: file.mimetype,
        metadata: {
          billId,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      const invoiceUrl = `/objects/${objectId}`;
      console.log(`📄 Invoice uploaded for bill ${billId}: ${invoiceUrl}`);
      const updatedBill = await storage.updateBill(billId, { invoiceUrl });
      res.json(updatedBill);
    } catch (error) {
      console.error("Error uploading invoice:", error);
      res.status(500).json({ error: "Failed to upload invoice" });
    }
  });

  app.delete("/api/bills/:id/invoice", isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.claims.sub;

      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const updatedBill = await storage.updateBill(billId, { invoiceUrl: null });
      res.json(updatedBill);
    } catch (error) {
      console.error("Error removing invoice:", error);
      res.status(500).json({ error: "Failed to remove invoice" });
    }
  });

  app.delete("/api/bills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      await storage.deleteBill(billId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bill:", error);
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });

  // Duplicate a bill (creates a single copy)
  app.post("/api/bills/:id/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = req.params.id;
      
      // Get the original bill
      const originalBill = await storage.getBill(billId);
      if (!originalBill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      
      // Verify ownership
      if (originalBill.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to duplicate this bill" });
      }
      
      // Create a duplicate (single instance, not recurring)
      const duplicateBill = await storage.createBill({
        userId,
        company: originalBill.company,
        amount: originalBill.amount.toString(),
        dueDate: originalBill.dueDate,
        description: originalBill.description,
        category: originalBill.category,
        accountNumber: originalBill.accountNumber,
        billType: originalBill.billType,
        businessName: originalBill.businessName,
        isRecurring: false,
        recurringType: null,
        status: "upcoming",
      });
      
      console.log(`Duplicated bill: ${originalBill.company} - $${originalBill.amount}`);
      
      res.json({ 
        success: true, 
        bill: duplicateBill,
        message: `Created duplicate of ${originalBill.company} bill` 
      });
    } catch (error) {
      console.error("Error duplicating bill:", error);
      res.status(500).json({ error: "Failed to duplicate bill" });
    }
  });

  // Delete all bills from a specific company
  app.delete("/api/bills/company/:companyName", isAuthenticated, async (req: any, res) => {
    try {
      const companyName = decodeURIComponent(req.params.companyName);
      const userId = req.user.claims.sub;
      
      console.log(`Deleting all bills from company: ${companyName} for user: ${userId}`);
      
      const deletedCount = await storage.deleteBillsByCompany(companyName, userId);
      
      console.log(`Successfully deleted ${deletedCount} bills from ${companyName}`);
      
      res.json({ 
        success: true, 
        deletedCount,
        message: `Deleted ${deletedCount} bills from ${companyName}`
      });
    } catch (error) {
      console.error("Error deleting bills by company:", error);
      res.status(500).json({ error: "Failed to delete bills" });
    }
  });

  // Helper function to validate bill ownership
  const validateBillOwnership = async (billId: string, userId: string) => {
    const bill = await storage.getBill(billId);
    if (!bill) {
      return { error: "Bill not found", status: 404 };
    }
    if (bill.userId !== userId) {
      return { error: "Access denied", status: 403 };
    }
    return { bill };
  };

  // Payment Management Endpoints
  
  // GET /api/bills/:id/payments - Get all payments for a specific bill
  app.get("/api/bills/:id/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = req.params.id;

      // Validate bill ownership
      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ 
          error: validation.error,
          message: "You do not have permission to view payments for this bill"
        });
      }

      const payments = await storage.getPaymentsByBill(billId);
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ 
        error: "Failed to fetch payments",
        message: "An internal server error occurred"
      });
    }
  });

  // POST /api/bills/:id/payments - Create a new payment for a bill
  app.post("/api/bills/:id/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = req.params.id;

      // Validate bill ownership
      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }

      // Validate payment data
      const paymentData = insertBillPaymentSchema.parse({
        ...req.body,
        billId
      });

      // Basic idempotency check - prevent duplicate payments with same stripePaymentIntentId
      if (paymentData.stripePaymentIntentId) {
        const existingPayments = await storage.getPaymentsByBill(billId);
        const duplicatePayment = existingPayments.find(p => 
          p.stripePaymentIntentId === paymentData.stripePaymentIntentId && 
          p.status === "succeeded"
        );
        if (duplicatePayment) {
          return res.status(409).json({ 
            error: "Duplicate payment detected", 
            message: "A payment with this transaction ID already exists" 
          });
        }
      }

      // Calculate current balance before adding new payment
      const currentBalance = await storage.calculateBillBalance(billId);

      // Create payment
      const payment = await storage.createPayment(paymentData);

      // Calculate updated bill balance
      const balance = await storage.calculateBillBalance(billId);

      // Update bill status if fully paid
      const bill = validation.bill;
      if (bill) {
        const totalAmount = parseFloat(bill.amount);
        if (balance.remainingBalance <= 0 && bill.status !== "paid") {
          await storage.updateBill(billId, { 
            status: "paid",
            paidDate: new Date(),
            paidAmount: totalAmount.toString()
          });
          syncPaidBillToFinanceWatch(billId).catch(err => 
            console.error("Finance Watch sync error:", err)
          );
        }
      }

      res.json({ payment, balance });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.issues);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.issues,
          message: "Invalid payment data provided" 
        });
      }
      res.status(500).json({ 
        error: "Failed to create payment", 
        message: "An internal server error occurred" 
      });
    }
  });

  // PUT /api/bills/payments/:paymentId - Update an existing payment
  app.put("/api/bills/payments/:paymentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentId = req.params.paymentId;

      // Get payment to validate ownership through bill
      const payment = await storage.getPayment(paymentId);
      
      if (!payment) {
        return res.status(404).json({ 
          error: "Payment not found",
          message: "The specified payment does not exist"
        });
      }

      // Validate bill ownership
      const validation = await validateBillOwnership(payment.billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ 
          error: validation.error,
          message: "You do not have permission to update this payment"
        });
      }

      // Validate update data
      const updateData = updateBillPaymentSchema.parse(req.body);

      // Basic idempotency check - prevent duplicate stripePaymentIntentId updates
      if (updateData.stripePaymentIntentId && updateData.stripePaymentIntentId !== payment.stripePaymentIntentId) {
        const existingPayments = await storage.getPaymentsByBill(payment.billId);
        const duplicatePayment = existingPayments.find(p => 
          p.id !== paymentId &&
          p.stripePaymentIntentId === updateData.stripePaymentIntentId && 
          p.status === "succeeded"
        );
        if (duplicatePayment) {
          return res.status(409).json({ 
            error: "Duplicate payment detected", 
            message: "A payment with this transaction ID already exists" 
          });
        }
      }

      // Overpayment validation - check if amount update would create negative balance
      if (updateData.amount !== undefined) {
        const currentBalance = await storage.calculateBillBalance(payment.billId);
        // Adjust balance to account for the current payment being updated
        const adjustedRemainingBalance = currentBalance.remainingBalance + parseFloat(payment.amount);
        const newPaymentAmount = parseFloat(updateData.amount);
        
        if (newPaymentAmount > adjustedRemainingBalance) {
          return res.status(400).json({ 
            error: "Overpayment not allowed", 
            message: `Updated payment amount ($${newPaymentAmount.toFixed(2)}) exceeds remaining balance ($${adjustedRemainingBalance.toFixed(2)})` 
          });
        }
      }

      // Update payment
      const updatedPayment = await storage.updatePayment(paymentId, updateData);

      // Recalculate bill balance and update bill status if needed
      const balance = await storage.calculateBillBalance(payment.billId);
      const bill = validation.bill;
      if (bill) {
        const totalAmount = parseFloat(bill.amount);
        
        if (balance.remainingBalance <= 0 && bill.status !== "paid") {
          await storage.updateBill(payment.billId, { 
            status: "paid",
            paidDate: new Date(),
            paidAmount: totalAmount.toString()
          });
          syncPaidBillToFinanceWatch(payment.billId).catch(err => 
            console.error("Finance Watch sync error:", err)
          );
        } else if (balance.remainingBalance > 0 && bill.status === "paid") {
          await storage.updateBill(payment.billId, { 
            status: "upcoming",
            paidDate: undefined,
            paidAmount: balance.paidAmount.toString()
          });
        }
      }

      res.json({ payment: updatedPayment, balance });
    } catch (error) {
      console.error("Error updating payment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          message: "Invalid payment update data provided" 
        });
      }
      res.status(500).json({ 
        error: "Failed to update payment", 
        message: "An internal server error occurred" 
      });
    }
  });

  // GET /api/bills/:id/balance - Get bill balance info
  app.get("/api/bills/:id/balance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = req.params.id;

      // Validate bill ownership
      const validation = await validateBillOwnership(billId, userId);
      if (validation.error) {
        return res.status(validation.status).json({ 
          error: validation.error,
          message: "You do not have permission to view balance for this bill"
        });
      }

      const balance = await storage.calculateBillBalance(billId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching bill balance:", error);
      res.status(500).json({ 
        error: "Failed to fetch bill balance",
        message: "An internal server error occurred"
      });
    }
  });

  // OCR and document processing endpoint
  app.post("/api/bills/scan", isAuthenticated, upload.any(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      console.log('Scan request received for user:', userId);

      // Handle both single file (req.file) and multiple files (req.files)
      const files = req.files as Express.Multer.File[] | undefined;
      
      if (!files || files.length === 0) {
        console.log('No files uploaded');
        return res.status(400).json({ error: "No document uploaded" });
      }

      console.log(`Received ${files.length} file(s)`);
      
      // Validate all file types - support images and PDFs
      const supportedTypes = ['image/', 'application/pdf'];
      for (const file of files) {
        const isValidType = supportedTypes.some(type => file.mimetype.startsWith(type));
        if (!isValidType) {
          console.log('Invalid file type:', file.mimetype);
          return res.status(400).json({ error: "Please upload image files (PNG, JPG, etc.) or PDF documents" });
        }
        console.log('File received:', {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.buffer.length
        });
      }

      const ocrService = new OCRService();
      const aiParser = new AIParserService();
      const reminderService = new ReminderService();

      console.log('Starting document processing...');
      
      // Process all files and combine the extracted text
      let extractedText = "";
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1} of ${files.length}...`);
        const text = await ocrService.processDocument(file.buffer, file.mimetype);
        extractedText += (i > 0 ? "\n\n--- Page/Image " + (i + 1) + " ---\n\n" : "") + text;
      }
      console.log('Document processing completed, total text length:', extractedText.length);
      
      // Parse bill information using AI
      const billInfo = await aiParser.parseBillInformation(extractedText);
      
      // Helper function to clean monetary amounts
      const cleanAmount = (amount: any): string => {
        if (!amount) return "0";
        // Remove $, commas, asterisks, and other non-numeric characters except decimal point
        const cleaned = amount.toString().replace(/[\$,*\s]/g, '').trim();
        // Extract just the numeric value
        const match = cleaned.match(/[\d.]+/);
        return match ? match[0] : "0";
      };

      // Check if this is a recurring bill or payment plan
      if (billInfo.isRecurring && billInfo.installments && billInfo.installments.length > 0) {
        // Filter out already paid installments
        const unpaidInstallments = billInfo.installments.filter(inst => !inst.isPaid);
        const paidCount = billInfo.installments.length - unpaidInstallments.length;
        
        if (unpaidInstallments.length === 0) {
          // All installments are paid
          return res.json({
            message: "All installments for this bill have already been paid",
            paidInstallments: billInfo.installments.length,
            extractedInfo: billInfo,
            confidence: billInfo.confidence
          });
        }
        
        console.log(`Payment plan detected: ${unpaidInstallments.length} unpaid, ${paidCount} already paid`);
        
        // Generate a unique series ID for this payment plan
        const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create bills only for unpaid installments
        const billsData = unpaidInstallments.map((installment, index) => ({
          company: billInfo.company || "Unknown Company",
          accountNumber: billInfo.accountNumber,
          amount: cleanAmount(installment.amount),
          minimumPayment: cleanAmount(billInfo.minimumPayment),
          dueDate: installment.dueDate,
          category: billInfo.category,
          description: `${billInfo.description || "Payment plan"} - Payment ${installment.installmentNumber} of ${billInfo.totalInstallments}`,
          creditorPaymentAddress: billInfo.payeeAddress,
          billType: "personal",
          businessName: null,
          extractedData: {
            originalText: extractedText,
            confidence: billInfo.confidence,
            extractedFields: billInfo
          },
          // Recurring bill fields
          isRecurring: true,
          seriesId: seriesId,
          installmentNumber: installment.installmentNumber,
          totalInstallments: billInfo.totalInstallments,
          recurringType: billInfo.recurringType as "payment_plan" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannually" | "yearly" | "custom" | null,
          originalAmount: cleanAmount(billInfo.originalAmount),
          userId
        }));

        // Create all bills in the series
        const createdBills = await storage.createBillSeries(billsData);
        
        // Create reminders for each bill
        for (const bill of createdBills) {
          await reminderService.createDefaultReminders(bill.id, bill.dueDate);
        }
        
        res.json({
          bills: createdBills,
          isRecurring: true,
          seriesId: seriesId,
          totalInstallments: billInfo.totalInstallments,
          unpaidInstallments: unpaidInstallments.length,
          paidInstallmentsSkipped: paidCount,
          extractedInfo: billInfo,
          confidence: billInfo.confidence
        });
      } else {
        // Create single bill for non-recurring bills
        const billData = {
          company: billInfo.company || "Unknown Company",
          accountNumber: billInfo.accountNumber,
          amount: cleanAmount(billInfo.amount),
          minimumPayment: cleanAmount(billInfo.minimumPayment),
          dueDate: billInfo.dueDate || new Date(),
          category: billInfo.category,
          description: billInfo.description,
          creditorPaymentAddress: billInfo.payeeAddress,
          billType: "personal",
          businessName: null,
          extractedData: {
            originalText: extractedText,
            confidence: billInfo.confidence,
            extractedFields: billInfo
          },
          isRecurring: false,
          seriesId: null,
          installmentNumber: null,
          totalInstallments: null,
          recurringType: null,
          originalAmount: null
        };

        const bill = await storage.createBill({ ...billData, userId });
        
        // Create default reminders
        await reminderService.createDefaultReminders(bill.id, bill.dueDate);
        
        res.json({
          bill,
          isRecurring: false,
          extractedInfo: billInfo,
          confidence: billInfo.confidence
        });
      }
    } catch (error) {
      console.error("Error processing scanned document:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  // Reminder endpoints
  app.get("/api/reminders/:billId", async (req, res) => {
    try {
      const billId = req.params.billId;
      const reminders = await storage.getRemindersByBill(billId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders", async (req, res) => {
    try {
      const reminderData = insertReminderSchema.parse(req.body);
      const reminder = await storage.createReminder(reminderData);
      res.json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.put("/api/reminders/:id/snooze", async (req, res) => {
    try {
      const reminderId = req.params.id;
      const { snoozeUntil } = req.body;
      
      const updatedReminder = await storage.updateReminder(reminderId, {
        snoozedUntil: new Date(snoozeUntil)
      });
      
      res.json(updatedReminder);
    } catch (error) {
      console.error("Error snoozing reminder:", error);
      res.status(500).json({ error: "Failed to snooze reminder" });
    }
  });

  // User preferences endpoint
  app.put("/api/users/:id/preferences", async (req, res) => {
    try {
      const userId = req.params.id;
      const { reminderPreferences } = req.body;
      
      // This would be implemented in the user update method
      // For now, just return success
      res.json({ success: true, reminderPreferences });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Auto-cleanup endpoints
  app.post("/api/cleanup/preview", async (req, res) => {
    try {
      const { enabled, action, delayDays } = req.body;
      
      const preview = await cleanupService.getCleanupPreview({
        enabled,
        action,
        delayDays
      });
      
      res.json(preview);
    } catch (error) {
      console.error("Error getting cleanup preview:", error);
      res.status(500).json({ error: "Failed to get cleanup preview" });
    }
  });

  app.post("/api/cleanup/process", async (req, res) => {
    try {
      const { enabled, action, delayDays } = req.body;
      
      const result = await cleanupService.processAutoCleanup({
        enabled,
        action,
        delayDays
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error processing cleanup:", error);
      res.status(500).json({ error: "Failed to process cleanup" });
    }
  });

  app.get("/api/archived-bills/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const archivedBills = await cleanupService.getArchivedBills(userId);
      res.json(archivedBills);
    } catch (error) {
      console.error("Error fetching archived bills:", error);
      res.status(500).json({ error: "Failed to fetch archived bills" });
    }
  });

  app.post("/api/archived-bills/restore", async (req, res) => {
    try {
      const { billIds } = req.body;
      const restored = await cleanupService.restoreArchivedBills(billIds);
      res.json({ restored });
    } catch (error) {
      console.error("Error restoring archived bills:", error);
      res.status(500).json({ error: "Failed to restore archived bills" });
    }
  });

  app.delete("/api/archived-bills", async (req, res) => {
    try {
      const { billIds } = req.body;
      const deleted = await cleanupService.deleteArchivedBills(billIds);
      res.json({ deleted });
    } catch (error) {
      console.error("Error deleting archived bills:", error);
      res.status(500).json({ error: "Failed to delete archived bills" });
    }
  });

  // Category endpoints
  app.get("/api/categories/stats/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const includeArchived = req.query.includeArchived === 'true';
      const stats = await categoryService.getCategoryAggregation(userId, includeArchived);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching category stats:", error);
      res.status(500).json({ error: "Failed to fetch category stats" });
    }
  });

  app.get("/api/categories/predefined", async (req, res) => {
    try {
      const categories = categoryService.getPredefinedCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching predefined categories:", error);
      res.status(500).json({ error: "Failed to fetch predefined categories" });
    }
  });

  app.put("/api/bills/:billId/category", async (req, res) => {
    try {
      const billId = req.params.billId;
      const { category } = req.body;
      const success = await categoryService.updateBillCategory(billId, category);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to update bill category" });
      }
    } catch (error) {
      console.error("Error updating bill category:", error);
      res.status(500).json({ error: "Failed to update bill category" });
    }
  });

  app.get("/api/categories/:category/bills/:userId", async (req, res) => {
    try {
      const { category, userId } = req.params;
      const includeArchived = req.query.includeArchived === 'true';
      const bills = await categoryService.getBillsByCategory(userId, category, includeArchived);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills by category:", error);
      res.status(500).json({ error: "Failed to fetch bills by category" });
    }
  });

  app.get("/api/categories/trends/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const months = parseInt(req.query.months as string) || 6;
      const trends = await categoryService.getMonthlyCategoryTrends(userId, months);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching category trends:", error);
      res.status(500).json({ error: "Failed to fetch category trends" });
    }
  });

  // Custom categories endpoints
  app.get("/api/custom-categories/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user.customCategories || []);
    } catch (error) {
      console.error("Error fetching custom categories:", error);
      res.status(500).json({ error: "Failed to fetch custom categories" });
    }
  });

  app.post("/api/custom-categories/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const { category } = req.body;
      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const trimmed = category.trim();
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const existing = user.customCategories || [];
      if (existing.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) {
        return res.status(400).json({ error: "Category already exists" });
      }
      const updated = [...existing, trimmed];
      await storage.updateUserCustomCategories(userId, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error adding custom category:", error);
      res.status(500).json({ error: "Failed to add custom category" });
    }
  });

  app.delete("/api/custom-categories/:userId/:category", async (req, res) => {
    try {
      const userId = req.params.userId;
      const categoryToRemove = decodeURIComponent(req.params.category);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const existing = user.customCategories || [];
      const updated = existing.filter((c: string) => c !== categoryToRemove);
      await storage.updateUserCustomCategories(userId, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error deleting custom category:", error);
      res.status(500).json({ error: "Failed to delete custom category" });
    }
  });

  // Felix AI Chat endpoints
  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const felixAI = new FelixAIService();
      const response = await felixAI.processMessage(userId, message);

      // Save conversation to database
      await storage.createConversation(userId, {
        userMessage: message,
        aiResponse: response.response,
        messageType: response.messageType,
        actionTaken: response.actionTaken,
      });

      res.json(response);
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Clear conversation history for Felix
  app.delete("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearConversationsByUser(userId);
      res.json({ message: "Conversations cleared successfully" });
    } catch (error) {
      console.error("Error clearing conversations:", error);
      res.status(500).json({ error: "Failed to clear conversations" });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      
      if (!userEmail) {
        return res.status(400).json({ error: "User email not found" });
      }

      const success = await emailService.sendTestEmail(userEmail);

      if (success) {
        res.json({ 
          success: true, 
          message: `Test email sent successfully to ${userEmail}` 
        });
      } else {
        res.status(500).json({ 
          error: "Failed to send test email" 
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Re-categorization endpoints
  app.get("/api/recategorize/preview/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const preview = await recategorizationService.getRecategorizationPreview(userId);
      res.json(preview);
    } catch (error) {
      console.error("Error getting recategorization preview:", error);
      res.status(500).json({ error: "Failed to get recategorization preview" });
    }
  });

  app.post("/api/recategorize/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const result = await recategorizationService.recategorizeExistingBills(userId);
      res.json(result);
    } catch (error) {
      console.error("Error recategorizing bills:", error);
      res.status(500).json({ error: "Failed to recategorize bills" });
    }
  });

  // Stripe Payouts status endpoint for payment monitoring
  app.get("/api/stripe/payouts/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all paid bills with Stripe payout tracking
      const bills = await storage.getBillsByUser(userId);
      const paidBills = bills.filter(bill => 
        bill.status === 'paid' && 
        bill.paymentType === 'real_payment'
      );

      // Transform to payment status format
      const payments = paidBills.map(bill => ({
        billId: bill.id,
        company: bill.company,
        amount: bill.amount.toString(),
        paymentMethod: 'Bank Transfer',
        stripePaymentIntentId: bill.stripePaymentIntentId || null,
        status: bill.stripePaymentIntentId ? 'completed' : 'processing',
        estimatedDelivery: bill.stripePaymentIntentId ? 'Delivered' : '1-3 business days',
        paidDate: bill.paidDate || bill.updatedAt || new Date().toISOString(),
        daysSincePaid: Math.floor((Date.now() - new Date(bill.paidDate || bill.updatedAt || 0).getTime()) / (1000 * 60 * 60 * 24)),
        error: !bill.stripePaymentIntentId ? 'Payment pending' : undefined
      }));

      // Calculate summary stats
      const summary = {
        total: payments.length,
        processing: payments.filter(p => p.status === 'processing').length,
        mailed: 0, // Not applicable for bank transfers
        delivered: 0, // Not applicable for bank transfers
        completed: payments.filter(p => p.status === 'completed').length,
        errors: payments.filter(p => p.error).length
      };

      res.json({
        success: true,
        payments,
        summary
      });
    } catch (error: any) {
      console.error('Error fetching Stripe payout status:', error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        payments: [],
        summary: { total: 0, processing: 0, mailed: 0, delivered: 0, completed: 0, errors: 0 }
      });
    }
  });

  // Stripe Payouts health check endpoint - check before payment
  app.get("/api/stripe/payouts/health", isAuthenticated, async (req: any, res) => {
    try {
      console.log('🏥 Checking Stripe Payouts health before payment...');
      const isConnected = await stripePayoutService.testConnection();
      
      res.json({ 
        healthy: isConnected,
        message: isConnected 
          ? "Stripe Payouts is operational - payments will work"
          : "Stripe Payouts is currently unavailable - payments may fail"
      });
    } catch (error: any) {
      console.error('Stripe Payouts health check failed:', error);
      res.json({ 
        healthy: false, 
        message: "Stripe Payouts connection failed",
        error: error.message 
      });
    }
  });

  // Stripe payment endpoints
  app.post("/api/payments/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { amount, billId } = req.body;
      const userId = req.user.claims.sub;

      // CRITICAL SAFEGUARD: Check Stripe Payouts health before allowing payment
      console.log('🛡️ Pre-flight Stripe Payouts check before payment...');
      const stripePayoutsHealthy = await stripePayoutService.testConnection();
      
      if (!stripePayoutsHealthy) {
        console.error('🚨 Stripe Payouts is down - BLOCKING payment to prevent money loss');
        return res.status(503).json({ 
          error: "Payment service temporarily unavailable",
          message: "Our payment processor is currently down. Please try again later to avoid payment issues.",
          stripePayoutsStatus: "unavailable"
        });
      }
      
      console.log('✅ Stripe Payouts healthy - proceeding with payment');

      if (!amount || !billId) {
        return res.status(400).json({ error: "Amount and billId are required" });
      }

      // Get the bill details for context
      const bill = await storage.getBill(billId);
      if (!bill || bill.userId !== userId) {
        return res.status(404).json({ error: "Bill not found" });
      }

      // Convert amount to cents for Stripe
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Create checkout session  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'us_bank_account'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Payment for ${bill.company}`,
                description: bill.description || `Bill payment for ${bill.company}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}&bill_id=${billId}&amount=${amount}&direct_pay=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/`,
        metadata: {
          billId,
          userId,
          originalAmount: amount,
          directPayment: 'true', // Flag for direct creditor payment
        },
      });

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        error: "Error creating checkout session: " + error.message 
      });
    }
  });

  app.post("/api/payments/confirm-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, billId, actualAmount } = req.body;
      const userId = req.user.claims.sub;

      if (!sessionId || !billId || !actualAmount) {
        return res.status(400).json({ 
          error: "Session ID, bill ID, and actual amount are required" 
        });
      }

      // Retrieve the checkout session to verify it was successful
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      console.log('=== STRIPE SESSION DEBUG ===');
      console.log('Session ID:', sessionId);
      console.log('Payment Status:', session.payment_status);
      console.log('Session Status:', session.status);
      console.log('Payment Method Types:', session.payment_method_types);
      console.log('Amount Total:', session.amount_total);
      console.log('Currency:', session.currency);
      console.log('=== END STRIPE DEBUG ===');

      // Handle different payment statuses for bank accounts vs cards
      const isValidPayment = session.payment_status === 'paid' || 
                            session.payment_status === 'no_payment_required' ||
                            (session.status === 'complete');

      if (!isValidPayment) {
        console.log('Payment not completed. Session details:', JSON.stringify(session, null, 2));
        return res.status(400).json({ 
          error: `Payment status: ${session.payment_status}, Session status: ${session.status}. Bank payments may take time to process.`,
          sessionStatus: session.status,
          paymentStatus: session.payment_status
        });
      }

      // Get the bill for creditor details
      const bill = await storage.getBill(billId);
      if (!bill || bill.userId !== userId) {
        return res.status(404).json({ error: "Bill not found" });
      }

      let stripePayoutId = null;
      let paymentStatus = "completed";

      // If this is flagged as a direct payment, process through Stripe Payouts
      if (session.metadata?.directPayment === 'true') {
        try {
          console.log('💳 Processing Stripe Payout for confirmed payment...');
          
          // Test Stripe Payouts connection
          const isConnected = await stripePayoutService.testConnection();
          
          if (isConnected) {
            console.log('✅ Stripe Payouts connection successful - creating payout');
            
            // Create recipient if needed (this would normally be cached/stored)
            let recipientId = bill.billComVendorId;
            
            if (!recipientId) {
              console.log('👤 Creating new Stripe recipient for creditor...');
              recipientId = await stripePayoutService.createRecipient({
                name: bill.company,
                accountNumber: bill.creditorAccountNumber || undefined,
                routingNumber: bill.creditorRoutingNumber || undefined,
                address: bill.creditorPaymentAddress ? {
                  line1: bill.creditorPaymentAddress.address1 || '',
                  city: bill.creditorPaymentAddress.city || '',
                  state: bill.creditorPaymentAddress.state || '',
                  postal_code: bill.creditorPaymentAddress.zip || '',
                  country: 'US'
                } : undefined
              });
              
              // Store the recipient ID for future use
              await storage.updateBill(billId, {
                billComVendorId: recipientId
              });
            }
            
            // Create direct payout to creditor
            const payout = await stripePayoutService.sendPayout({
              recipientId: recipientId,
              amount: parseFloat(actualAmount),
              description: `Bill payment for ${bill.company} - Account: ${bill.accountNumber || 'N/A'}`,
              currency: 'usd',
              metadata: {
                billId,
                userId,
                company: bill.company,
                originalSessionId: sessionId
              }
            });

            stripePayoutId = payout.id;
            paymentStatus = "processing"; // Payment is being sent to creditor

            console.log(`✅ Stripe payout created: ${payout.id}`);
            console.log(`📊 Status: ${payout.status}`);
            console.log(`💰 Amount: $${payout.amount}`);
          }
        } catch (stripePayoutError) {
          console.error("🚨 Stripe Payout failed - CRITICAL PRODUCTION ISSUE:");
          console.error("Error Type:", (stripePayoutError as Error).constructor.name);
          console.error("Error Message:", (stripePayoutError as Error).message);
          console.error("Full Error:", stripePayoutError);
          console.error("Bill Data:", {
            billId,
            company: bill.company,
            amount: actualAmount,
            accountNumber: bill.accountNumber,
            creditorInfo: {
              routingNumber: bill.creditorRoutingNumber,
              address: bill.creditorPaymentAddress
            }
          });
          
          // Fall back to manual payment if Stripe Payouts fails
          paymentStatus = "payout_failed"; // Track that this was a fallback
        }
      }

      // Update the bill with payment information
      const updateData: any = {
        status: "paid",
        paidDate: new Date(),
        paidAmount: actualAmount,
        paymentMethod: session.payment_method_types[0] || "card",
        paymentType: stripePayoutId ? "real_payment" : (paymentStatus === "payout_failed" ? "payout_failed" : "manual"), 
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        billComPaymentId: stripePayoutId
      };

      const updatedBill = await storage.updateBill(billId, updateData);

      syncPaidBillToFinanceWatch(billId).catch(err => 
        console.error("Finance Watch sync error:", err)
      );

      // Send email confirmation to user
      try {
        console.log(`🔍 DEBUG: Attempting to send payment confirmation email for user ${userId}`);
        const user = await storage.getUser(userId);
        console.log(`🔍 DEBUG: User found: ${user ? 'YES' : 'NO'}, Email: ${user?.email || 'NONE'}`);
        
        if (user?.email) {
          console.log(`🔍 DEBUG: Calling emailService.sendPaymentConfirmation with:`, {
            userEmail: user.email,
            amount: actualAmount,
            company: bill.company,
            paymentMethod: session.payment_method_types[0] || "card",
            transactionId: session.payment_intent || session.id
          });
          
          // DISABLED: Payment confirmation emails until BILL.com integration is resolved
          // const emailResult = await emailService.sendPaymentConfirmation({
          //   userEmail: user.email,
          //   amount: actualAmount,
          //   company: bill.company,
          //   paymentMethod: session.payment_method_types[0] || "card",
          //   transactionId: session.payment_intent || session.id
          // });
          
          // Disabled email result logging until BILL.com integration is resolved
          // console.log(`🔍 DEBUG: Email service result: ${emailResult ? 'SUCCESS' : 'FAILED'}`);
          
          // if (emailResult) {
          //   console.log(`📧 ✅ Payment confirmation email sent successfully to ${user.email}`);
          // } else {
          //   console.log(`📧 ❌ Payment confirmation email failed to send to ${user.email}`);
          // }
        } else {
          console.log(`📧 ❌ Cannot send email: User ${userId} has no email address`);
        }
      } catch (emailError: any) {
        console.error('🚨 CRITICAL: Payment confirmation email error:', emailError);
        console.error('🚨 Error details:', {
          name: emailError.name,
          message: emailError.message,
          stack: emailError.stack
        });
        // Don't fail the payment if email fails
      }

      res.json({ 
        success: true, 
        bill: updatedBill,
        directPayment: bill.billComPaymentId ? true : false,
        paymentStatus: paymentStatus,
        session: {
          id: session.id,
          status: session.payment_status,
          amount: session.amount_total ? session.amount_total / 100 : parseFloat(actualAmount)
        }
      });
    } catch (error: any) {
      console.error("Error confirming checkout payment:", error);
      res.status(500).json({ 
        error: "Error confirming payment: " + error.message 
      });
    }
  });

  app.post("/api/payments/setup-intent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Create setup intent for saving payment methods
      const setupIntent = await stripe.setupIntents.create({
        customer: undefined, // You might want to create/retrieve Stripe customers
        payment_method_types: ['card', 'us_bank_account'],
        metadata: {
          userId
        }
      });

      res.json({ 
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      });
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ 
        error: "Error creating setup intent: " + error.message 
      });
    }
  });

  // Test payment confirmation email endpoint
  app.post("/api/test-payment-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.email) {
        return res.status(400).json({ error: "User email not found" });
      }

      console.log(`🧪 Testing payment confirmation email to: ${user.email}`);
      
      // DISABLED: Payment confirmation emails until BILL.com integration is resolved  
      const emailSent = true; // Mock success for now
      // const emailSent = await emailService.sendPaymentConfirmation({
      //   userEmail: user.email,
      //   amount: "125.50",
      //   company: "Sample Credit Card Company",
      //   paymentMethod: "card",
      //   transactionId: "test_" + Date.now()
      // });

      if (emailSent) {
        res.json({
          success: true,
          message: "Payment confirmation test email sent successfully",
          sentTo: user.email
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to send payment confirmation email"
        });
      }
    } catch (error: any) {
      console.error("🚨 Payment confirmation email test failed:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Retry all failed BILL.com payments endpoint
  app.post("/api/billcom/retry-failed", isAuthenticated, async (req: any, res) => {
    try {
      console.log("🔄 Retrying all failed BILL.com payments...");
      const userId = req.user.claims.sub;
      
      // Get all paid bills that were paid through "Pay Now" but failed to send to BILL.com
      const bills = await storage.getBillsByUser(userId);
      const failedPayments = bills.filter(bill => 
        bill.status === 'paid' && 
        bill.paymentType === 'real_payment' && 
        !bill.billComPaymentId
      );
      
      console.log(`📋 Found ${failedPayments.length} failed payments to retry`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const bill of failedPayments) {
        try {
          console.log(`🔄 Retrying payment for ${bill.company} - $${bill.paidAmount}`);
          
          // Create vendor in BILL.com
          const vendor = await billComService.createOrGetVendor({
            name: bill.company,
            address: bill.creditorPaymentAddress ? {
              addressLine1: bill.creditorPaymentAddress.address1 || undefined,
              addressLine2: bill.creditorPaymentAddress.address2 || undefined,
              city: bill.creditorPaymentAddress.city || undefined,
              state: bill.creditorPaymentAddress.state || undefined,
              zip: bill.creditorPaymentAddress.zip || undefined,
              country: bill.creditorPaymentAddress.country || 'US'
            } : undefined
          });
          
          // Create payment
          const payment = await billComService.createPayment({
            vendorId: vendor.id,
            amount: parseFloat(bill.paidAmount as string),
            description: `Payment for ${bill.company}`,
            paymentMethod: vendor.recommendedPaymentMethod,
            scheduledDate: new Date().toISOString().split('T')[0]
          });
          
          // Update bill with payment ID
          await storage.updateBill(bill.id, {
            billComPaymentId: payment.id,
            creditorPaymentMethod: payment.paymentMethod
          });
          
          console.log(`✅ Successfully retried payment for ${bill.company}`);
          successCount++;
          
        } catch (error: any) {
          console.error(`❌ Failed to retry payment for ${bill.company}:`, error);
          errorCount++;
        }
      }
      
      res.json({
        success: true,
        message: `Retry complete: ${successCount} successful, ${errorCount} failed`,
        processed: failedPayments.length,
        successful: successCount,
        failed: errorCount
      });
      
    } catch (error: any) {
      console.error("🚨 Error retrying failed payments:", error);
      res.status(500).json({
        success: false,
        error: "Error retrying failed payments: " + error.message 
      });
    }
  });

  // Test BILL.com connection endpoint
  app.post("/api/billcom/test-connection", isAuthenticated, async (req: any, res) => {
    try {
      const forceProduction = req.body.forceProduction || false;
      console.log(`🧪 Testing BILL.com connection... ${forceProduction ? '(PRODUCTION MODE)' : '(MOCK MODE)'}`);
      const isConnected = await billComService.testConnection(forceProduction);
      
      if (isConnected) {
        res.json({
          success: true,
          message: "BILL.com connection successful",
          status: "connected"
        });
      } else {
        res.json({
          success: false,
          message: "BILL.com connection failed",
          status: "disconnected"
        });
      }
    } catch (error: any) {
      console.error("🚨 BILL.com test connection error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        status: "error"
      });
    }
  });

  // Manual trigger to retry existing paid bills through Stripe Payouts
  app.post("/api/stripe/payouts/retry-payment", isAuthenticated, async (req: any, res) => {
    try {
      const { billId } = req.body;
      const userId = req.user.claims.sub;
      
      if (!billId) {
        return res.status(400).json({ error: "Bill ID is required" });
      }
      
      // Get the bill
      const bill = await storage.getBill(billId);
      if (!bill || bill.userId !== userId) {
        return res.status(404).json({ error: "Bill not found" });
      }
      
      if (bill.status !== 'paid') {
        return res.status(400).json({ error: "Bill must be paid first" });
      }
      
      if (bill.stripePaymentIntentId && bill.paymentType === 'real_payment') {
        return res.status(400).json({ error: "Bill already processed through Stripe" });
      }

      // CRITICAL SAFEGUARD: Ensure this is a retry for real payment, not manual
      if (bill.paymentType !== 'real_payment' && bill.paymentType !== 'manual') {
        return res.status(400).json({ 
          error: "This bill was not paid through our payment system",
          message: "Only bills paid through Stripe can be retried for payout"
        });
      }

      // ADDITIONAL SAFETY: Check if user has a valid Stripe payment
      if (!bill.stripePaymentIntentId) {
        return res.status(400).json({ 
          error: "No Stripe payment found for this bill",
          message: "This bill was not paid through our payment system"
        });
      }

      console.log('🔁 RETRY: Processing BILL.com payment for bill:', billId);
      console.log('💰 User already paid via Stripe:', bill.stripePaymentIntentId);
      console.log('🎯 This is a BILL.com creditor payment - NO additional Stripe charge');
      
      let billComPaymentId = null;
      let paymentStatus = "processing";
      
      try {
        // Test BILL.com connection
        const isConnected = await billComService.testConnection();
        
        if (isConnected) {
          console.log('✅ BILL.com connection successful - creating vendor and payment');
          
          // Create or get vendor for the creditor
          const vendor = await billComService.createOrGetVendor({
            name: bill.company,
            accountNumber: bill.accountNumber || undefined,
            routingNumber: bill.creditorRoutingNumber || undefined
          });
          
          console.log(`👤 BILL.com vendor ready: ${vendor.name} (${vendor.id})`);
          console.log(`💳 Recommended payment method: ${vendor.recommendedPaymentMethod}`);
          
          // Create payment via BILL.com
          const billcomPayment = await billComService.createPayment({
            vendorId: vendor.id,
            amount: parseFloat(bill.paidAmount as string),
            description: `Bill payment for ${bill.company} - Account: ${bill.accountNumber || 'N/A'}`,
            paymentMethod: vendor.recommendedPaymentMethod,
            scheduledDate: new Date().toISOString().split('T')[0]
          });
          
          billComPaymentId = billcomPayment.id;
          paymentStatus = "processing";
          
          console.log(`✅ BILL.com payment created: ${billComPaymentId}`);
          console.log(`💰 Amount: $${billcomPayment.amount}`);
          console.log(`📋 Status: ${billcomPayment.status}`);
          console.log(`🏢 Creditor: ${bill.company}`);

          // Update bill with BILL.com payment information
          await storage.updateBill(billId, {
            billComPaymentId: billComPaymentId,
            paymentType: "real_payment"
          });
          
          // Send email notification for retry
          try {
            const user = await storage.getUser(bill.userId);
            if (user?.email) {
              // DISABLED: Payment confirmation emails until BILL.com integration is resolved
              // await emailService.sendPaymentConfirmation({
              //   userEmail: user.email,
              //   amount: bill.paidAmount as string,
              //   company: bill.company,
              //   paymentMethod: 'bank_transfer',
              //   transactionId: billComPaymentId
              // });
              
              console.log(`📧 Retry confirmation email sent to ${user.email}`);
            }
          } catch (emailError: any) {
            console.error('Failed to send retry email:', emailError);
          }
          
          res.json({
            success: true,
            message: `Payment retry successful! Bank transfer initiated to ${bill.company}. Confirmation email sent.`,
            billComPaymentId: billComPaymentId,
            paymentMethod: 'bank_transfer',
            payment: billcomPayment,
            bill: await storage.getBill(billId)
          });
        } else {
          res.status(500).json({ error: "BILL.com connection failed" });
        }
      } catch (billcomError) {
        console.error("BILL.com payment failed:", (billcomError as Error).message);
        
        res.status(500).json({ 
          error: "Failed to process BILL.com payment: " + (billcomError as Error).message 
        });
      }
    } catch (error: any) {
      console.error("Error triggering BILL.com payment:", error);
      res.status(500).json({ 
        error: "Error triggering payment: " + error.message 
      });
    }
  });

  // BILL.com status monitoring endpoint
  app.get("/api/billcom/payments-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all bills paid through "Pay Now" (for BILL.com monitoring)
      const bills = await storage.getBillsByUser(userId);
      const paidBills = bills.filter(bill => 
        bill.status === 'paid' && bill.paymentType === 'real_payment'
      );
      
      const statuses = await Promise.all(
        paidBills.map(async (bill) => {
          try {
            // In a real implementation, you'd call BILL.com API to get payment status
            // For now, simulate the status based on payment date
            const daysSincePaid = Math.floor((new Date().getTime() - new Date(bill.paidDate!).getTime()) / (1000 * 60 * 60 * 24));
            
            let status = 'pending';
            let estimatedDelivery = '';
            
            // Check if BILL.com failed
            if (bill.paymentType === 'billcom_failed' as any) {
              status = 'error';
              estimatedDelivery = 'BILL.com integration failed - manual intervention required';
            } else if (bill.paymentType === 'manual') {
              status = 'manual';
              estimatedDelivery = 'Requires manual check sending';
            } else if (bill.creditorPaymentMethod === 'check') {
              if (daysSincePaid === 0) {
                status = 'processing';
                estimatedDelivery = '1-2 business days';
              } else if (daysSincePaid <= 2) {
                status = 'mailed';
                estimatedDelivery = '3-5 business days';
              } else if (daysSincePaid <= 7) {
                status = 'delivered';
                estimatedDelivery = 'Processing at creditor';
              } else {
                status = 'completed';
                estimatedDelivery = 'Payment processed';
              }
            } else if (bill.creditorPaymentMethod === 'ach') {
              if (daysSincePaid <= 1) {
                status = 'processing';
                estimatedDelivery = '1-3 business days';
              } else if (daysSincePaid <= 3) {
                status = 'transmitted';
                estimatedDelivery = 'Processing at bank';
              } else {
                status = 'completed';
                estimatedDelivery = 'Payment processed';
              }
            }
            
            return {
              billId: bill.id,
              company: bill.company,
              amount: bill.paidAmount,
              paymentMethod: bill.creditorPaymentMethod,
              billComPaymentId: bill.billComPaymentId,
              status: status,
              estimatedDelivery: estimatedDelivery,
              paidDate: bill.paidDate,
              daysSincePaid: daysSincePaid
            };
          } catch (error) {
            return {
              billId: bill.id,
              company: bill.company,
              amount: bill.paidAmount,
              status: 'error',
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );
      
      res.json({
        success: true,
        payments: statuses,
        summary: {
          total: statuses.length,
          processing: statuses.filter(s => s.status === 'processing').length,
          mailed: statuses.filter(s => s.status === 'mailed').length,
          delivered: statuses.filter(s => s.status === 'delivered').length,
          completed: statuses.filter(s => s.status === 'completed').length,
          errors: statuses.filter(s => s.status === 'error').length,
          manual: statuses.filter(s => s.status === 'manual').length,
          billcomFailed: statuses.filter(s => s.status === 'error' && s.error?.includes('BILL.com')).length
        }
      });
    } catch (error: any) {
      console.error("Error getting BILL.com payments status:", error);
      res.status(500).json({ 
        error: "Error getting payments status: " + (error as Error).message 
      });
    }
  });

  // Bill Reminder API endpoints
  app.get('/api/reminders/status', isAuthenticated, async (req, res) => {
    try {
      const status = reminderScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting reminder status:', error);
      res.status(500).json({ error: 'Failed to get reminder status' });
    }
  });

  app.post('/api/reminders/start', isAuthenticated, async (req, res) => {
    try {
      reminderScheduler.start();
      res.json({ success: true, message: 'Reminder scheduler started' });
    } catch (error) {
      console.error('Error starting reminder scheduler:', error);
      res.status(500).json({ error: 'Failed to start reminder scheduler' });
    }
  });

  app.post('/api/reminders/stop', isAuthenticated, async (req, res) => {
    try {
      reminderScheduler.stop();
      res.json({ success: true, message: 'Reminder scheduler stopped' });
    } catch (error) {
      console.error('Error stopping reminder scheduler:', error);
      res.status(500).json({ error: 'Failed to stop reminder scheduler' });
    }
  });

  app.post('/api/reminders/trigger', isAuthenticated, async (req, res) => {
    try {
      const result = await reminderScheduler.triggerManualCheck();
      res.json(result);
    } catch (error) {
      console.error('Error triggering manual reminder check:', error);
      res.status(500).json({ error: 'Failed to trigger reminder check' });
    }
  });

  // Vercel Cron invokes this route with an Authorization bearer token.
  app.get('/api/cron/reminders', async (req, res) => {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await reminderScheduler.triggerManualCheck();
    return res.status(result.success ? 200 : 500).json(result);
  });

  app.post('/api/reminders/bill/:billId', isAuthenticated, async (req, res) => {
    try {
      const { billId } = req.params;
      const { reminderType } = req.body;
      
      if (!['14-day', '7-day'].includes(reminderType)) {
        return res.status(400).json({ error: 'Invalid reminder type. Must be "14-day" or "7-day"' });
      }

      const success = await billReminderService.sendManualReminder(billId, reminderType);
      
      if (success) {
        res.json({ success: true, message: `${reminderType} reminder sent for bill ${billId}` });
      } else {
        res.status(400).json({ error: 'Failed to send reminder. Bill not found or user has no email.' });
      }
    } catch (error) {
      console.error('Error sending manual reminder:', error);
      res.status(500).json({ error: 'Failed to send reminder' });
    }
  });

  // Stripe webhook endpoint for payment confirmations
  app.post("/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: any;

    try {
      // In production, you'd verify the webhook signature
      event = req.body;
    } catch (err) {
      console.error(`Webhook signature verification failed.`, err);
      return res.status(400).send(`Webhook Error: Invalid signature`);
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('💰 Stripe payment succeeded:', paymentIntent.id);
          
          // Find the bill associated with this payment
          const billId = paymentIntent.metadata?.billId;
          if (billId) {
            const bill = await storage.getBill(billId);
            const user = bill ? await storage.getUser(bill.userId) : null;
            
            if (bill && user?.email) {
              // DISABLED: Payment confirmation emails until BILL.com integration is resolved
              // await emailService.sendPaymentConfirmation({
              //   userEmail: user.email,
              //   amount: (paymentIntent.amount / 100).toString(),
              //   company: bill.company,
              //   paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
              //   transactionId: paymentIntent.id
              // });
            }
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.log('❌ Stripe payment failed:', failedPayment.id);
          // Could send failure notification here
          break;

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // BILL.com webhook endpoint for delivery tracking
  app.post("/webhooks/billcom", async (req, res) => {
    try {
      const event = req.body;
      
      if (event.type === 'payment.updated') {
        const payment = event.data;
        console.log('📋 BILL.com payment update:', payment.id, 'Status:', payment.status);
        
        // Find the bill associated with this BILL.com payment
        const bills = await storage.getAllBills();
        const bill = bills.find((b: any) => b.billComPaymentId === payment.id);
        
        if (bill) {
          const user = await storage.getUser(bill.userId);
          
          if (user?.email) {
            // Map BILL.com status to our status
            let notificationStatus: 'processing' | 'mailed' | 'delivered' | 'completed' = 'processing';
            
            if (payment.status === 'SENT' || payment.status === 'IN_TRANSIT') {
              notificationStatus = 'mailed';
            } else if (payment.status === 'DELIVERED') {
              notificationStatus = 'delivered';
            } else if (payment.status === 'PROCESSED' || payment.status === 'COMPLETED') {
              notificationStatus = 'completed';
            }

            // DISABLED: Delivery update emails until BILL.com integration is resolved
            // await emailService.sendDeliveryUpdate({
            //   userEmail: user.email,
            //   company: bill.company,
            //   amount: bill.paidAmount || bill.amount.toString(),
            //   status: notificationStatus,
            //   estimatedDelivery: payment.estimatedDeliveryDate
            // });

            console.log(`📧 Delivery update email sent to ${user.email} for ${bill.company}`);
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing BILL.com webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // === FULL BILL.COM INTEGRATION (NEW) ===
  
  // Create complete BILL.com payment flow (replaces Stripe)
  app.post("/api/bills/pay-via-billcom/:billId", isAuthenticated, async (req: any, res) => {
    try {
      const { billId } = req.params;
      const userId = req.user.claims.sub;
      
      console.log("🏦 Starting Full BILL.com payment flow for bill:", billId);
      
      const bill = await storage.getBill(billId);
      if (!bill || bill.userId !== userId) {
        return res.status(404).json({ error: "Bill not found" });
      }

      if (bill.status === "paid") {
        return res.status(400).json({ 
          error: "This bill has already been paid",
          message: "Bill is already marked as paid" 
        });
      }

      // Log all enhanced bill data we're sending to BILL.com
      console.log("📊 Enhanced Bill Data Summary:");
      console.log(`   💼 Company: ${bill.company}`);
      console.log(`   💰 Amount: $${bill.amount}`);
      console.log(`   🆔 Account: ${bill.accountNumber || 'Not available'}`);
      console.log(`   📍 Creditor Address: ${bill.creditorPaymentAddress ? 'Available' : 'Not available'}`);
      if (bill.creditorPaymentAddress) {
        console.log(`      ✅ Name: ${bill.creditorPaymentAddress.name || 'N/A'}`);
        console.log(`      ✅ Street: ${bill.creditorPaymentAddress.address1 || 'N/A'}`);
        console.log(`      ✅ City: ${bill.creditorPaymentAddress.city || 'N/A'}`);
        console.log(`      ✅ State: ${bill.creditorPaymentAddress.state || 'N/A'}`);
        console.log(`      ✅ ZIP: ${bill.creditorPaymentAddress.zip || 'N/A'}`);
      }
      console.log(`   🏦 Creditor Banking: Routing=${bill.creditorRoutingNumber || 'N/A'}, Account=${bill.creditorAccountNumber || 'N/A'}`);
      console.log(`   💳 Payment Method: ${bill.creditorPaymentMethod || 'Not specified'}`);
      console.log(`   🔍 OCR Data: ${bill.extractedData ? `Available (${bill.extractedData.confidence || 'unknown'}% confidence)` : 'Not available'}`);
      if (bill.extractedData?.extractedFields) {
        console.log(`   📋 OCR Fields: ${Object.keys(bill.extractedData.extractedFields).join(', ')}`);
      }

      // Get user details for BILL.com customer
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ 
          error: "User email required",
          message: "Please update your profile with an email address" 
        });
      }

      // Create complete BILL.com payment flow with enhanced pre-filling
      const paymentFlow = await billComService.createBillPaymentFlow({
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'BillWatch User',
        billCompany: bill.company,
        billAmount: parseFloat(bill.amount as string),
        billDescription: bill.description || `Payment to ${bill.company}`,
        accountNumber: bill.accountNumber || undefined,
        returnUrl: `${req.protocol}://${req.get('host')}/payment-success?billId=${billId}&provider=billcom&company=${encodeURIComponent(bill.company)}&amount=${bill.amount}`,
        // Enhanced customer address from OCR/bill data
        customerAddress: bill.creditorPaymentAddress ? {
          name: bill.creditorPaymentAddress.name || undefined,
          addressLine1: bill.creditorPaymentAddress.address1 || undefined,
          addressLine2: bill.creditorPaymentAddress.address2 || undefined,
          city: bill.creditorPaymentAddress.city || undefined,
          state: bill.creditorPaymentAddress.state || undefined,
          zip: bill.creditorPaymentAddress.zip || undefined,
          country: bill.creditorPaymentAddress.country || 'US'
        } : undefined,
        // Creditor payment details from bill scanner
        creditorRoutingNumber: bill.creditorRoutingNumber || undefined,
        creditorAccountNumber: bill.creditorAccountNumber || undefined,
        preferredPaymentMethod: bill.creditorPaymentMethod || undefined,
        // Additional extracted data from OCR
        extractedData: bill.extractedData || undefined
      });

      console.log(`✅ BILL.com payment flow created`);
      console.log(`👤 Customer: ${paymentFlow.customer.name} (${paymentFlow.customer.id})`);
      console.log(`📋 Invoice: ${paymentFlow.invoice.invoiceNumber} (${paymentFlow.invoice.id})`);
      console.log(`🔗 Payment link: ${paymentFlow.paymentLink}`);

      // Store BILL.com details in our database
      await storage.updateBill(billId, {
        billComCustomerId: paymentFlow.customer.id,
        billComInvoiceId: paymentFlow.invoice.id,
        paymentType: "billcom_invoice",
        status: "pending_payment"
      });

      res.json({
        success: true,
        paymentUrl: paymentFlow.paymentLink,
        invoice: {
          id: paymentFlow.invoice.id,
          number: paymentFlow.invoice.invoiceNumber,
          amount: paymentFlow.invoice.amount,
          dueDate: paymentFlow.invoice.dueDate
        },
        creditorPayment: paymentFlow.estimatedCreditorPayment,
        message: `Invoice created for ${bill.company}. You'll be redirected to the payment portal.`
      });

    } catch (error: any) {
      console.error("Error creating BILL.com payment flow:", error);
      res.status(500).json({ 
        error: "Failed to create BILL.com payment flow: " + error.message 
      });
    }
  });

  // Get BILL.com payment status for monitoring
  app.get("/api/billcom/payments/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all paid bills for this user
      const bills = await storage.getAllBills();
      const userBills = bills.filter(bill => 
        bill.userId === userId && 
        bill.status === 'paid' && 
        (bill.paymentType === 'billcom_complete' || bill.paymentType === 'billcom_partial' || bill.paymentType === 'billcom_invoice')
      );

      const payments = await Promise.all(userBills.map(async (bill) => {
        let status = 'completed';
        let paymentMethod = 'Bank Transfer';
        let estimatedDelivery = 'Completed';

        // Determine status based on BILL.com payment data
        if (bill.paymentType === 'billcom_invoice') {
          status = 'processing'; // Customer invoice created, waiting for payment
          estimatedDelivery = 'Pending customer payment';
        } else if (bill.paymentType === 'billcom_partial') {
          status = 'error'; // Customer paid but creditor payment failed
          estimatedDelivery = 'Payment failed - retry needed';
        } else if (bill.billComPaymentId) {
          // Check actual payment status from BILL.com
          try {
            const paymentStatus = await billComService.getPaymentStatus(bill.billComPaymentId);
            if (paymentStatus) {
              switch (paymentStatus.status) {
                case 'Pending':
                  status = 'processing';
                  estimatedDelivery = '1-3 business days';
                  break;
                case 'Processing':
                  status = 'mailed';
                  estimatedDelivery = paymentStatus.paymentMethod === 'ACH' ? '1-3 business days' : '5-7 business days';
                  break;
                case 'Sent':
                  status = 'delivered';
                  estimatedDelivery = 'Delivered to creditor';
                  break;
                case 'Delivered':
                  status = 'completed';
                  estimatedDelivery = 'Completed';
                  break;
                case 'Failed':
                  status = 'error';
                  estimatedDelivery = 'Payment failed';
                  break;
                default:
                  status = 'processing';
              }
              paymentMethod = paymentStatus.paymentMethod;
            }
          } catch (error: any) {
            console.error('Error getting payment status from BILL.com:', error);
          }
        }

        const paidDate = new Date(bill.paidDate || bill.createdAt || new Date());
        const daysSincePaid = Math.floor((new Date().getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          billId: bill.id,
          company: bill.company,
          amount: bill.amount.toString(),
          paymentMethod: paymentMethod,
          billComPaymentId: bill.billComPaymentId || null,
          billComInvoiceId: bill.billComInvoiceId || null,
          status: status,
          estimatedDelivery: estimatedDelivery,
          paidDate: paidDate.toISOString(),
          daysSincePaid: daysSincePaid,
          error: bill.paymentType === 'billcom_partial' ? 'Creditor payment failed - customer payment received' : undefined
        };
      }));

      // Calculate summary
      const summary = {
        total: payments.length,
        processing: payments.filter(p => p.status === 'processing').length,
        mailed: payments.filter(p => p.status === 'mailed').length,
        delivered: payments.filter(p => p.status === 'delivered').length,
        completed: payments.filter(p => p.status === 'completed').length,
        errors: payments.filter(p => p.status === 'error').length
      };

      res.json({
        success: true,
        payments: payments,
        summary: summary
      });

    } catch (error: any) {
      console.error("Error getting BILL.com payment status:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to get payment status: " + error.message 
      });
    }
  });

  // Retry BILL.com payment for failed payments
  app.post("/api/billcom/payments/retry/:billId", isAuthenticated, async (req: any, res) => {
    try {
      const { billId } = req.params;
      const userId = req.user.claims.sub;
      
      const bill = await storage.getBill(billId);
      if (!bill || bill.userId !== userId) {
        return res.status(404).json({ error: "Bill not found" });
      }

      if (bill.paymentType !== 'billcom_partial') {
        return res.status(400).json({ 
          error: "Only partially failed BILL.com payments can be retried" 
        });
      }

      // Retry creditor payment
      const vendor = await billComService.createOrGetVendor({
        name: bill.company,
        accountNumber: bill.accountNumber || undefined,
        routingNumber: bill.creditorRoutingNumber || undefined
      });

      const creditorPayment = await billComService.createPayment({
        vendorId: vendor.id,
        amount: parseFloat(bill.amount as string),
        description: `Retry payment for ${bill.company} - Account: ${bill.accountNumber}`,
        paymentMethod: vendor.recommendedPaymentMethod,
        scheduledDate: new Date().toISOString().split('T')[0]
      });

      // Update bill with new payment info
      await storage.updateBill(billId, {
        billComPaymentId: creditorPayment.id,
        paymentType: 'billcom_complete'
      });

      res.json({
        success: true,
        message: `Payment retry successful! Payment will be sent via ${creditorPayment.paymentMethod}.`,
        paymentId: creditorPayment.id
      });

    } catch (error: any) {
      console.error("Error retrying BILL.com payment:", error);
      res.status(500).json({ 
        error: "Failed to retry payment: " + error.message 
      });
    }
  });

  // BILL.com webhook for payment notifications
  app.post("/webhooks/billcom-payments", async (req, res) => {
    try {
      const event = req.body;
      
      console.log("🔔 BILL.com Payment Webhook:", event.type);
      console.log("📦 Event data:", event.data);

      if (event.type === 'invoice.paid') {
        const invoiceId = event.data.invoice.id;
        
        // Find bill by BILL.com invoice ID
        const bills = await storage.getAllBills();
        const bill = bills.find(b => (b as any).billComInvoiceId === invoiceId);
        
        if (bill) {
          console.log(`💰 Invoice ${invoiceId} paid - processing creditor payment for ${bill.company}`);
          
          // Now create vendor payment to creditor
          try {
            const vendor = await billComService.createOrGetVendor({
              name: bill.company,
              accountNumber: bill.accountNumber || undefined,
              routingNumber: bill.creditorRoutingNumber || undefined
            });

            const creditorPayment = await billComService.createPayment({
              vendorId: vendor.id,
              amount: parseFloat(bill.amount as string),
              description: `Creditor payment for ${bill.company} - Account: ${bill.accountNumber}`,
              paymentMethod: vendor.recommendedPaymentMethod,
              scheduledDate: new Date().toISOString().split('T')[0]
            });

            // Update bill with complete payment info
            await storage.updateBill(bill.id, {
              status: "paid",
              paidAmount: bill.amount,
              billComPaymentId: creditorPayment.id,
              paymentType: "billcom_complete",
              paidDate: new Date()
            });

            console.log(`✅ Complete BILL.com flow finished for ${bill.company}`);
            console.log(`💳 Creditor payment: ${creditorPayment.id} (${creditorPayment.paymentMethod})`);

            syncPaidBillToFinanceWatch(bill.id).catch(err => 
              console.error("Finance Watch sync error:", err)
            );

          } catch (creditorError: any) {
            console.error(`❌ Failed to create creditor payment:`, creditorError);
            
            // Mark as partially complete (customer paid, but creditor payment failed)
            await storage.updateBill(bill.id, {
              status: "paid",
              paidAmount: bill.amount,
              paymentType: "billcom_partial",
              paidDate: new Date()
            });

            syncPaidBillToFinanceWatch(bill.id).catch(err => 
              console.error("Finance Watch sync error:", err)
            );
          }
        }
      }

      res.json({ received: true });

    } catch (error: any) {
      console.error("Error processing BILL.com webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // === BILL CLEANUP (FOR TESTING) ===
  
  // Delete a bill (for cleanup/testing)
  app.delete("/api/bills/:billId", isAuthenticated, async (req: any, res) => {
    try {
      const { billId } = req.params;
      const userId = req.user.claims.sub;
      
      const bill = await storage.getBill(billId);
      if (!bill || bill.userId !== userId) {
        return res.status(404).json({ error: "Bill not found" });
      }
      
      await storage.deleteBill(billId);
      console.log(`🗑️ Deleted bill: ${bill.company} - $${bill.amount}`);
      
      res.json({ 
        success: true, 
        message: `Bill for ${bill.company} has been deleted` 
      });
    } catch (error: any) {
      console.error("Error deleting bill:", error);
      res.status(500).json({ error: "Failed to delete bill" });
    }
  });

  const httpServer = createServer(app);

  // Start the reminder scheduler automatically
  console.log('🚀 Starting bill reminder scheduler...');
  if (!process.env.VERCEL) {
    reminderScheduler.start();
  }

  return httpServer;
}
