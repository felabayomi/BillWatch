import { Router } from "express";
import { registerExpenseRoutes } from "../apps/expense/server/routes.js";

export async function createExpenseRouter() {
  const router = Router();

  await registerExpenseRoutes(router);

  return router;
}
