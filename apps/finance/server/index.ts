import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Set timezone to Mountain Time (America/Denver)
process.env.TZ = 'America/Denver';

const app = express();
app.set('etag', false);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register content routes BEFORE registering other routes and Vite middleware
  // This ensures they're not intercepted by Vite's catch-all middleware
  const path = await import("path");
  const fs = await import("fs");
  
  app.get('/api/content/*', (req, res) => {
    console.log(`[MDX] Content route hit: ${req.path}`);
    
    // Extract the relative path after /api/content/
    const reqRel = req.path.replace(/^\/api\/content\//, '');
    const fullPath = path.join(process.cwd(), 'content', reqRel);
    
    console.log(`[MDX] Resolved path: ${fullPath}`);
    
    // Normalize the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(fullPath);
    
    // Security check - ensure path is within content directory
    const contentDir = path.join(process.cwd(), 'content');
    const normalizedContentDir = path.normalize(contentDir);
    if (!normalizedPath.startsWith(normalizedContentDir)) {
      console.log(`[MDX] Access denied for path: ${normalizedPath}`);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.log(`[MDX] File not found: ${normalizedPath}`);
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Read and serve the file
    try {
      const content = fs.readFileSync(normalizedPath, 'utf-8');
      console.log(`[MDX] Successfully serving: ${normalizedPath}`);
      res.set('Content-Type', 'text/plain');
      res.send(content);
    } catch (error) {
      console.error('Error reading MDX file:', error);
      res.status(500).json({ message: 'Error reading file' });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
