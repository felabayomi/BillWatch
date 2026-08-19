import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@expense/components/ui/dialog";
import { Button } from "@expense/components/ui/button";
import { Plus, Scan } from "lucide-react";

interface AddExpenseActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManualAdd: () => void;
  onScanReceipt: () => void;
}

export function AddExpenseActionSheet({
  open,
  onOpenChange,
  onManualAdd,
  onScanReceipt,
}: AddExpenseActionSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            onClick={() => {
              onOpenChange(false);
              onManualAdd();
            }}
            className="h-16 flex items-center justify-start gap-4 text-left"
            variant="outline"
            data-testid="button-manual-entry"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Add Expense</div>
              <div className="text-sm text-muted-foreground">Enter details manually</div>
            </div>
          </Button>
          
          <Button
            onClick={() => {
              onOpenChange(false);
              onScanReceipt();
            }}
            className="h-16 flex items-center justify-start gap-4 text-left"
            variant="outline"
            data-testid="button-scan-receipt"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Scan className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Scan Receipt</div>
              <div className="text-sm text-muted-foreground">Use camera to capture receipt</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
