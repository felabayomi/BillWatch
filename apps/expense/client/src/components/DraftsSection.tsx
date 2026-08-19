import { Card, CardContent } from "@expense/components/ui/card";
import { Button } from "@expense/components/ui/button";
import { Badge } from "@expense/components/ui/badge";
import { Check, Edit, Scan, Trash2, X, Receipt } from "lucide-react";
import { useDrafts, useApproveDraft, useDeleteDraft } from "@expense/hooks/useExpenses";
import { useCurrency } from "@expense/hooks/useCurrency";
import { EXPENSE_CATEGORIES } from "@expense-shared/schema";
import { getRelativeDateString } from "@expense/lib/timezone";
import { useEffect, useState } from "react";
import { AddExpenseModal } from "./AddExpenseModal";

export function DraftsSection() {
  const { data: drafts = [], isLoading } = useDrafts();
  const approveDraft = useApproveDraft();
  const deleteDraft = useDeleteDraft();
  const { formatAmount } = useCurrency();
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDraftId = params.get("draft");

    if (
      requestedDraftId &&
      drafts?.some((draft) => draft.id === requestedDraftId)
    ) {
      setEditingDraft(requestedDraftId);
    }
  }, [drafts]);

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review Scanned Items</h2>
          <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="border-muted">
              <CardContent className="p-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          className="rounded-full h-12 w-12 p-0 shadow-lg bg-yellow-500 hover:bg-yellow-600 text-white"
          data-testid="button-show-drafts"
        >
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
            {drafts.length}
          </Badge>
          <Scan className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  const handleApprove = (draftId: string) => {
    // Prevent double-approval by checking if already pending
    if (approveDraft.isPending) {
      return;
    }
    
    // Add confirmation to prevent accidental approval
    if (confirm("Are you sure you want to approve this draft and save it as an expense? This will create a permanent expense record.")) {
      approveDraft.mutate(draftId);
    }
  };

  const handleEdit = (draft: any) => {
    setEditingDraft(draft.id);
  };

  const handleDelete = (draftId: string) => {
    if (confirm("Are you sure you want to delete this scanned receipt? This cannot be undone.")) {
      deleteDraft.mutate(draftId);
    }
  };

  const getEditData = (draft: any): any => ({
    amount: draft.amount || "",
    description: draft.description || "",
    category: draft.category || "",
    subcategory: draft.subcategory || "",
    expenseDate: draft.expenseDate 
      ? new Date(draft.expenseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    paymentMethod: draft.paymentMethod || "",
    location: draft.location || "",
    notes: draft.notes || "",
    tags: draft.tags || [],
    type: draft.type || "personal",
    businessName: draft.businessName || "",
  });

  const editingDraftData = editingDraft 
    ? getEditData(drafts.find(d => d.id === editingDraft))
    : undefined;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsVisible(false)} />
      
      {/* Floating Panel */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 space-y-4 bg-white rounded-lg shadow-xl border p-4 max-h-[70vh] overflow-y-auto" data-testid="section-drafts">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold">Review Scanned Items</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="badge-pending-count">
              {drafts.length} pending
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
              data-testid="button-close-drafts"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {drafts.map((draft) => {
            const category = draft.category 
              ? EXPENSE_CATEGORIES[draft.category as keyof typeof EXPENSE_CATEGORIES]
              : null;
            const categoryColor = category?.color || "bg-gray-100 text-gray-800";
            const categoryEmoji = category?.emoji || "📦";
            const confidence = draft.confidence ? parseFloat(draft.confidence) : 0;
            const confidencePercent = Math.round(confidence * 100);
            
            return (
              <Card 
                key={draft.id}
                className="border-yellow-200 bg-yellow-50"
                data-testid={`card-draft-${draft.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Scanned Receipt
                      </span>
                    </div>
                    <Badge
                      variant={confidencePercent >= 80 ? "secondary" : "destructive"}
                      className="text-xs"
                      data-testid={`badge-confidence-${draft.id}`}
                    >
                      Confidence: {confidencePercent}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${categoryColor}`}>
                        <span className="text-sm">{categoryEmoji}</span>
                      </div>
                      <div>
                        <h3 className="font-medium" data-testid={`text-draft-description-${draft.id}`}>
                          {draft.description || "Unclear Receipt Text"}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`text-draft-category-${draft.id}`}>
                          {category?.label || draft.category || "Other"} 
                          {!draft.category && " (needs review)"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" data-testid={`text-draft-amount-${draft.id}`}>
                        {draft.amount ? formatAmount(parseFloat(draft.amount)) : "Amount needed"}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-6 px-2"
                          onClick={() => handleApprove(draft.id)}
                          disabled={approveDraft.isPending}
                          title="Approve and save as expense"
                          data-testid={`button-approve-${draft.id}`}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2"
                          onClick={() => handleEdit(draft)}
                          title="Edit draft details"
                          data-testid={`button-edit-draft-${draft.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white h-6 px-2"
                          onClick={() => handleDelete(draft.id)}
                          disabled={deleteDraft.isPending}
                          data-testid={`button-delete-${draft.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {draft.receiptImageUrl && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white hover:bg-gray-50"
                        onClick={() => draft.receiptImageUrl && window.open(draft.receiptImageUrl, '_blank')}
                        data-testid={`button-view-receipt-draft-${draft.id}`}
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        View Receipt Image
                      </Button>
                    </div>
                  )}
                  
                  {draft.originalText && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        View original OCR text
                      </summary>
                      <p className="text-xs text-muted-foreground mt-1 p-2 bg-yellow-100 rounded">
                        {draft.originalText}
                      </p>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {editingDraft && (
        <AddExpenseModal
          open={!!editingDraft}
          onOpenChange={(open) => {
            if (!open) {
              setEditingDraft(null);
              const url = new URL(window.location.href);
              url.searchParams.delete("draft");
              window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
            }
          }}
          initialData={editingDraftData}
          draftId={editingDraft}
        />
      )}
    </>
  );
}
