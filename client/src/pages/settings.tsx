import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Home, Bell, Moon, Sun, Smartphone, Mail, CreditCard, ScanLine, FileText, Eye, Trash2, Download, PieChart, TrendingUp, Shield, Plus, X, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useBills, useDeleteBill } from "@/hooks/useBills";
import { useCleanupPreview, useProcessCleanup } from "@/hooks/useCleanup";
import { useCategoryStats, useRecategorizationPreview, useRecategorizeExistingBills, useCustomCategories, useAddCustomCategory, useDeleteCustomCategory } from "@/hooks/useCategories";
import { format } from "date-fns";

// Cleanup Preview Component
function CleanupPreview({ settings }: { settings: { enabled: boolean; action: 'delete' | 'archive'; delayDays: number } }) {
  const { data: preview, isLoading } = useCleanupPreview(settings);
  const processCleanupMutation = useProcessCleanup();
  const { toast } = useToast();
  
  const handleRunCleanup = async () => {
    try {
      const result = await processCleanupMutation.mutateAsync(settings);
      toast({
        title: "Cleanup completed",
        description: `${result.processed} bills processed. ${result.archived || 0} archived, ${result.deleted || 0} deleted.`,
      });
    } catch (error) {
      toast({
        title: "Cleanup failed",
        description: "Failed to process cleanup. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!settings.enabled || isLoading) {
    return null;
  }
  
  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Cleanup Preview</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRunCleanup}
          disabled={processCleanupMutation.isPending || !preview?.count}
          data-testid="button-run-cleanup"
        >
          {processCleanupMutation.isPending ? "Processing..." : "Run Cleanup Now"}
        </Button>
      </div>
      
      {preview?.taxProtection && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">Tax Season Protection</p>
              <p className="text-blue-600 dark:text-blue-400 mt-0.5">
                {preview.taxProtection.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {preview && preview.count > 0 ? (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <span className="font-medium">{preview.count}</span> bills will be {settings.action}d
          </p>
          <p>
            Total amount: <span className="font-medium">${preview.totalAmount.toFixed(2)}</span>
          </p>
          {preview.oldestBill && (
            <p>
              Oldest bill from: <span className="font-medium">{format(new Date(preview.oldestBill), "MMM d, yyyy")}</span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No bills found for cleanup with current settings
        </p>
      )}
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: bills = [] } = useBills();
  const deleteBillMutation = useDeleteBill();
  const { user } = useAuth();
  const userId = user?.id || "";
  
  // Check if user is admin (you can modify this logic as needed)
  const isAdmin = user?.email === 'felix@debttolegacy.com' || user?.id === '47005871' || user?.firstName === 'Admin';
  const { data: categoryStats } = useCategoryStats(userId);
  const { data: recatPreview } = useRecategorizationPreview(userId);
  const recategorizeMutation = useRecategorizeExistingBills();
  const { data: customCategories = [] } = useCustomCategories(userId);
  const addCategoryMutation = useAddCustomCategory();
  const deleteCategoryMutation = useDeleteCustomCategory();
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check if dark mode was previously saved
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode ? JSON.parse(savedMode) : false;
    }
    return false;
  });
  const [autoScan, setAutoScan] = useState(true);
  const [weeklyReminders, setWeeklyReminders] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [cleanupAction, setCleanupAction] = useState<'delete' | 'archive'>('archive');
  const [cleanupDelay, setCleanupDelay] = useState(30); // days

  // Effect to apply dark mode to document and save to localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  const goToHome = () => {
    setLocation("/");
  };
  
  const handleSaveSettings = () => {
    // In a real app, this would save to backend/localStorage
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };
  
  const handleResetSettings = () => {
    setNotifications(true);
    setEmailReminders(true);
    setPushNotifications(false);
    setDarkMode(false);
    setAutoScan(true);
    setWeeklyReminders(true);
    setMonthlyReport(false);
    setAutoCleanup(true);
    setCleanupAction('archive');
    setCleanupDelay(30);
    
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
    });
  };

  const handleDeleteBill = (billId: string, companyName: string) => {
    deleteBillMutation.mutate(billId, {
      onSuccess: () => {
        toast({
          title: "Bill deleted",
          description: `Successfully deleted ${companyName} bill.`,
        });
      },
      onError: (error) => {
        console.error("Delete bill error:", error);
        toast({
          title: "Failed to delete bill",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Layout>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToHome}
              className="p-2"
              data-testid="button-back-home"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground">
                Manage your preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications" className="text-sm font-medium">
                  Enable notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive reminders about upcoming bills
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
                data-testid="switch-notifications"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-reminders" className="text-sm font-medium">
                  Email reminders
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get email notifications for bill due dates
                </p>
              </div>
              <Switch
                id="email-reminders"
                checked={emailReminders}
                onCheckedChange={setEmailReminders}
                disabled={!notifications}
                data-testid="switch-email-reminders"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications" className="text-sm font-medium">
                  Push notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
                disabled={!notifications}
                data-testid="switch-push-notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-reminders" className="text-sm font-medium">
                  Weekly reminders
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get a weekly summary of upcoming bills
                </p>
              </div>
              <Switch
                id="weekly-reminders"
                checked={weeklyReminders}
                onCheckedChange={setWeeklyReminders}
                disabled={!notifications}
                data-testid="switch-weekly-reminders"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode" className="text-sm font-medium">
                  Dark mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use dark theme for better viewing in low light
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* Scanning Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ScanLine className="h-5 w-5" />
              <span>Scanning</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-scan" className="text-sm font-medium">
                  Auto-scan documents
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically process scanned documents with AI
                </p>
              </div>
              <Switch
                id="auto-scan"
                checked={autoScan}
                onCheckedChange={setAutoScan}
                data-testid="switch-auto-scan"
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-Cleanup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Auto-Cleanup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-cleanup" className="text-sm font-medium">
                  Enable auto-cleanup
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically manage settled bills with tax season protection
                </p>
              </div>
              <Switch
                id="auto-cleanup"
                checked={autoCleanup}
                onCheckedChange={setAutoCleanup}
                data-testid="switch-auto-cleanup"
              />
            </div>
            
            {autoCleanup && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cleanup action</Label>
                    <div className="flex space-x-2">
                      <Button
                        variant={cleanupAction === 'archive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCleanupAction('archive')}
                        data-testid="button-cleanup-archive"
                      >
                        Archive
                      </Button>
                      <Button
                        variant={cleanupAction === 'delete' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCleanupAction('delete')}
                        data-testid="button-cleanup-delete"
                      >
                        Delete
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cleanupAction === 'archive' 
                        ? 'Archive keeps bills hidden but recoverable'
                        : 'Delete permanently removes bills and documents'
                      }
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Cleanup delay: {cleanupDelay} days after payment
                    </Label>
                    <div className="flex space-x-2">
                      {[7, 14, 30, 60, 90].map(days => (
                        <Button
                          key={days}
                          variant={cleanupDelay === days ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCleanupDelay(days)}
                          data-testid={`button-cleanup-delay-${days}`}
                        >
                          {days}d
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bills will be {cleanupAction === 'archive' ? 'archived' : 'deleted'} {cleanupDelay} days after being marked as paid
                    </p>
                  </div>
                  
                  <CleanupPreview
                    settings={{
                      enabled: autoCleanup,
                      action: cleanupAction,
                      delayDays: cleanupDelay
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bill Categories Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Bill Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Spending Breakdown
              </p>
              <p className="text-xs text-muted-foreground">
                View how much you spend on different types of bills
              </p>
            </div>
            
            {categoryStats ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Spending</p>
                    <p className="text-lg font-semibold text-primary">
                      ${categoryStats.totalSpending.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Categories</p>
                    <p className="text-lg font-semibold">
                      {categoryStats.categories.length}
                    </p>
                  </div>
                </div>
                
                {/* Top Categories */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Top Categories</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categoryStats.categories.slice(0, 8).map((category) => (
                      <div
                        key={category.category}
                        className="flex items-center justify-between p-2 border border-border rounded-lg"
                        data-testid={`category-item-${category.category}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {category.category}
                            </p>
                            <p className="text-sm font-semibold">
                              ${category.totalAmount.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{category.billCount} bills</span>
                            <span>Avg: ${category.averageAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Highest: </span>
                      <span className="font-medium">{categoryStats.mostExpensiveCategory}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Most Bills: </span>
                      <span className="font-medium">{categoryStats.mostFrequentCategory}</span>
                    </div>
                  </div>
                  {categoryStats.uncategorizedAmount > 0 && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                      <span className="text-yellow-700 dark:text-yellow-300">
                        ${categoryStats.uncategorizedAmount.toFixed(2)} in uncategorized bills
                      </span>
                    </div>
                  )}
                  
                  {/* Re-categorization Section */}
                  {recatPreview && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">Auto-Categorize Existing Bills</p>
                          <p className="text-xs text-muted-foreground">
                            {recatPreview.billCount === 0 
                              ? "All bills have categories assigned ✓"
                              : `${recatPreview.billCount} bills without categories found`
                            }
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const result = await recategorizeMutation.mutateAsync(userId);
                              toast({
                                title: "Re-categorization complete!",
                                description: `${result.categorized} bills categorized successfully.`,
                              });
                            } catch (error) {
                              toast({
                                title: "Re-categorization failed",
                                description: "Failed to categorize existing bills.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={recategorizeMutation.isPending || recatPreview.billCount === 0}
                          data-testid="button-recategorize-bills"
                        >
                          {recategorizeMutation.isPending 
                            ? "Processing..." 
                            : recatPreview.billCount === 0 
                            ? "All Categorized" 
                            : "Categorize Now"
                          }
                        </Button>
                      </div>
                      
                      {recatPreview.sampleBills.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground mb-1">Sample bills to categorize:</p>
                          {recatPreview.sampleBills.slice(0, 3).map((bill) => (
                            <div key={bill.id} className="text-xs p-1 bg-muted/30 rounded flex justify-between">
                              <span>{bill.company}</span>
                              <span>${parseFloat(bill.amount.toString()).toFixed(2)}</span>
                            </div>
                          ))}
                          {recatPreview.billCount > 3 && (
                            <p className="text-xs text-muted-foreground">+{recatPreview.billCount - 3} more bills</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading category data...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Categories Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Tag className="h-5 w-5" />
              <span>Custom Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Create Your Own Categories
              </p>
              <p className="text-xs text-muted-foreground">
                Add custom categories that will appear in the category dropdown when editing bills
              </p>
            </div>

            <div className="flex space-x-2">
              <Input
                placeholder="Enter category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    addCategoryMutation.mutate(
                      { userId, category: newCategoryName.trim() },
                      {
                        onSuccess: () => {
                          setNewCategoryName("");
                          toast({ title: "Category added", description: `"${newCategoryName.trim()}" has been added to your categories.` });
                        },
                        onError: (error: any) => {
                          toast({ title: "Failed to add category", description: error?.message || "Category may already exist.", variant: "destructive" });
                        },
                      }
                    );
                  }
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newCategoryName.trim()) {
                    addCategoryMutation.mutate(
                      { userId, category: newCategoryName.trim() },
                      {
                        onSuccess: () => {
                          setNewCategoryName("");
                          toast({ title: "Category added", description: `"${newCategoryName.trim()}" has been added to your categories.` });
                        },
                        onError: (error: any) => {
                          toast({ title: "Failed to add category", description: error?.message || "Category may already exist.", variant: "destructive" });
                        },
                      }
                    );
                  }
                }}
                disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {customCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{customCategories.length} custom {customCategories.length === 1 ? 'category' : 'categories'}</p>
                <div className="flex flex-wrap gap-2">
                  {customCategories.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      <span>{cat}</span>
                      <button
                        onClick={() => {
                          deleteCategoryMutation.mutate(
                            { userId, category: cat },
                            {
                              onSuccess: () => {
                                toast({ title: "Category removed", description: `"${cat}" has been removed.` });
                              },
                              onError: () => {
                                toast({ title: "Failed to remove category", variant: "destructive" });
                              },
                            }
                          );
                        }}
                        className="ml-1 hover:text-destructive transition-colors"
                        disabled={deleteCategoryMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Tag className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No custom categories yet</p>
                <p className="text-xs">Add your own categories above</p>
              </div>
            )}

            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Built-in Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {["Credit Card", "Utilities", "Internet", "Phone", "Insurance", "Rent", "Mortgage", "Subscription", "Healthcare", "Loan", "Streaming", "Other"].map((cat) => (
                  <span key={cat} className="px-2 py-1 bg-muted/50 text-muted-foreground rounded-full text-xs">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Documents & Bills</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Uploaded Documents ({bills.length})
              </p>
              <p className="text-xs text-muted-foreground">
                View and manage your scanned bills and documents
              </p>
            </div>
            
            {bills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents uploaded yet</p>
                <p className="text-xs">Use the scan feature to add bills</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                    data-testid={`document-item-${bill.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {bill.company || "Unknown Company"}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>${parseFloat(bill.amount.toString()).toFixed(2)}</span>
                          <span>•</span>
                          <span>{format((() => {
                            const dateMatch = bill.dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
                            if (dateMatch) {
                              const [, year, month, day] = dateMatch;
                              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            }
                            return new Date(bill.dueDate);
                          })(), "MMM d, yyyy")}</span>
                          {bill.seriesId && (
                            <>
                              <span>•</span>
                              <span className="text-primary">Series</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {bill.documentPath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            // In a real app, this would open/preview the document
                            toast({
                              title: "Document preview",
                              description: "Document preview feature would open here.",
                            });
                          }}
                          data-testid={`button-view-document-${bill.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBill(bill.id, bill.company)}
                        disabled={deleteBillMutation.isPending}
                        data-testid={`button-delete-document-${bill.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Total storage used: {(bills.length * 0.5).toFixed(1)} MB of 100 MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="monthly-report" className="text-sm font-medium">
                  Monthly spending report
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get a monthly summary of your bill payments
                </p>
              </div>
              <Switch
                id="monthly-report"
                checked={monthlyReport}
                onCheckedChange={setMonthlyReport}
                data-testid="switch-monthly-report"
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin Access - Only visible to admin users */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Admin Panel</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Access administrative features and system controls
              </p>
              <Button
                onClick={() => setLocation('/admin-trigger')}
                variant="outline"
                className="w-full"
                data-testid="button-admin-access"
              >
                <Shield className="h-4 w-4 mr-2" />
                Open Admin Panel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <Button
            onClick={handleSaveSettings}
            className="w-full"
            data-testid="button-save-settings"
          >
            Save Settings
          </Button>
          
          <Button
            onClick={handleResetSettings}
            variant="outline"
            className="w-full"
            data-testid="button-reset-settings"
          >
            Reset to Defaults
          </Button>
        </div>
        
        {/* App Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="text-sm font-medium">Bill Tracker App</h3>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
              <p className="text-xs text-muted-foreground">
                Manage your bills with ease using OCR and AI
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
