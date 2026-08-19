import { useState } from "react";
import { Button } from "@expense/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@expense/components/ui/card";
import { Label } from "@expense/components/ui/label";
import { Switch } from "@expense/components/ui/switch";
import { Separator } from "@expense/components/ui/separator";
import { Badge } from "@expense/components/ui/badge";
import { Input } from "@expense/components/ui/input";
import { useAuth } from "@expense/hooks/useAuth";
import { syncManager } from "@expense/lib/sync";
import { useToast } from "@expense/hooks/use-toast";
import { useBudget, useSetBudget, useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@expense/hooks/useExpenses";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@expense/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@expense/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Category, InsertCategory } from "@expense-shared/schema";
import { insertCategorySchema } from "@expense-shared/schema";
import {
  User,
  Bell,
  Download,
  Upload,
  Trash2,
  LogOut,
  Settings as SettingsIcon,
  Smartphone,
  Shield,
  Database,
  DollarSign,
  Plus,
  Edit2,
  Tags
} from "lucide-react";

// Use shared category schema for consistent validation
type CategoryFormData = z.infer<typeof insertCategorySchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Budget settings
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const { data: currentBudget } = useBudget(currentMonth, currentYear);
  const setBudgetMutation = useSetBudget();
  const [budgetAmount, setBudgetAmount] = useState("");

  // Category management
  const { data: categories } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      label: "",
      emoji: "",
      color: "#3b82f6",
    },
  });

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      window.location.href = "/api/logout";
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const success = await syncManager.sync();
      if (success) {
        toast({
          title: "Sync Complete",
          description: "Your data has been synchronized successfully",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to synchronize data. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "An error occurred during synchronization",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export will be available shortly",
    });
    // TODO: Implement data export functionality
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleBudgetSubmit = () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setBudgetMutation.mutate({
      amount: amount.toString(),
      month: currentMonth.toString().padStart(2, '0'),
      year: currentYear.toString(),
    });
    
    setBudgetAmount("");
  };

  // Category handlers
  const handleCreateCategory = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data, {
      onSuccess: () => {
        setIsAddCategoryOpen(false);
        categoryForm.reset();
      },
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.setValue("name", category.name);
    categoryForm.setValue("label", category.label);
    categoryForm.setValue("emoji", category.emoji);
    categoryForm.setValue(
      "color",
      category.color?.startsWith("#") ? category.color : "#3b82f6",
    );
  };

  const handleUpdateCategory = (data: CategoryFormData) => {
    if (!editingCategory) return;
    
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      category: data,
    }, {
      onSuccess: () => {
        setEditingCategory(null);
        categoryForm.reset();
      },
    });
  };

  const handleDeleteCategory = (category: Category) => {
    if (confirm(`Are you sure you want to delete the category "${category.name}"? This action cannot be undone.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleCloseCategoryDialog = () => {
    setIsAddCategoryOpen(false);
    setEditingCategory(null);
    categoryForm.reset();
  };

  const lastSyncTime = syncManager.getLastSyncTime();
  const hasPendingChanges = syncManager.hasPendingChanges();

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-md mx-auto space-y-6">
        {/* User Profile */}
        <Card data-testid="card-profile">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                  data-testid="img-profile"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium" data-testid="text-user-name">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"
                  }
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {user?.email || "No email"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card data-testid="card-app-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications" className="text-sm font-medium">
                  Push Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about spending and bill reminders
                </p>
              </div>
              <Switch
                id="notifications"
                checked={isNotificationsEnabled}
                onCheckedChange={setIsNotificationsEnabled}
                data-testid="switch-notifications"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync" className="text-sm font-medium">
                  Auto Sync
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync data when online
                </p>
              </div>
              <Switch
                id="sync"
                checked={isSyncEnabled}
                onCheckedChange={setIsSyncEnabled}
                data-testid="switch-sync"
              />
            </div>
          </CardContent>
        </Card>

        {/* Budget Settings */}
        <Card data-testid="card-budget-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Budget Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Monthly Budget for {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Label>
              <p className="text-xs text-muted-foreground">
                Set your spending limit for the current month
              </p>
              {currentBudget && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    Current budget: <span className="font-semibold text-primary">${parseFloat(currentBudget.amount).toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  placeholder="Enter budget amount"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="pl-6"
                  min="0"
                  step="0.01"
                  data-testid="input-budget-amount"
                />
                <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <Button
                onClick={handleBudgetSubmit}
                disabled={setBudgetMutation.isPending || !budgetAmount}
                size="default"
                data-testid="button-set-budget"
              >
                {setBudgetMutation.isPending ? "Saving..." : currentBudget ? "Update" : "Set Budget"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              This budget will be used to track your spending progress and send notifications when you approach your limit.
            </p>
          </CardContent>
        </Card>

        {/* Category Management */}
        <Card data-testid="card-category-management">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5" />
              Category Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Custom Categories
              </Label>
              <p className="text-xs text-muted-foreground">
                Create and manage your own expense categories
              </p>
            </div>

            {/* Category List */}
            <div className="space-y-2">
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  data-testid={`category-item-${category.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" data-testid={`category-emoji-${category.id}`}>
                        {category.emoji}
                      </span>
                      <p className="font-medium text-sm" data-testid={`category-label-${category.id}`}>
                        {category.label}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid={`category-name-${category.id}`}>
                      ID: {category.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-category-${category.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {categories?.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No custom categories yet</p>
                  <p className="text-xs text-muted-foreground">Create your first category to get started</p>
                </div>
              )}
            </div>

            {/* Add Category Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryOpen(true)}
              className="w-full"
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>

            <Dialog
              open={isAddCategoryOpen || !!editingCategory}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseCategoryDialog();
                }
              }}
            >
              <DialogContent
                className="
                  w-[calc(100vw-1.5rem)]
                  max-w-md
                  max-h-[calc(100dvh-2rem)]
                  overflow-y-auto
                  overscroll-contain
                  p-4
                  sm:p-6
                "
              >
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "Add New Category"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...categoryForm}>
                  <form 
                    onSubmit={categoryForm.handleSubmit(editingCategory ? handleUpdateCategory : handleCreateCategory)}
                    className="space-y-4"
                  >
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., travel, entertainment (lowercase, no spaces)"
                              {...field}
                              data-testid="input-category-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={categoryForm.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Label</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Travel, Entertainment"
                              {...field}
                              data-testid="input-category-label"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={categoryForm.control}
                      name="emoji"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emoji</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                                placeholder="Selected emoji will appear here"
                                {...field}
                                data-testid="input-category-emoji"
                                maxLength={10}
                                readOnly
                              />
                              <div
                                className="
                                  grid
                                  grid-cols-6
                                  sm:grid-cols-8
                                  gap-2
                                  p-2
                                  border
                                  rounded-md
                                  bg-muted/30
                                  max-h-44
                                  overflow-y-auto
                                  overscroll-contain
                                "
                              >
                                {[
                                  "🏠", "🚗", "🍔", "🛍️", "✈️", "🎬", "📚", "💊", 
                                  "⚡", "💰", "🎁", "🧴", "🎨", "📱", "🏥", "🧪",
                                  "🍕", "☕", "🎵", "💻", "🌱", "🔧", "🎯", "📦",
                                  "🚀", "🌟", "💎", "🎪", "🎭", "🏆", "🎈", "🎂"
                                ].map((emoji) => (
                                  <Button
                                    key={emoji}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-full min-w-0 p-0 text-lg hover:bg-primary/10"
                                    onClick={() => field.onChange(emoji)}
                                    data-testid={`emoji-${emoji}`}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Click an emoji above or type/paste your own
                              </p>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={categoryForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input
                              type="color"
                              {...field}
                              data-testid="input-category-color"
                              className="w-full h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background px-4 pb-1 pt-4 sm:-mx-6 sm:px-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseCategoryDialog}
                        className="flex-1"
                        data-testid="button-cancel-category"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                        className="flex-1"
                        data-testid="button-save-category"
                      >
                        {(createCategoryMutation.isPending || updateCategoryMutation.isPending) 
                          ? "Saving..." 
                          : editingCategory ? "Update" : "Create"
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card data-testid="card-data-management">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sync Status</span>
                <div className="flex items-center gap-2">
                  {hasPendingChanges && (
                    <Badge variant="secondary" className="text-xs">
                      Pending Changes
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {navigator.onLine ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Last sync: {lastSyncTime ? lastSyncTime.toLocaleString() : "Never"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || !navigator.onLine}
                className="w-full"
                data-testid="button-sync"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>

            <Separator />

            {/* Export Data */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="w-full"
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>

            <Separator />

            {/* Clear Local Data */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearData}
              className="w-full text-destructive hover:text-destructive"
              data-testid="button-clear-data"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Local Data
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card data-testid="card-security">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your data is secured with industry-standard encryption and authentication.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card data-testid="card-app-info">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">ExpenseWatch</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
              <p className="text-xs text-muted-foreground">
                Built with ❤️ for modern expense tracking
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
