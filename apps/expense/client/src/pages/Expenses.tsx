import { useState } from "react";
import { Search, User, X } from "lucide-react";
import { Button } from "@expense/components/ui/button";
import { Input } from "@expense/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@expense/components/ui/select";
import { MonthlySummary } from "@expense/components/MonthlySummary";
import { ExpenseCard } from "@expense/components/ExpenseCard";
import { DraftsSection } from "@expense/components/DraftsSection";
import { FloatingActionButton } from "@expense/components/FloatingActionButton";
import { AddExpenseModal } from "@expense/components/AddExpenseModal";
import { AddExpenseActionSheet } from "@expense/components/AddExpenseActionSheet";
import { CurrencySelector } from "@expense/components/CurrencySelector";
import { useExpenses, useCategories } from "@expense/hooks/useExpenses";
import { Scan, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { dayRangeUtc, weekRangeUtc, biweekRangeUtc, monthRangeUtc, yearRangeUtc } from "@expense/lib/timezone";

type TimePeriod = "day" | "week" | "biweek" | "month" | "year" | "all";

export default function Expenses() {
  const [, navigate] = useLocation();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);

  // Calculate date range based on selected period or specific date using Mountain Time
  const getDateRange = (period: TimePeriod, specificDate?: Date) => {
    // If a specific date is selected, use that date's range
    if (specificDate) {
      return dayRangeUtc(specificDate);
    }
    
    switch (period) {
      case "day":
        return dayRangeUtc();
      case "week":
        return weekRangeUtc();
      case "biweek":
        return biweekRangeUtc();
      case "month":
        return monthRangeUtc();
      case "year":
        return yearRangeUtc();
      default:
        return {};
    }
  };

  const dateRange = getDateRange(selectedPeriod, selectedDate);
  const categoryFilter = selectedCategory === "all" ? undefined : selectedCategory;
  const typeFilter = selectedType === "all" ? undefined : selectedType;
  const searchFilter = searchQuery.trim() || undefined;
  
  // Client-side filtering for type since backend doesn't support it yet
  const { data: allExpenses = [], isLoading } = useExpenses({ ...dateRange, category: categoryFilter, search: searchFilter });
  const expenses = typeFilter 
    ? allExpenses.filter(expense => expense.type === typeFilter)
    : allExpenses;
  
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Reset period filter when a specific date is selected
    if (date) {
      setSelectedPeriod("all");
    }
  };
  
  const handlePeriodSelect = (period: TimePeriod) => {
    setSelectedPeriod(period);
    // Clear specific date when period filter is used
    if (period !== "all") {
      setSelectedDate(undefined);
    }
  };
  const { data: categories = [] } = useCategories();

  const handleScanReceipt = () => {
    navigate("/expense/scanner");
  };

  const handleSearchToggle = () => {
    if (isSearchMode) {
      setSearchQuery("");
      setIsSearchMode(false);
    } else {
      setIsSearchMode(true);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <h1 className="text-xl font-semibold">ExpenseWatch</h1>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySelector />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0" 
              onClick={handleSearchToggle}
              data-testid="button-search"
            >
              {isSearchMode ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" data-testid="button-profile">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      {isSearchMode && (
        <div className="border-b border-border bg-card/95 backdrop-blur">
          <div className="container px-4 py-3 max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search expenses... (e.g., Netflix, pharmacy, Verizon)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              data-testid="input-search"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container px-4 py-6 max-w-md mx-auto">
        {/* Monthly Summary */}
        <MonthlySummary onDateSelect={handleDateSelect} />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6" data-testid="section-quick-actions">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto p-4 hover:bg-accent"
            onClick={handleScanReceipt}
            data-testid="button-scan-receipt"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Scan className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Scan Receipt</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto p-4 hover:bg-accent"
            onClick={() => setIsAddModalOpen(true)}
            data-testid="button-add-expense"
          >
            <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-sm font-medium">Add Expense</span>
          </Button>
        </div>

        {/* Recent Expenses */}
        <div className="space-y-4" data-testid="section-recent-expenses">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Expenses</h2>
            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-28" data-testid="select-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="personal">🏠 Personal</SelectItem>
                  <SelectItem value="business">💼 Business</SelectItem>
                  <SelectItem value="investment">📈 Investment</SelectItem>
                  <SelectItem value="loan">💰 Loan</SelectItem>
                  <SelectItem value="insurance">🛡️ Insurance</SelectItem>
                  <SelectItem value="tax">🧾 Tax</SelectItem>
                  <SelectItem value="medical">🏥 Medical</SelectItem>
                  <SelectItem value="charity">❤️ Charity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.emoji} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Total for Selected Period or Date */}
          {(selectedPeriod !== "all" || selectedDate) && (
            <div className="bg-card border rounded-lg p-4 mb-4" data-testid="dynamic-total">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selectedDate ? (
                    `${selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}'s Total`
                  ) : (
                    <>
                      {selectedPeriod === "day" && "Today's Total"}
                      {selectedPeriod === "week" && "This Week's Total"}
                      {selectedPeriod === "biweek" && "Last 2 Weeks Total"}
                      {selectedPeriod === "month" && "This Month's Total"}
                      {selectedPeriod === "year" && "This Year's Total"}
                    </>
                  )}
                </span>
                <span className="text-xl font-bold text-primary" data-testid="text-filtered-total">
                  ${expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || "0"), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Time Period Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2" data-testid="time-period-filters">
            {[
              { key: "all", label: "All" },
              { key: "day", label: "Today" },
              { key: "week", label: "Week" },
              { key: "biweek", label: "2 Weeks" },
              { key: "month", label: "Month" },
              { key: "year", label: "Year" }
            ].map((period) => (
              <Button
                key={period.key}
                variant={selectedPeriod === period.key && !selectedDate ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => handlePeriodSelect(period.key as TimePeriod)}
                data-testid={`filter-${period.key}`}
                disabled={!!selectedDate && period.key !== "all"}
              >
                {period.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.slice(0, 10).map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-expenses">
              <p>No expenses yet. Start by adding your first expense or scanning a receipt!</p>
            </div>
          )}
        </div>

        {/* Drafts Section */}
        <DraftsSection />
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => setIsActionSheetOpen(true)} />

      {/* Add Expense Action Sheet */}
      <AddExpenseActionSheet
        open={isActionSheetOpen}
        onOpenChange={setIsActionSheetOpen}
        onManualAdd={() => setIsAddModalOpen(true)}
        onScanReceipt={handleScanReceipt}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
}
