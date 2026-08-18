import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@finance/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Input } from "@finance/components/ui/input";
import { useToast } from "@finance/hooks/use-toast";
import { apiRequest, queryClient } from "@finance/lib/queryClient";
import { type Business } from "@finance-shared/schema";
import { Building2, Trash2, Plus } from "lucide-react";

export default function Businesses() {
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  const { data: businesses = [], isLoading } = useQuery<Business[]>({
    queryKey: ["/api/finance/businesses"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/finance/businesses", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/businesses"] });
      setNewName("");
      toast({ title: "Success", description: "Business created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create business", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/finance/businesses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/businesses"] });
      toast({ title: "Success", description: "Business deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete business", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createMutation.mutate(newName.trim());
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
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Businesses
        </h2>
        <p className="text-muted-foreground">Manage your businesses for expense tracking</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Enter business name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={createMutation.isPending}
            />
            <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
              {createMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Businesses ({businesses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No businesses yet. Add one above to get started.
            </p>
          ) : (
            <div className="grid gap-2">
              {businesses.map((business) => (
                <div
                  key={business.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{business.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(business.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
