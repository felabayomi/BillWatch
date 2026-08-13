import { db } from "../db.js";
import { bills } from "../../shared/schema.js";
import { eq, and, ne, sql } from "drizzle-orm";

export interface CategoryAggregation {
  category: string;
  totalAmount: number;
  billCount: number;
  averageAmount: number;
  lastPaymentDate: Date | null;
}

export interface CategoryStats {
  categories: CategoryAggregation[];
  totalSpending: number;
  mostExpensiveCategory: string;
  mostFrequentCategory: string;
  uncategorizedAmount: number;
}

export class CategoryService {
  /**
   * Get bill aggregation by category for a user
   */
  async getCategoryAggregation(userId: string, includeArchived: boolean = false): Promise<CategoryStats> {
    // Base query conditions
    const conditions = includeArchived 
      ? [eq(bills.userId, userId)]
      : [eq(bills.userId, userId), ne(bills.status, "archived")];

    // Get aggregated data by category
    const categoryData = await db
      .select({
        category: bills.category,
        totalAmount: sql<number>`sum(${bills.amount}::numeric)`,
        billCount: sql<number>`count(*)`,
        averageAmount: sql<number>`avg(${bills.amount}::numeric)`,
        lastPaymentDate: sql<Date>`max(${bills.paidDate})`
      })
      .from(bills)
      .where(and(...conditions))
      .groupBy(bills.category)
      .orderBy(sql`sum(${bills.amount}::numeric) desc`);

    // Process the results
    const categories: CategoryAggregation[] = categoryData.map(row => ({
      category: row.category || "Uncategorized",
      totalAmount: Number(row.totalAmount) || 0,
      billCount: Number(row.billCount) || 0,
      averageAmount: Number(row.averageAmount) || 0,
      lastPaymentDate: row.lastPaymentDate || null
    }));

    // Calculate summary statistics
    const totalSpending = categories.reduce((sum, cat) => sum + cat.totalAmount, 0);
    
    const mostExpensiveCategory = categories.length > 0 
      ? categories[0].category 
      : "None";
    
    const mostFrequentCategory = categories.length > 0
      ? categories.reduce((max, cat) => cat.billCount > max.billCount ? cat : max, categories[0]).category
      : "None";

    const uncategorizedAmount = categories.find(cat => cat.category === "Uncategorized")?.totalAmount || 0;

    return {
      categories,
      totalSpending,
      mostExpensiveCategory,
      mostFrequentCategory,
      uncategorizedAmount
    };
  }

  /**
   * Get predefined category suggestions
   */
  getPredefinedCategories(): string[] {
    return [
      "Utilities",
      "Internet",
      "Phone",
      "Gas",
      "Electricity", 
      "Water",
      "Credit Card",
      "Collections",
      "Shopping",
      "Groceries",
      "Insurance",
      "Rent/Mortgage",
      "Streaming Services",
      "Subscription",
      "Medical",
      "Education",
      "Transportation",
      "Dining",
      "Entertainment",
      "Other"
    ];
  }

  /**
   * Update bill category
   */
  async updateBillCategory(billId: string, category: string): Promise<boolean> {
    try {
      await db
        .update(bills)
        .set({ 
          category: category || null,
          updatedAt: new Date()
        })
        .where(eq(bills.id, billId));
      return true;
    } catch (error) {
      console.error("Error updating bill category:", error);
      return false;
    }
  }

  /**
   * Get bills by category for detailed view
   */
  async getBillsByCategory(userId: string, category: string, includeArchived: boolean = false) {
    const conditions = includeArchived 
      ? [eq(bills.userId, userId), eq(bills.category, category)]
      : [eq(bills.userId, userId), eq(bills.category, category), ne(bills.status, "archived")];

    return await db
      .select()
      .from(bills)
      .where(and(...conditions))
      .orderBy(bills.dueDate);
  }

  /**
   * Get monthly spending trends by category
   */
  async getMonthlyCategoryTrends(userId: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trends = await db
      .select({
        category: bills.category,
        month: sql<string>`to_char(${bills.dueDate}, 'YYYY-MM')`,
        totalAmount: sql<number>`sum(${bills.amount}::numeric)`,
        billCount: sql<number>`count(*)`
      })
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          sql`${bills.dueDate} >= ${startDate}`,
          ne(bills.status, "archived")
        )
      )
      .groupBy(bills.category, sql`to_char(${bills.dueDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${bills.dueDate}, 'YYYY-MM') desc`);

    return trends.map(row => ({
      category: row.category || "Uncategorized",
      month: row.month,
      totalAmount: Number(row.totalAmount) || 0,
      billCount: Number(row.billCount) || 0
    }));
  }
}

export const categoryService = new CategoryService();
