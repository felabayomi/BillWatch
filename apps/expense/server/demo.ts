/**
 * Revolut Demo API Server
 * 
 * Completely separate from the main ExpenseWatch application.
 * This server provides partner API endpoints for Revolut integration pilot.
 * 
 * Run with: tsx server/demo.ts
 */

import express from "express";
import { partnerApiRouter } from "./partnerRoutes";

const app = express();
const PORT = process.env.DEMO_PORT || 5001;

// Demo mode flag
export const DEMO_MODE = process.env.DEMO_MODE === "true";

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "ExpenseWatch Partner API",
    mode: DEMO_MODE ? "demo" : "live",
    version: "1.0.0"
  });
});

// Partner API routes
app.use("/api/partner", partnerApiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    message: "Invalid API endpoint. See documentation for available routes."
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Demo API Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: DEMO_MODE ? err.message : "An error occurred processing your request"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   ExpenseWatch Partner API (Revolut Demo)     ║
║                                                ║
║   Mode: ${DEMO_MODE ? 'DEMO (Mock Data)' : 'LIVE'}                         ║
║   Port: ${PORT}                                    ║
║   Status: Running                              ║
╚════════════════════════════════════════════════╝

Available Endpoints:
- POST /api/partner/scan-receipt
- POST /api/partner/parse-expense  
- POST /api/partner/categorize

API Key Required: Authorization: Bearer {PARTNER_API_KEY}
  `);
});

export default app;
