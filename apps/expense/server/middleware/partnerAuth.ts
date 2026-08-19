/**
 * Partner API Authentication Middleware
 * 
 * Validates API key for partner endpoints (e.g., Revolut integration)
 */

import { Request, Response, NextFunction } from "express";

// Partner API key from environment
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || "revolut_demo_key_12345";

/**
 * Middleware to authenticate partner API requests via API key
 */
export function partnerAuthMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Extract API key from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key required. Use: Authorization: Bearer {API_KEY}"
    });
  }

  // Expected format: "Bearer {api_key}"
  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid authorization format. Use: Authorization: Bearer {API_KEY}"
    });
  }

  // Validate API key
  if (token !== PARTNER_API_KEY) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key"
    });
  }

  // API key valid, continue
  next();
}

/**
 * Optional: Basic Auth middleware for demo access control
 */
export function basicAuthMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  const auth = { login: "revolut", password: "demo-access" };
  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64").toString().split(":");
  
  if (login === auth.login && password === auth.password) {
    return next();
  }
  
  res.set("WWW-Authenticate", 'Basic realm="Demo Access"');
  res.status(401).send("Authentication required");
}
