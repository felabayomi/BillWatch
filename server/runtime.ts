import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}`);
  }

  app.use(express.static(distPath, { index: false }));

  app.get(/^(?!\/api\/).*$/, (req, res, next) => {
    const hasFileExtension = /\.[a-z0-9]+$/i.test(req.path);
    if (hasFileExtension) {
      return res.status(404).send(`Not found: ${req.path}`);
    }
    return res.sendFile(path.resolve(distPath, "index.html"));
  });

  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).send("API endpoint not found");
    }
    if (/\.[a-z0-9]+$/i.test(req.path)) {
      return res.status(404).send(`Not found: ${req.path}`);
    }
    return res.sendFile(path.resolve(distPath, "index.html"));
  });
}
