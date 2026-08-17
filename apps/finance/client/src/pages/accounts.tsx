import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountForm } from "@/components/account-form";
import { EditAccountModal } from "@/components/edit-account-modal";
import { formatCurrency, getCurrencyColor, getAccountTypeIcon, getLocalISODate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { type AccountWithBalance, type AccountCategory, type Account, inferCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { MoreVertical, Plus, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import Tesseract from "tesseract.js";

export default function Accounts() {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [parsedAccounts, setParsedAccounts] = useState<(any & { category: AccountCategory })[]>([]);
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lastScanMethod, setLastScanMethod] = useState<'camera' | 'upload' | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: accounts = [], isLoading } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts", {
        credentials: "include", // Include session cookies
      });
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return response.json();
    },
  });

  // Trigger migration on component mount - MUST be before early returns
  useEffect(() => {
    const triggerMigration = async () => {
      try {
        console.log('Triggering migration...');
        const response = await fetch('/api/accounts/migrate-categories', {
          method: 'POST',
          credentials: 'include'
        });
        const result = await response.json();
        console.log('Migration result:', result);
        if (result.updated > 0) {
          // Refresh accounts data
          queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        }
      } catch (error) {
        console.error('Migration failed:', error);
      }
    };
    
    if (accounts.length > 0 && !(accounts[0] as any)?.category) {
      triggerMigration();
    }
  }, [accounts, queryClient]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Start camera first if not already running
      if (!video.srcObject) {
        await startCamera();
        // Wait for video to be ready
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve);
          };
        });
        // Give camera time to initialize and focus
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Ensure video dimensions are available
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Camera not ready. Please try again.');
      }
      
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      
      // Convert canvas to blob for OCR
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.95);
      });
      
      // Run OCR with the blob
      const { data: { text } } = await Tesseract.recognize(blob, 'eng');
      setScanResult(text);
      setLastScanMethod('camera');
      
      console.log('OCR Result:', text);
      
      // Parse the extracted text for account information
      const parsed = parseAccountData(text);
      setParsedAccounts(parsed);
      console.log('Parsed Accounts:', parsed);
    } catch (error) {
      console.error('Error scanning document:', error);
      setScanResult('Error scanning document. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const parseAccountData = (text: string) => {
    const accounts: any[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Common patterns for account detection
    const patterns = {
      // Account name patterns (checking, savings, credit, etc.)
      accountName: /(?:360\s*)?(?:checking|savings|performance\s*savings|quicksilver|platinum\s*secured|cash\s*rewards|venture|savor|money\s*market|cd|certificate)/i,
      
      // Balance patterns ($123.45, 123.45, -123.45)
      balance: /[−-]?\$?(\d{1,3}(?:,?\d{3})*\.?\d{0,2})/,
      
      // Last 4 digits patterns (...1234, ****1234, ending in 1234)
      last4: /(?:\.{3,4}|ending\s+in\s*|\*{4})(\d{4})/i,
      
      // Institution detection
      institution: /(?:capital\s*one|chase|bank\s*of\s*america|wells\s*fargo|citi|discover|american\s*express)/i
    };

    let currentAccount = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      // Check if line contains account name
      const accountMatch = line.match(patterns.accountName);
      if (accountMatch) {
        // Save previous account if exists
        if (currentAccount && currentAccount.name) {
          accounts.push(currentAccount);
        }
        
        // Start new account
        currentAccount = {
          name: accountMatch[0].trim(),
          institution: 'Capital One', // Default, will try to detect
          type: getAccountType(accountMatch[0]),
          openingBalance: 0,
          mask: '',
          owner: 'personal' // Default, could be enhanced to detect business
        };
        
        // Try to find institution in the same line or nearby lines
        const instMatch = (line + ' ' + nextLine).match(patterns.institution);
        if (instMatch) {
          currentAccount.institution = formatInstitutionName(instMatch[0]);
        }
      }
      
      // Look for balance in current line
      const balanceMatch = line.match(patterns.balance);
      if (balanceMatch && currentAccount) {
        const balanceStr = balanceMatch[1].replace(/,/g, '');
        const balance = parseFloat(balanceStr);
        if (!isNaN(balance)) {
          currentAccount.openingBalance = line.includes('-') || line.includes('−') ? -balance : balance;
        }
      }
      
      // Look for last 4 digits
      const last4Match = line.match(patterns.last4);
      if (last4Match && currentAccount) {
        currentAccount.mask = last4Match[1];
      }
    }
    
    // Add the last account
    if (currentAccount && currentAccount.name) {
      accounts.push(currentAccount);
    }
    
    // Filter out accounts without essential information and assign categories
    const validAccounts = accounts.filter(acc => acc.name && acc.name.length > 2);
    
    // Assign categories using inferCategory function with ID for tracking
    return validAccounts.map((acc, index) => ({
      ...acc,
      id: `temp-${index}`, // Temporary ID for tracking during review
      category: inferCategory({
        type: acc.type,
        name: acc.name,
        owner: acc.owner,
        institution: acc.institution
      })
    }));
  };

  const getAccountType = (accountName: string): string => {
    const name = accountName.toLowerCase();
    if (name.includes('checking')) return 'checking';
    if (name.includes('savings') || name.includes('performance')) return 'savings';
    if (name.includes('credit') || name.includes('quicksilver') || name.includes('platinum') || name.includes('secured')) return 'credit';
    if (name.includes('investment') || name.includes('brokerage')) return 'investment';
    if (name.includes('cash')) return 'cash';
    return 'checking'; // Default
  };

  const formatInstitutionName = (instName: string): string => {
    const name = instName.toLowerCase().replace(/\s+/g, ' ').trim();
    if (name.includes('capital one')) return 'Capital One';
    if (name.includes('chase')) return 'Chase';
    if (name.includes('bank of america')) return 'Bank of America';
    if (name.includes('wells fargo')) return 'Wells Fargo';
    if (name.includes('citi')) return 'Citibank';
    if (name.includes('discover')) return 'Discover';
    if (name.includes('american express')) return 'American Express';
    return 'Unknown Institution';
  };

  const handleCategoryChange = (accountId: string, newCategory: AccountCategory) => {
    setParsedAccounts(prevAccounts => 
      prevAccounts.map(account => 
        account.id === accountId 
          ? { ...account, category: newCategory }
          : account
      )
    );
  };

  const createAccountsFromScan = async () => {
    if (parsedAccounts.length === 0) {
      toast({
        variant: "destructive",
        title: "No accounts detected",
        description: "Could not parse any account information from the scanned text. Try scanning again or use manual entry.",
      });
      return;
    }

    setIsCreatingAccounts(true);
    
    try {
      console.log('Creating accounts from scan:', parsedAccounts);
      
      const response = await apiRequest('POST', '/api/accounts/bulk', { accounts: parsedAccounts });
      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Some accounts could not be created",
          description: `${result.accounts?.length || 0} accounts created successfully. ${result.errors.length} failed.`,
        });
      } else {
        toast({
          title: "Accounts created successfully!",
          description: `${result.accounts?.length || 0} accounts have been created from your bank statement.`,
        });
      }
      
      // Refresh accounts data
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      
      // Close scanner
      resetScanner();
      setShowScanner(false);
      
    } catch (error) {
      console.error('Error creating accounts from scan:', error);
      toast({
        variant: "destructive",
        title: "Failed to create accounts",
        description: "There was an error creating accounts from the scan. Please try again or use manual entry.",
      });
    } finally {
      setIsCreatingAccounts(false);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || !files[0]) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only JPEG, PNG, and PDF files are allowed.",
      });
      return;
    }
    
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB.",
      });
      return;
    }
    
    setUploadedFile(file);
    console.log('File uploaded:', file.name, file.type, file.size);
  };

  const processUploadedFile = async () => {
    if (!uploadedFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a file to scan.",
      });
      return;
    }

    setIsUploadProcessing(true);
    
    try {
      console.log('Processing uploaded file with Tesseract.js:', uploadedFile.name);
      
      // Use Tesseract.js to process the uploaded file directly (same as camera capture)
      const { data: { text } } = await Tesseract.recognize(uploadedFile, 'eng', {
        logger: m => console.log(m) // Log OCR progress
      });
      
      console.log('OCR Result from uploaded file:', text);
      
      // Use the same processing pipeline as camera capture
      setScanResult(text);
      setLastScanMethod('upload');
      const parsed = parseAccountData(text);
      setParsedAccounts(parsed);
      
      toast({
        title: "File processed successfully",
        description: `Extracted text from ${uploadedFile.name}`,
      });
      
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process the uploaded file.",
      });
    } finally {
      setIsUploadProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const resetScanner = () => {
    setScanResult("");
    setParsedAccounts([]);
    setUploadedFile(null);
    setIsUploadProcessing(false);
    setDragActive(false);
    setLastScanMethod(null);
    // Stop camera if active
    const video = videoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowEditModal(true);
  };

  const moveToCategoryMutation = useMutation({
    mutationFn: async ({ accountId, newCategory }: { accountId: string; newCategory: AccountCategory }) => {
      const response = await apiRequest("PATCH", `/api/accounts/${accountId}`, { category: newCategory });
      if (!response.ok) {
        throw new Error('Failed to update account category');
      }
      return response.json();
    },
    
    onMutate: async ({ accountId, newCategory }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/accounts"] });
      
      // Snapshot the previous value for rollback
      const previousAccounts = queryClient.getQueryData<AccountWithBalance[]>(["/api/accounts"]);
      
      // Optimistically update the account's category
      if (previousAccounts) {
        const updatedAccounts = previousAccounts.map(account => 
          account.id === accountId 
            ? { ...account, category: newCategory } as AccountWithBalance & { category: AccountCategory }
            : account
        );
        queryClient.setQueryData(["/api/accounts"], updatedAccounts);
      }
      
      // Return a context object with the snapshotted value
      return { previousAccounts };
    },
    
    onError: (err, { accountId, newCategory }, context) => {
      console.error('Error moving account to category:', err);
      
      // Roll back to the previous value
      if (context?.previousAccounts) {
        queryClient.setQueryData(["/api/accounts"], context.previousAccounts);
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to move account to new category. Changes have been reverted.",
      });
    },
    
    onSuccess: (data, { newCategory }) => {
      toast({
        title: "Success",
        description: `Account moved to ${newCategory.toLowerCase()} category successfully`,
      });
    },
    
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
  });

  const handleMoveToCategory = (accountId: string, newCategory: AccountCategory) => {
    // Get the current account to check if it's already in the target category
    const currentAccounts = queryClient.getQueryData<AccountWithBalance[]>(["/api/accounts"]);
    const currentAccount = currentAccounts?.find(acc => acc.id === accountId);
    
    if (!currentAccount) {
      console.warn('Account not found for move operation');
      return;
    }
    
    const currentCategory = getAccountCategory(currentAccount);
    
    // Don't proceed if already in the target category
    if (currentCategory === newCategory) {
      return;
    }
    
    moveToCategoryMutation.mutate({ accountId, newCategory });
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await apiRequest("DELETE", `/api/accounts/${accountId}`);
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      deleteAccountMutation.mutate(accountToDelete.id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Helper function to get account category with fallback
  const getAccountCategory = (account: AccountWithBalance): AccountCategory => {
    // Check if account has category field, otherwise infer from type/owner
    const accountWithCategory = account as AccountWithBalance & { category?: AccountCategory };
    if (accountWithCategory.category) {
      return accountWithCategory.category;
    }
    
    // Fallback logic for accounts without category (during migration)
    return inferCategory({
      type: account.type,
      name: account.name,
      owner: account.owner,
      institution: account.institution || undefined
    });
  };

  // Filter accounts by search term first, then by category with proper typing
  const filteredAccounts = accounts.filter((account) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      account.name.toLowerCase().includes(searchLower) ||
      (account.institution && account.institution.toLowerCase().includes(searchLower)) ||
      account.type.toLowerCase().includes(searchLower) ||
      account.owner.toLowerCase().includes(searchLower)
    );
  });

  const sortAlphabetically = (accounts: AccountWithBalance[]) => 
    [...accounts].sort((a, b) => a.name.localeCompare(b.name));

  const personalAccounts = sortAlphabetically(filteredAccounts.filter(acc => getAccountCategory(acc) === 'PERSONAL'));
  const savingsAccounts = sortAlphabetically(filteredAccounts.filter(acc => getAccountCategory(acc) === 'SAVINGS'));
  const creditAccounts = sortAlphabetically(filteredAccounts.filter(acc => getAccountCategory(acc) === 'CREDIT'));
  const businessAccounts = sortAlphabetically(filteredAccounts.filter(acc => getAccountCategory(acc) === 'BUSINESS'));
  const investmentAccounts = sortAlphabetically(filteredAccounts.filter(acc => getAccountCategory(acc) === 'INVESTMENT'));
  
  
  // Helper function to toggle section collapse
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  // Helper function to render account section
  const renderAccountSection = (title: string, accounts: AccountWithBalance[], testIdPrefix: string, emptyMessage: string) => {
    if (accounts.length === 0) return null;
    
    const sectionId = testIdPrefix;
    const isCollapsed = collapsedSections.has(sectionId);
    
    return (
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
          onClick={() => toggleSection(sectionId)}
          data-testid={`header-${testIdPrefix}-section`}
        >
          <CardTitle className="flex items-center justify-between">
            <span>{title} ({accounts.length})</span>
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="space-y-4">
            {accounts.map((account) => (
              <div
              key={account.id}
              className="relative flex items-center justify-between p-4 border border-border rounded-lg"
              data-testid={`${testIdPrefix}-account-${account.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className={`${getAccountTypeIcon(account.type)} text-primary`}></i>
                </div>
                <div>
                  <div className="font-medium text-foreground">{account.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {account.institution} • {account.type}
                    {account.type === 'savings' && (account as any).apyPercent && (
                      <span className="ml-2 text-green-700 dark:text-green-400 font-medium">
                        {(account as any).apyPercent}% APY
                      </span>
                    )}
                    {account.type === 'credit' && (account as any).aprPercent && (
                      <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                        {(account as any).aprPercent}% APR
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`font-semibold ${getCurrencyColor(account.currentBalanceCents)}`}>
                    {formatCurrency(account.currentBalanceCents)}
                  </div>
                  {account.type === 'credit' && (account as any).creditLimitCents && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-700 dark:text-green-400">
                        {formatCurrency((account as any).creditLimitCents - Math.abs(account.currentBalanceCents))} available
                      </span>
                      <span className="ml-1">of {formatCurrency((account as any).creditLimitCents)}</span>
                    </div>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      data-testid={`button-account-menu-${account.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link to={`/accounts/${account.id}/ledger`}>
                      <DropdownMenuItem data-testid={`menu-view-ledger-${account.id}`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Ledger
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      onClick={() => handleEditAccount(account)}
                      data-testid={`menu-edit-account-${account.id}`}
                    >
                      ✏️ Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger data-testid={`menu-move-category-${account.id}`}>
                        📁 Move to...
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => handleMoveToCategory(account.id, 'PERSONAL')}
                          disabled={getAccountCategory(account) === 'PERSONAL' || moveToCategoryMutation.isPending}
                          data-testid={`menu-move-personal-${account.id}`}
                        >
                          🏠 Personal
                          {moveToCategoryMutation.isPending && getAccountCategory(account) !== 'PERSONAL' && (
                            <span className="ml-auto text-xs">⏳</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveToCategory(account.id, 'CREDIT')}
                          disabled={getAccountCategory(account) === 'CREDIT' || moveToCategoryMutation.isPending}
                          data-testid={`menu-move-credit-${account.id}`}
                        >
                          💳 Credit
                          {moveToCategoryMutation.isPending && getAccountCategory(account) !== 'CREDIT' && (
                            <span className="ml-auto text-xs">⏳</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveToCategory(account.id, 'BUSINESS')}
                          disabled={getAccountCategory(account) === 'BUSINESS' || moveToCategoryMutation.isPending}
                          data-testid={`menu-move-business-${account.id}`}
                        >
                          🏢 Business
                          {moveToCategoryMutation.isPending && getAccountCategory(account) !== 'BUSINESS' && (
                            <span className="ml-auto text-xs">⏳</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveToCategory(account.id, 'INVESTMENT')}
                          disabled={getAccountCategory(account) === 'INVESTMENT' || moveToCategoryMutation.isPending}
                          data-testid={`menu-move-investment-${account.id}`}
                        >
                          📈 Investment
                          {moveToCategoryMutation.isPending && getAccountCategory(account) !== 'INVESTMENT' && (
                            <span className="ml-auto text-xs">⏳</span>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem
                      onClick={() => handleDeleteAccount(account)}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      data-testid={`menu-delete-account-${account.id}`}
                    >
                      🗑️ Delete Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            ))}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Account Management</h2>
          <p className="text-muted-foreground">Manage all your financial accounts</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowScanner(true)}
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            data-testid="button-scan-document"
          >
            📄 Scan Document
          </Button>
          <Button onClick={() => setShowAccountForm(true)} data-testid="button-add-account">
            ➕ Add Account
          </Button>
        </div>
      </div>

      {/* Search Box */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search accounts by name, institution, type, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-accounts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Sections - Only show sections with accounts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {renderAccountSection("💼 Personal Accounts", personalAccounts, "personal", "No personal accounts found.")}
        {renderAccountSection("💰 Savings Accounts", savingsAccounts, "savings", "No savings accounts found.")}
        {renderAccountSection("💳 Credit Accounts", creditAccounts, "credit", "No credit accounts found.")}
        {renderAccountSection("🏢 Business Accounts", businessAccounts, "business", "No business accounts found.")}
        {renderAccountSection("📈 Investment Accounts", investmentAccounts, "investment", "No investment accounts found.")}
      </div>
      
      {/* Show message when no accounts match search */}
      {accounts.length > 0 && filteredAccounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No Accounts Match Your Search</h3>
            <p className="text-muted-foreground mb-6">
              No accounts found matching "{searchTerm}". Try searching by account name, institution, type, or owner.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm("")}
              data-testid="button-clear-search"
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show message if no accounts exist */}
      {accounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🏦</div>
            <h3 className="text-xl font-semibold mb-2">No Accounts Yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by adding your first account or scanning a bank statement
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => {
                  setShowScanner(true);
                  startCamera();
                }}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                📄 Scan Bank Statement
              </Button>
              <Button onClick={() => setShowAccountForm(true)}>
                ➕ Add Account Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AccountForm open={showAccountForm} onOpenChange={setShowAccountForm} />
      
      <EditAccountModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        account={editingAccount}
      />
      
      {/* Document Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Scan Bank Statement</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Point your camera at a bank statement to extract account information
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {!scanResult ? (
              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : uploadedFile 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  aria-label="Upload bank statement"
                  tabIndex={0}
                  data-testid="upload-drop-zone"
                >
                  {uploadedFile ? (
                    <div className="text-center">
                      <div className="mb-2">
                        <div className="inline-flex items-center gap-2 text-green-700">
                          <span className="text-2xl">📄</span>
                          <span className="font-medium">{uploadedFile.name}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                      >
                        Replace File
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mb-4">
                        <span className="text-4xl">⬆️</span>
                      </div>
                      <div className="text-lg font-medium text-foreground mb-2">
                        Upload Bank Statement
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Drop an image or PDF here, or click to browse
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Supports JPEG, PNG, PDF • Max 10MB
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    data-testid="file-input"
                  />
                </div>

                {/* Camera Section */}
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg border"
                    playsInline
                    muted
                    style={{ maxHeight: '300px' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  <div className="border rounded-lg p-6 text-center bg-muted/20 mt-2">
                    <div className="text-2xl mb-2">📹</div>
                    <div className="text-sm text-muted-foreground">
                      {isScanning ? 'Starting camera and scanning...' : 'Camera will start when you tap "Capture & Scan"'}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={captureAndScan}
                    disabled={isScanning}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-capture-scan"
                  >
                    {isScanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Scanning...
                      </>
                    ) : (
                      <>📸 Capture & Scan</>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={processUploadedFile}
                    disabled={!uploadedFile || isUploadProcessing || isScanning}
                    className="flex-1"
                    data-testid="button-process-upload"
                  >
                    {isUploadProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>⬆️ Scan Uploaded File</>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      resetScanner();
                      setShowScanner(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Scan Complete</Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      resetScanner();
                      // Don't automatically start camera, let user choose method again
                    }}
                  >
                    {lastScanMethod === 'upload' ? '📄 Scan Another Document' : '🔄 Scan Again'}
                  </Button>
                </div>
                
                {parsedAccounts.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">🎉 Detected Accounts ({parsedAccounts.length})</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Review and adjust categories for each account before creating them
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {parsedAccounts.map((account, index) => (
                        <div 
                          key={account.id || index} 
                          className="flex flex-col gap-3 p-4 border border-border rounded-lg bg-card"
                          data-testid={`parsed-account-${index}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <i className={`${getAccountTypeIcon(account.type)} text-primary`}></i>
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{account.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {account.institution} • {account.type}
                                  {account.mask && ` • ending in ${account.mask}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${getCurrencyColor(account.openingBalance * 100)}`}>
                                {formatCurrency(account.openingBalance * 100)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <label className="text-sm font-medium text-muted-foreground min-w-0 shrink-0">
                              Category:
                            </label>
                            <Select
                              value={account.category}
                              onValueChange={(value: AccountCategory) => handleCategoryChange(account.id, value)}
                              data-testid={`select-category-${index}`}
                            >
                              <SelectTrigger className="w-full max-w-[180px]">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PERSONAL">🏠 Personal</SelectItem>
                                <SelectItem value="CREDIT">💳 Credit</SelectItem>
                                <SelectItem value="BUSINESS">🏢 Business</SelectItem>
                                <SelectItem value="INVESTMENT">📈 Investment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">❌ No Accounts Detected</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Could not automatically parse account information. Check the raw text below.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <details>
                        <summary className="cursor-pointer text-sm font-medium mb-2">View Raw Extracted Text</summary>
                        <div className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {scanResult}
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                )}
                
                <div className="text-sm text-muted-foreground">
                  💡 <strong>Next steps:</strong> {parsedAccounts.length > 0 
                    ? "Review the detected accounts above and click 'Create Accounts' to add them to your account list."
                    : "The scanner couldn't detect accounts automatically. You can try scanning again or use the 'Add Account' button to create accounts manually."
                  }
                </div>
                
                <div className="flex gap-2">
                  {parsedAccounts.length > 0 ? (
                    <Button 
                      onClick={createAccountsFromScan}
                      disabled={isCreatingAccounts}
                      className="flex-1"
                      data-testid="button-create-accounts-from-scan"
                    >
                      {isCreatingAccounts ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating {parsedAccounts.length} accounts...
                        </>
                      ) : (
                        <>✨ Create {parsedAccounts.length} Accounts</>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        setShowScanner(false);
                        setScanResult("");
                        setParsedAccounts([]);
                        setShowAccountForm(true);
                      }}
                      variant="outline"
                      data-testid="button-manual-create-account"
                    >
                      ➕ Add Account Manually
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => {
                      resetScanner();
                      setShowScanner(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.name}"? This action cannot be undone and will permanently remove the account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowAccountForm(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        size="icon"
        data-testid="fab-add-account"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add Account</span>
      </Button>
    </div>
  );
}
