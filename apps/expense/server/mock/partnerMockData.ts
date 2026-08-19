/**
 * Mock data for Partner API demo mode
 * 
 * When DEMO_MODE=true, these responses are returned instantly
 * without calling actual OCR or AI services (saves costs for demos)
 */

export const mockPartnerData = {
  scanReceipt: {
    raw_text: `WHOLE FOODS MARKET
123 Main Street, Denver CO 80202
Tel: (303) 555-0123

Date: Oct 15, 2025
Time: 14:32

Organic Bananas        $3.99
Almond Milk            $4.49
Greek Yogurt           $5.99
Chicken Breast         $12.99
Broccoli               $2.99
Total:                $30.45

Payment: Visa ****1234
Thank you for shopping!`,
    confidence: 0.94,
    status: "success",
    timestamp: new Date().toISOString()
  },

  parseExpense: {
    amount: 30.45,
    merchant: "Whole Foods Market",
    date: "2025-10-15",
    category: "groceries",
    subcategory: "food & essentials",
    location: "Denver, CO",
    confidence: 0.92,
    currency: "USD",
    status: "success",
    timestamp: new Date().toISOString()
  },

  categorize: {
    category: "groceries",
    subcategory: "food & essentials",
    confidence: 0.89,
    status: "success",
    timestamp: new Date().toISOString()
  },

  scanAndParse: {
    raw_text: `STARBUCKS
456 Market St, Denver CO 80202

Date: Oct 15, 2025  
Time: 08:15 AM

Grande Latte           $5.45
Blueberry Muffin       $3.95
Subtotal:              $9.40
Tax:                   $0.82
Total:                $10.22

Card: ****5678`,
    ocr_confidence: 0.91,
    parsed_expense: {
      amount: 10.22,
      merchant: "Starbucks",
      date: "2025-10-15",
      category: "dining-out",
      subcategory: "coffee & cafes",
      location: "Denver, CO",
      currency: "USD"
    },
    ai_confidence: 0.88,
    status: "success",
    timestamp: new Date().toISOString()
  }
};

// Additional mock data sets for variety
export const mockReceiptExamples = [
  {
    merchant: "Target",
    category: "shopping",
    amount: 47.82
  },
  {
    merchant: "Shell Gas Station",
    category: "transportation",
    amount: 52.00
  },
  {
    merchant: "CVS Pharmacy",
    category: "health",
    amount: 23.50
  },
  {
    merchant: "AMC Theatres",
    category: "entertainment",
    amount: 28.00
  },
  {
    merchant: "Uber",
    category: "transportation",
    amount: 18.75
  }
];
