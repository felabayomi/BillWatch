import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { formatCurrency } from "@finance/lib/format";
import { Printer, FileText, TrendingUp, TrendingDown, DollarSign, Building2, User, Receipt, Lock } from "lucide-react";

type TxRow = {
  id: string;
  txDate: string;
  description: string | null;
  amountCents: number;
  isBusinessExpense: boolean | null;
  isPersonal: boolean | null;
  receiptPath: string | null;
  accountName: string | null;
  accountType: string | null;
  accountOwner: string | null;
  categoryName: string | null;
  categoryKind: string | null;
};

type AccountRow = {
  id: string;
  name: string;
  type: string;
  owner: string;
  institution: string | null;
};

type PublicData = {
  label: string;
  fromDate: string;
  toDate: string;
  filterType: string;
  filterYear: string;
  transactions: TxRow[];
  accounts: AccountRow[];
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

function kindLabel(kind: string | null) {
  switch (kind) {
    case "income": return "Income";
    case "expense": return "Expense";
    case "bill": return "Bill Payment";
    case "transfer": return "Transfer";
    case "investment": return "Investment";
    case "adjustment": return "Adjustment";
    default: return kind ?? "â€”";
  }
}

function ReceiptLinks({ path }: { path: string }) {
  const paths = path.split(",").filter(Boolean);
  return (
    <div className="flex gap-1 flex-wrap">
      {paths.map((p, i) => (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
          title="View Receipt"
        >
          <Receipt className="h-3 w-3" />
          {paths.length > 1 ? `Receipt ${i + 1}` : "View Receipt"}
        </a>
      ))}
    </div>
  );
}

export default function AccountantView() {
  const { token } = useParams<{ token: string }>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, isError } = useQuery<PublicData>({
    queryKey: ["/api/finance/public/accountant", token, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/finance/public/accountant/${token}?${params}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading financial records...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link Not Found</h1>
          <p className="text-gray-500">This link is invalid or has been revoked. Please contact the account holder for a new link.</p>
        </div>
      </div>
    );
  }

  const assetTypes = ["checking", "savings", "cash", "investment", "rewards"];

  const income = data.transactions.filter(t => t.amountCents > 0 && t.categoryKind !== "transfer").reduce((s, t) => s + t.amountCents, 0);
  const expenses = data.transactions.filter(t => t.amountCents < 0 && t.categoryKind !== "transfer").reduce((s, t) => s + Math.abs(t.amountCents), 0);
  const net = income - expenses;

  const categoryTotals: Record<string, { kind: string; total: number; count: number }> = {};
  for (const tx of data.transactions) {
    if (tx.categoryKind === "transfer") continue;
    const key = tx.categoryName || "Uncategorized";
    if (!categoryTotals[key]) categoryTotals[key] = { kind: tx.categoryKind || "", total: 0, count: 0 };
    categoryTotals[key].total += tx.amountCents;
    categoryTotals[key].count++;
  }

  const typeLabel = data.filterType === "business" ? "Business Only" : data.filterType === "personal" ? "Personal Only" : "All Transactions";
  const yearLabel = data.filterYear === "all" ? "All Years" : data.filterYear;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 print:px-2 print:py-2">

        <div className="flex items-start justify-between mb-4 print:mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Records</h1>
            <p className="text-gray-500 text-sm mt-1">{data.label}</p>
            <p className="text-xs text-gray-400 mt-1">Read-only view prepared for accounting and tax review</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 print:mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
            <Lock className="h-3 w-3" />
            Year: {yearLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-full font-medium">
            <Lock className="h-3 w-3" />
            Scope: {typeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-full font-medium">
            Period shown: {formatDate(data.fromDate)} â€“ {formatDate(data.toDate)}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 print:hidden">
          <p className="text-xs text-gray-500 mb-3 font-medium">Narrow date range within allowed period:</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                min={data.filterYear !== "all" ? `${data.filterYear}-01-01` : undefined}
                max={data.filterYear !== "all" ? `${data.filterYear}-12-31` : undefined}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                min={data.filterYear !== "all" ? `${data.filterYear}-01-01` : undefined}
                max={data.filterYear !== "all" ? `${data.filterYear}-12-31` : undefined}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs text-blue-600 hover:underline px-2 py-2">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 print:mb-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Income</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(income)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(expenses)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${net >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-4 w-4 ${net >= 0 ? "text-blue-600" : "text-orange-600"}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${net >= 0 ? "text-blue-700" : "text-orange-700"}`}>Net</span>
            </div>
            <p className={`text-2xl font-bold ${net >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatCurrency(net)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl mb-5 print:mb-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <h2 className="font-semibold text-gray-800">Transactions ({data.transactions.length})</h2>
            </div>
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center gap-1">
              <Receipt className="h-3 w-3" /> Click receipt buttons to view attached receipts
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Receipts</th>
                  <th className="px-4 py-3 font-semibold text-center print:hidden">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.transactions.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No transactions found for this period</td></tr>
                )}
                {data.transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 print:hover:bg-white">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(tx.txDate)}</td>
                    <td className="px-4 py-2.5 text-gray-800 max-w-xs">
                      <span className="line-clamp-2">{tx.description || "â€”"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{tx.accountName || "â€”"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{tx.categoryName || "â€”"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        tx.categoryKind === "income" ? "bg-green-100 text-green-700" :
                        tx.categoryKind === "expense" ? "bg-red-100 text-red-700" :
                        tx.categoryKind === "bill" ? "bg-orange-100 text-orange-700" :
                        tx.categoryKind === "investment" ? "bg-purple-100 text-purple-700" :
                        tx.categoryKind === "transfer" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {kindLabel(tx.categoryKind)}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${tx.amountCents >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {tx.amountCents >= 0 ? "+" : ""}{formatCurrency(tx.amountCents)}
                    </td>
                    <td className="px-4 py-2.5">
                      {tx.receiptPath ? (
                        <ReceiptLinks path={tx.receiptPath} />
                      ) : (
                        <span className="text-xs text-gray-300">â€”</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center print:hidden">
                      {tx.isBusinessExpense
                        ? <span title="Business"><Building2 className="h-3.5 w-3.5 text-blue-500 mx-auto" /></span>
                        : tx.isPersonal
                        ? <span title="Personal"><User className="h-3.5 w-3.5 text-gray-400 mx-auto" /></span>
                        : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl mb-5 print:mb-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Spending by Category</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-1">
            {Object.entries(categoryTotals)
              .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
              .map(([name, info]) => (
                <div key={name} className="flex items-center justify-between py-2 px-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{name}</span>
                    <span className="text-xs text-gray-400 ml-2">({info.count} {info.count === 1 ? "txn" : "txns"})</span>
                  </div>
                  <span className={`text-sm font-semibold ${info.total >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {info.total >= 0 ? "+" : ""}{formatCurrency(info.total)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl mb-8 print:mb-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Accounts on File</h2>
          </div>
          <div className="p-4">
            {["personal", "business"].map(owner => {
              const ownerAccounts = data.accounts.filter(a => a.owner === owner);
              if (!ownerAccounts.length) return null;
              return (
                <div key={owner} className="mb-4 last:mb-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    {owner === "personal" ? "Personal" : "Business"} Accounts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ownerAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{acc.name}</p>
                          <p className="text-xs text-gray-400">{acc.institution || acc.type}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          assetTypes.includes(acc.type) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {assetTypes.includes(acc.type) ? "Asset" : "Liability"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 border-t pt-4 print:mt-8">
          <p>This is a read-only financial summary generated for accounting and tax review purposes.</p>
          <p>Printed on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>
    </div>
  );
}
