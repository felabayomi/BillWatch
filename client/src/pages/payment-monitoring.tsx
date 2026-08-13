import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Mail, Truck, AlertCircle, DollarSign, Activity, BarChart3, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/BottomNavigation";

interface PaymentStatus {
  billId: string;
  company: string;
  amount: string;
  paymentMethod: string;
  billcomPaymentId: string | null;
  billcomInvoiceId: string | null;
  status: 'pending' | 'processing' | 'mailed' | 'transmitted' | 'delivered' | 'completed' | 'error';
  estimatedDelivery: string;
  paidDate: string;
  daysSincePaid: number;
  error?: string;
}

interface PaymentSummary {
  total: number;
  processing: number;
  mailed: number;
  delivered: number;
  completed: number;
  errors: number;
}

interface PaymentStatusResponse {
  success: boolean;
  payments: PaymentStatus[];
  summary: PaymentSummary;
  error?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'processing': return <Clock className="h-4 w-4" />;
    case 'mailed': return <Activity className="h-4 w-4" />; // Bank transfer in progress
    case 'transmitted': return <Activity className="h-4 w-4" />;
    case 'delivered': return <CheckCircle2 className="h-4 w-4" />; // Bank transfer delivered
    case 'completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'error': return <AlertCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'mailed': return 'bg-purple-100 text-purple-800'; // Transfer in progress
    case 'transmitted': return 'bg-indigo-100 text-indigo-800';
    case 'delivered': return 'bg-green-100 text-green-800'; // Transfer completed
    case 'completed': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const PaymentStatusCard = ({ payment, onRetryPayout }: { 
  payment: PaymentStatus; 
  onRetryPayout?: (billId: string) => void; 
}) => (
  <Card className="mb-4">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon(payment.status)}
            <div>
              <h3 className="font-semibold">{payment.company}</h3>
              <p className="text-sm text-muted-foreground">
                ${parseFloat(payment.amount.toString()).toFixed(2)} • {payment.paymentMethod?.toUpperCase() || 'Bank Transfer'}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge className={getStatusColor(payment.status)}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {payment.estimatedDelivery}
          </p>
        </div>
      </div>
      {payment.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error: {payment.error}
          {payment.status === 'error' && onRetryPayout && (
            <Button 
              onClick={() => onRetryPayout(payment.billId)}
              size="sm" 
              className="ml-2 h-6 text-xs"
              data-testid={`retry-payout-${payment.billId}`}
            >
              Send Now
            </Button>
          )}
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        Paid: {new Date(payment.paidDate).toLocaleDateString()} • {payment.daysSincePaid} days ago
      </div>
    </CardContent>
  </Card>
);

export default function PaymentMonitoring() {
  const { isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  if (!isAuthenticated) {
    return null;
  }
  const { toast } = useToast();
  
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/billcom/payments/status'],
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always treat as stale to force refetch
  });
  

  // Handle retry payout for pending payments
  const handleRetryPayout = async (billId: string) => {
    try {
      const response = await apiRequest("POST", `/api/billcom/payments/retry/${billId}`);
      
      const result = await response.json();
      
      toast({
        title: "Payment Retry Successful!",
        description: result.message || "Payment has been resubmitted to BILL.com and will be processed.",
      });
      
      // Refresh the data to show updated status
      await refetch();
    } catch (error: any) {
      console.error("Error retrying BILL.com payment:", error);
      
      toast({
        title: "Payment Retry Failed",
        description: error.message || "Failed to retry payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Enhanced refresh function with loading feedback
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
      toast({
        title: "Refreshed",
        description: "Payment data updated successfully",
      });
      console.log('✅ Payment monitoring refreshed successfully');
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not update payment data",
        variant: "destructive",
      });
      console.error('❌ Payment monitoring refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const response = data as PaymentStatusResponse | undefined;
  const paymentsData: PaymentStatus[] = response?.payments || [];
  const summary: PaymentSummary = response?.summary || { total: 0, processing: 0, mailed: 0, delivered: 0, completed: 0, errors: 0 };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Payment Status</h1>
          <p className="text-muted-foreground mb-4">
            Could not fetch payment monitoring data.
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payment Monitoring</h1>
            <p className="text-muted-foreground">Track your BILL.com payments in real-time</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{summary.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{summary.mailed}</p>
                <p className="text-xs text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{summary.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{summary.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading payment status...</p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
            <TabsTrigger value="processing">Processing ({summary.processing})</TabsTrigger>
            <TabsTrigger value="mailed">Mailed ({summary.mailed})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({summary.delivered})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({summary.completed})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            {paymentsData.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payments Yet</h3>
                    <p className="text-muted-foreground">
                      Bills paid through BILL.com will appear here for tracking.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div>
                {paymentsData.map((payment: PaymentStatus) => (
                  <PaymentStatusCard key={payment.billId} payment={payment} onRetryPayout={handleRetryPayout} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {['processing', 'mailed', 'delivered', 'completed'].map((status) => (
            <TabsContent key={status} value={status} className="mt-6">
              <div>
                {paymentsData
                  .filter((payment: PaymentStatus) => payment.status === status)
                  .map((payment: PaymentStatus) => (
                    <PaymentStatusCard key={payment.billId} payment={payment} onRetryPayout={handleRetryPayout} />
                  ))}
                {paymentsData.filter((payment: PaymentStatus) => payment.status === status).length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          No payments with "{status}" status.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      </div>
      <BottomNavigation />
    </>
  );
}