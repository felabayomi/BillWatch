import { Router } from "express";
import { registerFinanceRoutes } from "../apps/finance/server/routes.js";

export async function createFinanceRouter() {
  const router = Router();

  await registerFinanceRoutes(router);

  return router;
}