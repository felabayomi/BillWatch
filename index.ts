// Vercel's Express framework detector requires the deployment entrypoint to
// import Express directly, even though the configured application lives in
// server/app.ts and is shared with the local server.
import express from "express";
import app from "./server/app";

void express;

export default app;
