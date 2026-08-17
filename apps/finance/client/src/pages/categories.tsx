import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Category, insertCategorySchema } from "@shared/schema";
import { Plus, Edit, Trash2, Home, Tag } from "lucide-react";
import { Link } from "wouter";

// Form-specific schema that only includes fields present in the UI
const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  kind: z.enum(["expense", "income", "bill", "debt", "transfer", "adjustment", "investment"]),
});
type CategoryFormData = z.infer<typeof categoryFormSchema>;

export default function Categories() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCreateForm(false);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      return await apiRequest("PUT", `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      toast({
        title: "Success", 
        description: "Category updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  // Group categories by kind and sort alphabetically
  const groupedCategories = {
    expense: categories.filter(cat => cat.kind === 'expense').sort((a, b) => a.name.localeCompare(b.name)),
    income: categories.filter(cat => cat.kind === 'income').sort((a, b) => a.name.localeCompare(b.name)),
    bill: categories.filter(cat => cat.kind === 'bill').sort((a, b) => a.name.localeCompare(b.name)),
    other: categories.filter(cat => !['expense', 'income', 'bill'].includes(cat.kind)).sort((a, b) => a.name.localeCompare(b.name)),
  };

  const getBadgeVariant = (kind: string) => {
    switch (kind) {
      case 'expense': return 'destructive';
      case 'income': return 'default';
      case 'bill': return 'secondary';
      default: return 'outline';
    }
  };

  const getBadgeColor = (kind: string) => {
    switch (kind) {
      case 'expense': return 'bg-red-100 text-red-700';
      case 'income': return 'bg-green-100 text-green-700'; 
      case 'bill': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Category Management</h2>
          <p className="text-muted-foreground">Manage categories for expenses, bills, and income</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-home">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="button-create-category">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSubmit={(data) => createCategoryMutation.mutate(data)}
                isLoading={createCategoryMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Groups */}
      <div className="grid gap-6">
        {/* Expense Categories */}
        <CategoryGroup
          title="Expense Categories"
          categories={groupedCategories.expense}
          kind="expense"
          onEdit={setEditingCategory}
          onDelete={(id) => deleteCategoryMutation.mutate(id)}
          isDeleting={deleteCategoryMutation.isPending}
        />

        {/* Income Categories */}
        <CategoryGroup
          title="Income Categories"
          categories={groupedCategories.income}
          kind="income"
          onEdit={setEditingCategory}
          onDelete={(id) => deleteCategoryMutation.mutate(id)}
          isDeleting={deleteCategoryMutation.isPending}
        />

        {/* Bill Categories */}
        <CategoryGroup
          title="Bill Categories"
          categories={groupedCategories.bill}
          kind="bill"
          onEdit={setEditingCategory}
          onDelete={(id) => deleteCategoryMutation.mutate(id)}
          isDeleting={deleteCategoryMutation.isPending}
        />

        {/* Other Categories */}
        {groupedCategories.other.length > 0 && (
          <CategoryGroup
            title="Other Categories"
            categories={groupedCategories.other}
            kind="other"
            onEdit={setEditingCategory}
            onDelete={(id) => deleteCategoryMutation.mutate(id)}
            isDeleting={deleteCategoryMutation.isPending}
          />
        )}
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              defaultValues={{ name: editingCategory.name, kind: editingCategory.kind as "expense" | "income" | "bill" | "debt" | "transfer" | "adjustment" | "investment" }}
              onSubmit={(data) => updateCategoryMutation.mutate({ id: editingCategory.id, data })}
              isLoading={updateCategoryMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CategoryGroupProps {
  title: string;
  categories: Category[];
  kind: string;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function CategoryGroup({ title, categories, kind, onEdit, onDelete, isDeleting }: CategoryGroupProps) {
  const getBadgeColor = (kind: string) => {
    switch (kind) {
      case 'expense': return 'bg-red-100 text-red-700';
      case 'income': return 'bg-green-100 text-green-700'; 
      case 'bill': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {title} ({categories.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No {kind} categories yet. Create one to get started.
          </p>
        ) : (
          <div className="grid gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                data-testid={`category-${category.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <Badge className={`text-xs ${getBadgeColor(category.kind)}`}>
                    {category.kind}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(category)}
                    data-testid={`button-edit-${category.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        data-testid={`button-delete-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{category.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(category.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CategoryFormProps {
  defaultValues?: Partial<CategoryFormData>;
  onSubmit: (data: CategoryFormData) => void;
  isLoading: boolean;
}

function CategoryForm({ defaultValues, onSubmit, isLoading }: CategoryFormProps) {
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      kind: defaultValues?.kind || "expense",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter category name..."
                  {...field}
                  data-testid="input-category-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category-kind">
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="bill">Bill</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit-category"
          >
            {isLoading ? "Saving..." : defaultValues ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}