import { Card, CardContent } from "@expense/components/ui/card";
import { Button } from "@expense/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Copy, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@expense/components/ui/dropdown-menu";
import type { Expense } from "@expense-shared/schema";
import { EXPENSE_CATEGORIES } from "@expense-shared/schema";
import { getRelativeDateString } from "@expense/lib/timezone";
import { useDeleteExpense } from "@expense/hooks/useExpenses";
import { useCurrency } from "@expense/hooks/useCurrency";
import { useState } from "react";
import { AddExpenseModal } from "./AddExpenseModal";

interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const deleteExpense = useDeleteExpense();
  const { formatAmount } = useCurrency();
  
  const category = EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES];
  const categoryColor = category?.color || "bg-gray-100 text-gray-800";
  const categoryEmoji = category?.emoji || "📦";
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpense.mutate(expense.id);
    }
  };

  const expenseDate = typeof expense.expenseDate === 'string' 
    ? new Date(expense.expenseDate) 
    : expense.expenseDate;
  
  const editData: any = {
    amount: parseFloat(expense.amount.toString()),
    description: expense.description,
    category: expense.category,
    subcategory: expense.subcategory || "",
    expenseDate: expenseDate.toISOString().split('T')[0],
    paymentMethod: expense.paymentMethod || "",
    location: expense.location || "",
    notes: expense.notes || "",
    tags: expense.tags || [],
    type: expense.type || "personal",
    businessName: expense.businessName || "",
  };

  // Duplicate data uses same fields but with today's date
  const duplicateData: any = {
    ...editData,
    expenseDate: new Date().toISOString().split('T')[0],
  };

  return (
    <>
      <Card data-testid={`card-expense-${expense.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryColor}`}>
                <span className="text-lg" data-testid={`emoji-${expense.category}`}>
                  {categoryEmoji}
                </span>
              </div>
              <div>
                <h3 className="font-medium" data-testid="text-description">
                  {expense.description}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground" data-testid="text-category">
                    {category?.label || expense.category}
                  </p>
                  {expense.type === "business" && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full" data-testid="badge-business">
                      💼
                    </span>
                  )}
                  {expense.type === "investment" && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full" data-testid="badge-investment">
                      📈
                    </span>
                  )}
                  {expense.type === "loan" && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full" data-testid="badge-loan">
                      💰
                    </span>
                  )}
                  {expense.type === "insurance" && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full" data-testid="badge-insurance">
                      🛡️
                    </span>
                  )}
                  {expense.type === "tax" && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full" data-testid="badge-tax">
                      🧾
                    </span>
                  )}
                  {expense.type === "medical" && (
                    <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full" data-testid="badge-medical">
                      🏥
                    </span>
                  )}
                  {expense.type === "charity" && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full" data-testid="badge-charity">
                      ❤️
                    </span>
                  )}
                </div>
                {expense.location && (
                  <p className="text-xs text-muted-foreground" data-testid="text-location">
                    📍 {expense.location}
                  </p>
                )}
                {expense.receiptImageUrl && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-has-receipt">
                    <Receipt className="h-3 w-3" />
                    Receipt available
                  </p>
                )}
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <p className="font-semibold" data-testid="text-amount">
                  -{formatAmount(parseFloat(expense.amount))}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-date">
                  {getRelativeDateString(expense.expenseDate)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {expense.receiptImageUrl && (
                    <DropdownMenuItem 
                      onClick={() => expense.receiptImageUrl && window.open(expense.receiptImageUrl, '_blank')}
                      data-testid="button-view-receipt"
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      View Receipt
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} data-testid="button-edit">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDuplicateModalOpen(true)} data-testid="button-duplicate">
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive"
                    data-testid="button-delete"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {expense.notes && (
            <p className="text-sm text-muted-foreground mt-2 pl-13" data-testid="text-notes">
              {expense.notes}
            </p>
          )}
          {expense.tags && expense.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pl-13">
              {expense.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-secondary px-2 py-1 rounded-full"
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddExpenseModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        initialData={editData}
      />

      <AddExpenseModal
        open={isDuplicateModalOpen}
        onOpenChange={setIsDuplicateModalOpen}
        initialData={duplicateData}
      />
    </>
  );
}
