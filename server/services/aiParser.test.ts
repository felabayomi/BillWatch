import test from "node:test";
import assert from "node:assert/strict";

import { AIParserService } from "./aiParser.ts";

const sampleExpediaText = `
Expedia $82.59 1 of 3 due Wed, Sep 16
Expedia $100.12 2 of 6 due Tue, Sep 29
Expedia $82.59 2 of 3 due Fri, Oct 16
Expedia $100.12 3 of 6 due Thu, Oct 29
`;

test("detects multiple Expedia installment bills from one image", async () => {
  const parser = new AIParserService();
  const result = await parser.parseBillInformation(sampleExpediaText);

  assert.equal(result.bills.length, 4, "expected four distinct installment bill candidates");
  assert.deepEqual(
    result.bills.map((bill) => ({
      company: bill.company,
      amount: bill.amount,
      installmentNumber: bill.installments?.[0]?.installmentNumber ?? null,
      totalInstallments: bill.totalInstallments,
      isRecurring: bill.isRecurring,
      dueMonth: bill.dueDate ? bill.dueDate.toLocaleString("en-US", { month: "short" }) : null,
      dueDay: bill.dueDate ? bill.dueDate.getDate() : null,
    })),
    [
      { company: "Expedia", amount: "82.59", installmentNumber: 1, totalInstallments: 3, isRecurring: true, dueMonth: "Sep", dueDay: 16 },
      { company: "Expedia", amount: "100.12", installmentNumber: 2, totalInstallments: 6, isRecurring: true, dueMonth: "Sep", dueDay: 29 },
      { company: "Expedia", amount: "82.59", installmentNumber: 2, totalInstallments: 3, isRecurring: true, dueMonth: "Oct", dueDay: 16 },
      { company: "Expedia", amount: "100.12", installmentNumber: 3, totalInstallments: 6, isRecurring: true, dueMonth: "Oct", dueDay: 29 },
    ],
  );
});
