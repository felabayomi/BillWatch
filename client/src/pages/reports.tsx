import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AskFelix } from "@/components/AskFelix";
import { Download, DollarSign, CheckCircle, Clock, AlertTriangle, TrendingUp, CreditCard, Zap, Target } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isSameMonth } from "date-fns";
import { useBills, useBillStats } from "@/hooks/useBills";
import { Bill } from "@shared/schema";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TimeRange = "3months" | "6months" | "1year" | "all";
type ReportType = "overview" | "trends" | "categories" | "payment-tracking";

export default function Reports() {
  const { data: bills = [] } = useBills();
  const { data: billStats } = useBillStats();
  const [timeRange, setTimeRange] = useState<TimeRange>("3months");
  const [reportType, setReportType] = useState<ReportType>("overview");

  // Filter bills based on time range
  const filteredBills = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "3months":
        startDate = subMonths(now, 3);
        break;
      case "6months":
        startDate = subMonths(now, 6);
        break;
      case "1year":
        startDate = subMonths(now, 12);
        break;
      default:
        return bills;
    }

    return bills.filter(bill => 
      isWithinInterval(new Date(bill.dueDate), { start: startDate, end: now })
    );
  }, [bills, timeRange]);

  // Calculate overview metrics - use backend stats for real-time overdue calculation
  const metrics = useMemo(() => {
    // Use backend calculated total for all bills
    const total = billStats?.total || filteredBills.reduce((sum, bill) => sum + parseFloat(bill.amount.toString()), 0);
    // Use backend calculated paid amount for all bills
    const paid = billStats?.paid || filteredBills.filter(bill => bill.status === "paid").reduce((sum, bill) => sum + parseFloat(bill.amount.toString()), 0);
    // Use backend calculated upcoming amount for real-time status
    const upcoming = billStats?.upcoming || filteredBills.filter(bill => bill.status === "upcoming").reduce((sum, bill) => sum + parseFloat(bill.amount.toString()), 0);
    // Use backend calculated overdue amount for real-time status
    const overdue = billStats?.overdue || filteredBills.filter(bill => bill.status === "overdue").reduce((sum, bill) => sum + parseFloat(bill.amount.toString()), 0);
    
    const paidCount = filteredBills.filter(bill => bill.status === "paid").length;
    const totalCount = filteredBills.length;
    const paymentRate = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
    
    // Calculate actual months with data for more accurate average
    const uniqueMonths = new Set();
    filteredBills.forEach(bill => {
      const billMonth = format(new Date(bill.dueDate), 'MMM yyyy');
      uniqueMonths.add(billMonth);
    });
    const actualMonthsCount = Math.max(uniqueMonths.size, 1);
    const avgMonthlySpend = total / actualMonthsCount;

    return {
      total,
      paid,
      upcoming,
      overdue,
      paymentRate,
      avgMonthlySpend,
      totalCount
    };
  }, [filteredBills, timeRange, billStats]);

  // Calculate payment tracking metrics
  const paymentTrackingData = useMemo(() => {
    const paidBills = filteredBills.filter(bill => bill.status === "paid");
    
    // Payment method analysis
    const paymentMethods = new Map<string, { count: number; amount: number }>();
    paidBills.forEach(bill => {
      const method = bill.paymentMethod || "Not specified";
      const amount = parseFloat(bill.amount.toString());
      
      if (paymentMethods.has(method)) {
        const data = paymentMethods.get(method)!;
        data.count += 1;
        data.amount += amount;
      } else {
        paymentMethods.set(method, { count: 1, amount });
      }
    });

    // Payment type analysis
    const paymentTypes = new Map<string, { count: number; amount: number }>();
    paidBills.forEach(bill => {
      const type = bill.paymentType || "Not specified";
      const amount = parseFloat(bill.amount.toString());
      
      if (paymentTypes.has(type)) {
        const data = paymentTypes.get(type)!;
        data.count += 1;
        data.amount += amount;
      } else {
        paymentTypes.set(type, { count: 1, amount });
      }
    });

    const totalPaidBills = paidBills.length;
    const totalPaidAmount = paidBills.reduce((sum, bill) => sum + parseFloat(bill.amount.toString()), 0);
    
    // Convert to arrays for rendering
    const methodData = Array.from(paymentMethods.entries()).map(([method, data]) => ({
      method,
      ...data,
      percentage: totalPaidBills > 0 ? ((data.count / totalPaidBills) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.amount - a.amount);

    const typeData = Array.from(paymentTypes.entries()).map(([type, data]) => ({
      type,
      ...data,
      percentage: totalPaidBills > 0 ? ((data.count / totalPaidBills) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.amount - a.amount);

    // Automation rate
    const automaticPayments = paidBills.filter(bill => bill.paymentType === "automatic").length;
    const automationRate = totalPaidBills > 0 ? ((automaticPayments / totalPaidBills) * 100).toFixed(1) : "0";

    return {
      methodData,
      typeData,
      totalPaidBills,
      totalPaidAmount,
      automationRate,
      hasPaymentData: paidBills.some(bill => bill.paymentMethod || bill.paymentType)
    };
  }, [filteredBills]);

  // Prepare monthly trends data - only show months that have actual bill data
  const monthlyTrendsData = useMemo(() => {
    if (filteredBills.length === 0) return [];
    
    const monthsMap = new Map();
    
    // First, find all unique months that have bills
    const uniqueMonths = new Set();
    filteredBills.forEach(bill => {
      const billMonth = format(new Date(bill.dueDate), 'MMM yyyy');
      uniqueMonths.add(billMonth);
    });
    
    // Initialize data for each month that has bills
    uniqueMonths.forEach(monthKey => {
      monthsMap.set(monthKey, {
        month: monthKey,
        paid: 0,
        due: 0,
        paidCount: 0,
        dueCount: 0
      });
    });

    // Populate with actual bill data
    filteredBills.forEach(bill => {
      const billMonth = format(new Date(bill.dueDate), 'MMM yyyy');
      if (monthsMap.has(billMonth)) {
        const data = monthsMap.get(billMonth);
        const amount = parseFloat(bill.amount.toString());
        
        if (bill.status === "paid") {
          data.paid += amount;
          data.paidCount += 1;
        }
        data.due += amount;
        data.dueCount += 1;
      }
    });

    // Sort by date order
    return Array.from(monthsMap.values()).sort((a, b) => {
      const dateA = new Date(a.month + " 1");
      const dateB = new Date(b.month + " 1");
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredBills]);

  // Prepare category breakdown data
  const categoryData = useMemo(() => {
    const categoryMap = new Map();
    
    filteredBills.forEach(bill => {
      const category = bill.category || 'Other';
      const amount = parseFloat(bill.amount.toString());
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + amount);
      } else {
        categoryMap.set(category, amount);
      }
    });

    const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);
    
    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredBills]);

  const exportData = () => {
    // Simple CSV export for now
    const csvContent = [
      ['Company', 'Due Date', 'Amount', 'Status', 'Category'].join(','),
      ...filteredBills.map(bill => [
        bill.company,
        format(new Date(bill.dueDate), 'yyyy-MM-dd'),
        bill.amount,
        bill.status,
        bill.category || 'Other'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getPaymentRateColor = (rate: number) => {
    if (rate < 50) return "bg-red-100 text-red-700";
    if (rate < 80) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <Button onClick={exportData} className="flex items-center gap-2" data-testid="export-button">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Time Range</label>
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]" data-testid="time-range-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Report Type</label>
          <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
            <SelectTrigger className="w-[180px]" data-testid="report-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="trends">Monthly Trends</SelectItem>
              <SelectItem value="categories">Category Breakdown</SelectItem>
              <SelectItem value="payment-tracking">Payment Tracking</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Overview Cards */}
        {(reportType === "overview" || reportType === "trends") && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white shadow-sm" data-testid="total-bills-card">
              <CardContent className="p-3 text-center">
                <DollarSign className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-blue-600">${metrics.total.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Total Bills</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm" data-testid="paid-bills-card">
              <CardContent className="p-3 text-center">
                <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-green-600">${metrics.paid.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Paid</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm" data-testid="upcoming-bills-card">
              <CardContent className="p-3 text-center">
                <Clock className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-yellow-600">${metrics.upcoming.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Upcoming</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm" data-testid="overdue-bills-card">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-red-600">${metrics.overdue.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ask Felix Chat Assistant */}
        <AskFelix />

        {/* Payment Performance */}
        {reportType === "overview" && (
          <Card className="bg-white shadow-sm" data-testid="payment-performance-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Payment Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Payment Rate:</span>
                  <Badge className={getPaymentRateColor(metrics.paymentRate)} data-testid="payment-rate-badge">
                    {metrics.paymentRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Avg Monthly Spend:</span>
                  <span className="font-semibold">${metrics.avgMonthlySpend.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Total Bills:</span>
                  <span className="font-semibold">{metrics.totalCount}</span>
                </div>
              </div>
              
              {/* Insights */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {metrics.paymentRate >= 80 
                    ? "🎉 Excellent! You have a strong payment record." 
                    : metrics.paymentRate >= 50 
                    ? "⚠️ Good progress, but there's room for improvement." 
                    : "🚨 Consider setting up reminders to improve your payment rate."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trends Chart */}
        {reportType === "trends" && (
          <Card className="bg-white shadow-sm" data-testid="monthly-trends-chart">
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <p className="text-sm text-muted-foreground">Bills paid vs total bills due per month</p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, ""]} />
                    <Legend />
                    <Bar dataKey="paid" fill="#10B981" name="Paid" />
                    <Bar dataKey="due" fill="#3B82F6" name="Total Due" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Trend Insight */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  💡 Your average monthly spend is ${metrics.avgMonthlySpend.toFixed(2)} over the selected period.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown Chart */}
        {reportType === "categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white shadow-sm" data-testid="category-pie-chart">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">Spending distribution by category</p>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="amount"
                        label={({ percentage }) => `${percentage}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm" data-testid="category-details">
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between" data-testid={`category-${category.category}`}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${category.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Category Insight */}
                {categoryData.length > 0 && (
                  <div className="mt-6 p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-800">
                      📊 {categoryData[0].category} makes up {categoryData[0].percentage}% of your bills, your largest expense category.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {reportType === "payment-tracking" && (
          <div className="space-y-6">
            {!paymentTrackingData.hasPaymentData ? (
              <Card className="bg-white shadow-sm">
                <CardContent className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Payment Details Available</h3>
                  <p className="text-muted-foreground text-sm">
                    Add payment details to your paid bills using the pencil icon to see payment tracking insights.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Payment Overview Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-green-600">{paymentTrackingData.totalPaidBills}</div>
                      <div className="text-xs text-muted-foreground">Paid Bills</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-blue-600">${paymentTrackingData.totalPaidAmount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Total Paid</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 text-center">
                      <Target className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-purple-600">{paymentTrackingData.automationRate}%</div>
                      <div className="text-xs text-muted-foreground">Automation Rate</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Methods & Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Methods */}
                  <Card className="bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Methods
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Which banks/cards you use most</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {paymentTrackingData.methodData.map((method, index) => (
                          <div key={method.method} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              <span className="font-medium text-sm">{method.method}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">${method.amount.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">{method.count} bills ({method.percentage}%)</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Types */}
                  <Card className="bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Payment Types
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Manual vs Automatic breakdown</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {paymentTrackingData.typeData.map((type, index) => (
                          <div key={type.type} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${type.type === 'automatic' ? 'bg-green-500' : 'bg-orange-500'}`} />
                              <span className="font-medium text-sm capitalize">{type.type}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">${type.amount.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">{type.count} bills ({type.percentage}%)</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Automation Insight */}
                      <div className="mt-6 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-800">
                          {parseFloat(paymentTrackingData.automationRate) >= 50 
                            ? `🤖 Great! ${paymentTrackingData.automationRate}% of your payments are automated.` 
                            : `📋 Consider automating more payments. Currently only ${paymentTrackingData.automationRate}% are automatic.`
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredBills.length === 0 && (
          <Card className="bg-white shadow-sm">
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No bill data available</h3>
                <p className="text-sm">Add some bills to see your reports and analytics.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}