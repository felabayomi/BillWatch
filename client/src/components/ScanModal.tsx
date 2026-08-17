import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image, X, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface ScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedScanBill {
  company?: string | null;
  amount?: string | number | null;
  minimumPayment?: string | number | null;
  dueDate?: string | Date | null;
  description?: string | null;
  installments?: Array<{ amount?: string | number | null; dueDate?: string | Date | null; installmentNumber?: number | null; isPaid?: boolean }> | null;
  totalInstallments?: number | null;
  recurringType?: string | null;
  isRecurring?: boolean;
  [key: string]: any;
}

export function ScanModal({ open, onOpenChange }: ScanModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedBills, setParsedBills] = useState<ParsedScanBill[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateBillField = (index: number, field: string, value: string) => {
    setParsedBills((current) => current.map((bill, billIndex) => {
      if (billIndex !== index) return bill;
      return { ...bill, [field]: value };
    }));
  };

  const saveAllScannedBills = async () => {
    if (parsedBills.length === 0) return;

    setIsSavingAll(true);
    try {
      const createdBills: any[] = [];

      for (const bill of parsedBills) {
        const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date();
        const payload = {
          company: bill.company || "Unknown Company",
          amount: String(bill.amount ?? bill.minimumPayment ?? 0),
          dueDate: dueDate.toISOString(),
          category: bill.category || "Other",
          description: bill.description || "",
          accountNumber: bill.accountNumber || null,
          isRecurring: Boolean(bill.isRecurring || bill.totalInstallments),
          recurringType: bill.recurringType || null,
          totalInstallments: bill.totalInstallments || null,
          billType: "personal",
          businessName: null,
          creditorPaymentAddress: null,
        };

        const response = await fetch("/api/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`${response.status}: ${error}`);
        }

        createdBills.push(await response.json());
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });

      toast({
        title: "Bills saved",
        description: `Saved ${createdBills.length} scanned records.`,
      });

      setParsedBills([]);
      setIsSavingAll(false);
      setIsProcessing(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Save scanned bills error:", error);
      toast({
        title: "Save failed",
        description: "One or more scanned bills could not be saved.",
        variant: "destructive",
      });
      setIsSavingAll(false);
    }
  };

  const scanBillMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/bills/scan", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/filter"], exact: false });

      const bills = Array.isArray(data?.bills) ? data.bills : Array.isArray(data?.bill) ? data.bill : data?.bill ? [data.bill] : [];
      setParsedBills(bills);

      if (bills.length === 0) {
        toast({
          title: "No valid bills detected",
          description: "The document could not be parsed into valid bill records. Please review and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      toast({
        title: "Bill scan complete",
        description: `${bills.length} bill${bills.length === 1 ? "" : "s"} detected and ready to review.`,
      });

      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Scan error:", error);
      toast({
        title: "Scan failed",
        description: "Failed to process the document. Please try again or add the bill manually.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setParsedBills([]);
    setIsProcessing(true);

    const formData = new FormData();
    if (files.length === 1) {
      formData.append('document', files[0]);
    } else {
      Array.from(files).forEach((file, index) => {
        formData.append(`document_${index}`, file);
      });
      formData.append('multipage', 'true');
    }

    scanBillMutation.mutate(formData);
  };

  const renderScanResults = () => {
    if (parsedBills.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Detected records</p>
            <p className="text-xs text-muted-foreground">{parsedBills.length} bill{parsedBills.length === 1 ? "" : "s"} returned from this scan.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{parsedBills.length}</span>
        </div>

        <div className="max-h-[52vh] overflow-y-auto space-y-3">
          {parsedBills.map((bill, index) => {
            const installmentLabel = bill.totalInstallments
              ? `${bill.installments?.[0]?.installmentNumber ?? 1} of ${bill.totalInstallments}`
              : bill.installments?.[0]?.installmentNumber
                ? `${bill.installments[0].installmentNumber}`
                : "1";

            return (
              <div key={`${bill.company || "bill"}-${bill.amount || "amount"}-${index}`} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={bill.company || ""}
                    onChange={(event) => updateBillField(index, "company", event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
                  />
                  <div className="rounded bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">{installmentLabel}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount</p>
                    <input
                      value={String(bill.amount ?? bill.minimumPayment ?? "")}
                      onChange={(event) => updateBillField(index, "amount", event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Due date</p>
                    <input
                      value={bill.dueDate ? new Date(bill.dueDate).toISOString().slice(0, 10) : ""}
                      onChange={(event) => updateBillField(index, "dueDate", event.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setParsedBills([]); setIsProcessing(false); onOpenChange(false); }} data-testid="button-cancel-scan-results">
            Cancel
          </Button>
          <Button className="flex-1" onClick={saveAllScannedBills} disabled={isSavingAll} data-testid="button-save-all-scanned-bills">
            {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Save All
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        setParsedBills([]);
        setIsProcessing(false);
        setIsSavingAll(false);
      }
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-w-md mx-auto slide-up" data-testid="scan-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Scan Bill Document
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              data-testid="button-close-scan-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Upload a bill document to automatically extract company name, amount, due date, and other details using OCR and AI technology.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!parsedBills.length && (
            <>
              <div className="aspect-[4/3] bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mb-2 mx-auto" />
                  <p className="text-muted-foreground text-sm">Document scanner ready</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports images, PDFs, and multi-page documents</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    data-testid="input-file-upload"
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isProcessing}
                    data-testid="button-choose-from-gallery"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Files
                  </Button>
                </div>
                
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="camera-capture"
                    data-testid="input-camera-capture"
                  />
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => document.getElementById('camera-capture')?.click()}
                    disabled={isProcessing}
                    data-testid="button-capture"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </div>
            </>
          )}
          
          {isProcessing && !parsedBills.length && (
            <div className="bg-muted rounded-lg p-4" data-testid="processing-indicator">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Processing document...</p>
                  <p className="text-xs text-muted-foreground">Extracting bill information using OCR</p>
                </div>
              </div>
            </div>
          )}

          {renderScanResults()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
