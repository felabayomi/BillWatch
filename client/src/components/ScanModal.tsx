import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface ScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanModal({ open, onOpenChange }: ScanModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      // Invalidate all bills queries regardless of month/year filter
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/carryover"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/filter"], exact: false });
      
      // Handle both single bill and recurring bill responses
      let successMessage = "";
      if (data.bills && Array.isArray(data.bills)) {
        // Recurring/payment plan bills
        const firstBill = data.bills[0];
        const totalBills = data.bills.length;
        successMessage = `Payment plan detected! Created ${totalBills} bills for ${firstBill.company}`;
      } else if (data.bill) {
        // Single bill
        successMessage = `Extracted bill from ${data.bill.company} for $${data.bill.amount}`;
      } else {
        successMessage = "Bill scanned successfully!";
      }
      
      toast({
        title: "Bill scanned successfully!",
        description: successMessage,
      });
      
      onOpenChange(false);
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

    setIsProcessing(true);

    const formData = new FormData();
    
    // Handle multiple files or single file
    if (files.length === 1) {
      formData.append('document', files[0]);
    } else {
      // Multiple files for multi-page scanning
      Array.from(files).forEach((file, index) => {
        formData.append(`document_${index}`, file);
      });
      formData.append('multipage', 'true');
    }
    
    // Note: userId is handled by authentication middleware on the backend

    scanBillMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        </DialogHeader>
        
        <div className="sr-only">
          Upload a bill document to automatically extract company name, amount, due date, and other details using OCR and AI technology.
        </div>
        
        <div className="space-y-4">
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
          
          {isProcessing && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
