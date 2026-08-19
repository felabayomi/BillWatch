import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, CreditCard, Calendar, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useCustomCategories } from "@/hooks/useCategories";
import type { Bill } from "@shared/schema";

export function BillDetails() {
  const [match, params] = useRoute("/bills/bill/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = (user as any)?.id || "";
  const { data: customCategories = [] } = useCustomCategories(userId);
  
  if (!match || !params?.id) {
    setLocation("/bills");
    return null;
  }

  const billId = params.id;

  // Fetch bill data
  const { data: bill, isLoading, error } = useQuery<Bill>({
    queryKey: ["/api/bills", billId],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${billId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    company: "",
    accountNumber: "",
    amount: "",
    minimumPayment: "",
    dueDate: "",
    category: "",
    description: "",
    isRecurring: false,
    recurringType: "",
    totalInstallments: null as number | null,
    // Bill classification fields
    billType: "personal",
    businessName: "",
    // Address fields
    addressName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  // Initialize form when bill data loads
  useEffect(() => {
    if (bill) {
      const dueDate = new Date(bill.dueDate);
      const formattedDate = dueDate.toISOString().split('T')[0];
      
      setFormData({
        company: bill.company || "",
        accountNumber: bill.accountNumber || "",
        amount: bill.amount || "",
        minimumPayment: bill.minimumPayment || "",
        dueDate: formattedDate,
        category: bill.category || "",
        description: bill.description || "",
        isRecurring: bill.isRecurring || false,
        recurringType: bill.recurringType || "",
        totalInstallments: bill.totalInstallments || null,
        // Bill classification fields
        billType: bill.billType || "personal",
        businessName: bill.businessName || "",
        // Address from creditorPaymentAddress
        addressName: bill.creditorPaymentAddress?.name || "",
        address1: bill.creditorPaymentAddress?.address1 || "",
        address2: bill.creditorPaymentAddress?.address2 || "",
        city: bill.creditorPaymentAddress?.city || "",
        state: bill.creditorPaymentAddress?.state || "",
        zip: bill.creditorPaymentAddress?.zip || "",
        country: bill.creditorPaymentAddress?.country || "US",
      });
    }
  }, [bill]);

  // Update bill mutation
  const updateBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/bills/${billId}`, {
        company: data.company,
        accountNumber: data.accountNumber,
        amount: data.amount,
        minimumPayment: data.minimumPayment,
        dueDate: data.dueDate, // Send as string, let backend handle conversion
        category: data.category,
        description: data.description,
        isRecurring: data.isRecurring,
        recurringType: data.recurringType || null,
        billType: data.billType || "personal",
        businessName: data.billType === "business" ? data.businessName : null,
        creditorPaymentAddress: {
          name: data.addressName,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills", billId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      toast({
        title: "Bill updated",
        description: "Bill details have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating bill:", error);
      toast({
        title: "Error",
        description: "Failed to update bill details. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete bill mutation
  const deleteBillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/bills/${billId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/stats"], exact: false });
      toast({
        title: "Bill deleted",
        description: "Bill has been deleted successfully.",
      });
      setLocation("/bills");
    },
    onError: (error) => {
      console.error("Error deleting bill:", error);
      toast({
        title: "Error",
        description: "Failed to delete bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateBillMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this bill?")) {
      deleteBillMutation.mutate();
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (error || !bill) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Bill not found</h2>
            <Button onClick={() => setLocation("/bills")} data-testid="button-back-home">
              Back to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/bills")}
              className="p-2 mr-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Bill Details</h1>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteBillMutation.isPending}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateBillMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-1" />
              {updateBillMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleFieldChange("company", e.target.value)}
                    placeholder="Company name"
                    data-testid="input-company"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleFieldChange("accountNumber", e.target.value)}
                    placeholder="Account number"
                    data-testid="input-account"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billType">Bill Type</Label>
                  <Select value={formData.billType} onValueChange={(value) => handleFieldChange("billType", value)}>
                    <SelectTrigger data-testid="select-bill-type">
                      <SelectValue placeholder="Select bill type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.billType === "business" && (
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => handleFieldChange("businessName", e.target.value)}
                      placeholder="e.g., My Company LLC"
                      data-testid="input-business-name"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Total Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleFieldChange("amount", e.target.value)}
                    placeholder="0.00"
                    data-testid="input-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="minimumPayment">Minimum Payment</Label>
                  <Input
                    id="minimumPayment"
                    type="number"
                    step="0.01"
                    value={formData.minimumPayment}
                    onChange={(e) => handleFieldChange("minimumPayment", e.target.value)}
                    placeholder="0.00"
                    data-testid="input-minimum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                    data-testid="input-due-date"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleFieldChange("category", value)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {customCategories.length > 0 && (
                        <>
                          {customCategories.map((cat) => (
                            <SelectItem key={`custom-${cat}`} value={cat}>{cat}</SelectItem>
                          ))}
                          <Separator className="my-1" />
                        </>
                      )}
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Internet">Internet</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                      <SelectItem value="Rent">Rent</SelectItem>
                      <SelectItem value="Mortgage">Mortgage</SelectItem>
                      <SelectItem value="Subscription">Subscription</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Loan">Loan</SelectItem>
                      <SelectItem value="Streaming">Streaming</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  placeholder="Additional notes about this bill"
                  rows={3}
                  data-testid="input-description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recurring Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Recurring Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => {
                    handleFieldChange("isRecurring", checked);
                    if (checked && !formData.recurringType) {
                      handleFieldChange("recurringType", "monthly");
                    }
                  }}
                  data-testid="switch-recurring"
                />
                <Label htmlFor="isRecurring">This is a recurring bill</Label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recurringType">Recurring Frequency</Label>
                    <Select value={formData.recurringType} onValueChange={(value) => handleFieldChange("recurringType", value)}>
                      <SelectTrigger data-testid="select-recurring-type">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="biannually">Semi-annually</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="totalInstallments">Number of Times</Label>
                    <Select 
                      value={formData.totalInstallments?.toString() || "ongoing"} 
                      onValueChange={(value) => handleFieldChange("totalInstallments", value === "ongoing" ? null : parseInt(value))}
                    >
                      <SelectTrigger data-testid="select-total-installments">
                        <SelectValue placeholder="How many times?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">Ongoing (no end)</SelectItem>
                        <SelectItem value="2">2 times</SelectItem>
                        <SelectItem value="3">3 times</SelectItem>
                        <SelectItem value="4">4 times</SelectItem>
                        <SelectItem value="5">5 times</SelectItem>
                        <SelectItem value="6">6 times</SelectItem>
                        <SelectItem value="12">12 times</SelectItem>
                        <SelectItem value="24">24 times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mailing Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Mailing Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="addressName">Company/Contact Name</Label>
                <Input
                  id="addressName"
                  value={formData.addressName}
                  onChange={(e) => handleFieldChange("addressName", e.target.value)}
                  placeholder="Company or contact name"
                  data-testid="input-address-name"
                />
              </div>

              <div>
                <Label htmlFor="address1">Address Line 1</Label>
                <Input
                  id="address1"
                  value={formData.address1}
                  onChange={(e) => handleFieldChange("address1", e.target.value)}
                  placeholder="Street address"
                  data-testid="input-address1"
                />
              </div>

              <div>
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => handleFieldChange("address2", e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                  data-testid="input-address2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleFieldChange("city", e.target.value)}
                    placeholder="City"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleFieldChange("state", e.target.value)}
                    placeholder="State"
                    data-testid="input-state"
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => handleFieldChange("zip", e.target.value)}
                    placeholder="ZIP"
                    data-testid="input-zip"
                    onFocus={(e) => {
                      // Aggressive scroll for mobile keyboard
                      setTimeout(() => {
                        // First try scrolling the field to top
                        e.target.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'start',
                          inline: 'nearest'
                        });
                        
                        // Then scroll the whole window up more
                        setTimeout(() => {
                          window.scrollBy({
                            top: -150,
                            behavior: 'smooth'
                          });
                        }, 100);
                      }, 300);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Save Button for mobile convenience */}
          <div className="sticky bottom-20 sm:bottom-4 z-[60] flex justify-end">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border p-3">
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/bills")}
                  data-testid="button-back-bottom"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateBillMutation.isPending}
                  data-testid="button-save-bottom"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateBillMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
