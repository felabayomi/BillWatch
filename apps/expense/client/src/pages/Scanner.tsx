import { useState, useRef } from "react";
import { Button } from "@expense/components/ui/button";
import { Card, CardContent } from "@expense/components/ui/card";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { useScanReceipt } from "@expense/hooks/useExpenses";
import { useLocation } from "wouter";

export default function Scanner() {
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanReceipt = useScanReceipt();

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);
    
    try {
      await scanReceipt.mutateAsync(file);
      // Navigate back to expenses page to see the draft
      navigate('/expense');
    } catch (error) {
      console.error('Failed to scan receipt:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = () => {
    // For demo purposes, trigger file input
    // In a real app, this would open the camera
    fileInputRef.current?.click();
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Scan Receipt</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/expense')}
            className="h-10 w-10 p-0"
            data-testid="button-close-scanner"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>
        
        <div className="flex-1 p-4 space-y-4">
          {/* Camera Preview Area */}
          <Card className="aspect-square border-2 border-dashed border-muted-foreground/25">
            <CardContent className="h-full flex items-center justify-center p-6">
              {isProcessing ? (
                <div className="text-center" data-testid="processing-indicator">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-foreground font-medium">Processing receipt...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Extracting text and parsing expense data
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Position receipt within frame</p>
                  <p className="text-sm text-muted-foreground mt-1">Tap to capture</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Options */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="flex items-center justify-center gap-2 p-3 h-auto"
              onClick={handleTakePhoto}
              disabled={isProcessing}
              data-testid="button-take-photo"
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">Take Photo</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 p-3 h-auto"
              onClick={handleUploadFile}
              disabled={isProcessing}
              data-testid="button-upload-file"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">Upload Image</span>
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
            data-testid="input-file-upload"
          />

          {/* Tips */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Tips for best results:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Ensure good lighting</li>
                <li>• Keep receipt flat and straight</li>
                <li>• Include entire receipt in frame</li>
                <li>• Avoid shadows and glare</li>
                <li>• Use high resolution images</li>
              </ul>
            </CardContent>
          </Card>

          {/* Processing Status Card (shown when processing) */}
          {isProcessing && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="font-medium text-blue-900">Processing receipt...</p>
                    <p className="text-sm text-blue-700">
                      This may take a few moments for complex receipts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
