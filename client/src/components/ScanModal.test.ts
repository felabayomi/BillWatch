import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDateInputValue, parseValidDueDate, validateScannedBill } from "./ScanModal.tsx";

test("date helpers keep valid YYYY-MM-DD values and ignore invalid input without crashing", () => {
  assert.equal(normalizeDateInputValue("2026-07-29"), "2026-07-29");
  assert.equal(normalizeDateInputValue("invalid-date"), "");

  const validDate = parseValidDueDate("2026-07-29");
  assert.ok(validDate instanceof Date);
  assert.equal(validDate?.getFullYear(), 2026);
  assert.equal(validDate?.getMonth(), 6);
  assert.equal(validDate?.getDate(), 29);

  assert.equal(
    validateScannedBill({
      company: "Potomac Edison",
      amount: "226.99",
      dueDate: "2026-07-29",
    }),
    null,
  );

  assert.equal(
    validateScannedBill({
      company: "",
      amount: "226.99",
      dueDate: "2026-07-29",
    }),
    "Company name is required.",
  );

  assert.equal(
    validateScannedBill({
      company: "Potomac Edison",
      amount: "226.99",
      dueDate: "not-a-date",
    }),
    "A valid due date is required.",
  );
});
