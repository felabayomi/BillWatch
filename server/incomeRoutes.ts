import { Router } from "express";
import { registerIncomeRoutes } from "../apps/income/server/routes.js";

export async function createIncomeRouter() {
  const router = Router();

  await registerIncomeRoutes(router);

  return router;
}
