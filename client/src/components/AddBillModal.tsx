import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { CalendarIcon, X, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const addBillSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  amount: z.string().min(1, "Amount is required").regex(/^\d+\.?\d*$/, "Amount must be a valid number"),
  dueDate: z.date({ required_error: "Due date is required" }),
  category: z.string().optional(),
  description: z.string().optional(),
  accountNumber: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringType: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "yearly"]).optional(),
  totalInstallments: z.number().nullable().optional(),
  // Bill classification fields
  billType: z.enum(["personal", "business"]).default("personal"),
  businessName: z.string().optional(),
  // Payee address fields
  payeeName: z.string().optional(),
  payeeAddress1: z.string().optional(),
  payeeAddress2: z.string().optional(),
  payeeCity: z.string().optional(),
  payeeState: z.string().optional(),
  payeeZip: z.string().optional(),
  payeeCountry: z.string().optional(),
}).refine((data) => {
  // If bill type is business, business name is required
  if (data.billType === "business" && (!data.businessName || data.businessName.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Business name is required for business bills",
  path: ["businessName"]
});

type AddBillForm = z.infer<typeof addBillSchema>;

interface AddBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBillModal({ open, onOpenChange }: AddBillModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AddBillForm>({
    resolver: zodResolver(addBillSchema),
    defaultValues: {
      company: "",
      amount: "",
      isRecurring: false,
      billType: "personal",
      description: "",
      accountNumber: "",
      payeeName: "",
      payeeAddress1: "",
      payeeAddress2: "",
      payeeCity: "",
      payeeState: "",
      payeeZip: "",
      payeeCountry: "United States",
    },
  });

  const dueDate = watch("dueDate");
  const isRecurring = watch("isRecurring");
  const billType = watch("billType");

  const addBillMutation = useMutation({
    mutationFn: async (data: AddBillForm) => {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          company: data.company,
          amount: data.amount,
          dueDate: data.dueDate.toISOString(),
          category: data.category || "Other",
          description: data.description || "",
          accountNumber: data.accountNumber || null,
          isRecurring: data.isRecurring || false,
          recurringType: data.isRecurring ? (data.recurringType ?? "monthly") : null,
          totalInstallments: data.isRecurring ? (data.totalInstallments ?? null) : null,
          billType: data.billType || "personal",
          businessName: data.billType === "business" ? data.businessName : null,
          creditorPaymentAddress: {
            name: data.payeeName || null,
            address1: data.payeeAddress1 || null,
            address2: data.payeeAddress2 || null,
            city: data.payeeCity || null,
            state: data.payeeState || null,
            zip: data.payeeZip || null,
            country: data.payeeCountry || "United States",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate all bills queries (with any month/year params)
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/bills"
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/bills/stats"
      });
      
      toast({
        title: "Bill added successfully!",
        description: `Added ${data.company} bill for $${data.amount}`,
      });
      
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Add bill error:", error);
      toast({
        title: "Failed to add bill",
        description: error.message.includes("401") ? "Please log in again" : "Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddBillForm) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", errors);
    addBillMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="add-bill-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add Bill Manually
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              data-testid="button-close-add-bill-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name *</Label>
            <Input
              id="company"
              {...register("company")}
              placeholder="e.g., Electric Company, Amazon"
              data-testid="input-company"
            />
            {errors.company && (
              <p className="text-sm text-destructive">{errors.company.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              {...register("amount")}
              placeholder="e.g., 56.00"
              data-testid="input-amount"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  data-testid="button-due-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setValue("dueDate", date as Date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={(value) => setValue("category", value)}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
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

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number (optional)</Label>
            <Input
              id="accountNumber"
              {...register("accountNumber")}
              placeholder="e.g., ****1234"
              data-testid="input-account-number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billType">Bill Type</Label>
            <Select 
              defaultValue="personal"
              onValueChange={(value) => setValue("billType", value as "personal" | "business")}
            >
              <SelectTrigger data-testid="select-bill-type">
                <SelectValue placeholder="Select bill type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {billType === "business" && (
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                {...register("businessName")}
                placeholder="e.g., My Company LLC"
                data-testid="input-business-name"
              />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Additional notes about this bill"
              rows={3}
              data-testid="textarea-description"
            />
          </div>

          {/* Payee Address Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Payee Address (optional)</Label>
            <div className="grid grid-cols-1 gap-3 p-3 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="payeeName" className="text-xs">Company/Payee Name</Label>
                <Input
                  id="payeeName"
                  {...register("payeeName")}
                  placeholder="e.g., Electric Company"
                  data-testid="input-payee-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payeeAddress1" className="text-xs">Address Line 1</Label>
                <Input
                  id="payeeAddress1"
                  {...register("payeeAddress1")}
                  placeholder="e.g., 123 Main Street"
                  data-testid="input-payee-address1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payeeAddress2" className="text-xs">Address Line 2</Label>
                <Input
                  id="payeeAddress2"
                  {...register("payeeAddress2")}
                  placeholder="e.g., Suite 100"
                  data-testid="input-payee-address2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="payeeCity" className="text-xs">City</Label>
                  <Input
                    id="payeeCity"
                    {...register("payeeCity")}
                    placeholder="e.g., New York"
                    data-testid="input-payee-city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payeeState" className="text-xs">State</Label>
                  <Input
                    id="payeeState"
                    {...register("payeeState")}
                    placeholder="e.g., NY"
                    data-testid="input-payee-state"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="payeeZip" className="text-xs">ZIP Code</Label>
                  <Input
                    id="payeeZip"
                    {...register("payeeZip")}
                    placeholder="e.g., 10001"
                    data-testid="input-payee-zip"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payeeCountry" className="text-xs">Country</Label>
                  <Input
                    id="payeeCountry"
                    {...register("payeeCountry")}
                    placeholder="United States"
                    defaultValue="United States"
                    data-testid="input-payee-country"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setValue("isRecurring", !!checked)}
                data-testid="checkbox-recurring"
              />
              <Label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer">
                <RotateCcw className="h-4 w-4" />
                This is a recurring bill
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="recurringType">Frequency *</Label>
                  <Select onValueChange={(value) => setValue("recurringType", value as any)}>
                    <SelectTrigger data-testid="select-recurring-type">
                      <SelectValue placeholder="How often does this bill repeat?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                      <SelectItem value="biannually">Semi-annually (Every 6 months)</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalInstallments">Number of Times</Label>
                  <Select onValueChange={(value) => setValue("totalInstallments", value === "ongoing" ? null : parseInt(value))}>
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
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-add-bill"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={addBillMutation.isPending}
              data-testid="button-submit-add-bill"
            >
              {addBillMutation.isPending ? "Adding..." : "Add Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}