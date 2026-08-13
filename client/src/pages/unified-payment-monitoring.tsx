import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, CheckCircle2, Clock, Mail, Target, AlertCircle, DollarSign, Activity, BarChart3, RefreshCw, CreditCard, Building, ArrowRight } from "lucide-react";
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

interface FlowStage {
  name: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
  icon: React.ReactNode;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'processing': return <Clock className="h-4 w-4" />;
    case 'mailed': return <Activity className="h-4 w-4" />;
    case 'transmitted': return <Activity className="h-4 w-4" />;
    case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'error': return <AlertCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'mailed': return 'bg-purple-100 text-purple-800';
    case 'transmitted': return 'bg-indigo-100 text-indigo-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStageIcon = (stage: string, status: string) => {
  let IconComponent;
  
  switch (stage.toLowerCase()) {
    case 'invoice created':
      IconComponent = Mail;
      break;
    case 'customer payment':
      IconComponent = CreditCard;
      break;
    case 'bill.com processing':
      IconComponent = Building;
      break;
    case 'payment to creditor':
      IconComponent = Target;
      break;
    case 'payment completed':
      IconComponent = CheckCircle2;
      break;
    default:
      IconComponent = Clock;
  }
  
  return (
    <div className={`p-2 rounded-full ${
      status === 'completed' ? 'bg-green-100 text-green-600' :
      status === 'current' ? 'bg-blue-100 text-blue-600' :
      'bg-gray-100 text-gray-400'
    }`}>
      <IconComponent className="h-4 w-4" />
    </div>
  );
};

const ExpandablePaymentCard = ({ 
  payment, 
  billData, 
  onRetryPayout 
}: { 
  payment: PaymentStatus; 
  billData: any;
  onRetryPayout?: (billId: string) => void; 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Create flow stages for this payment
  const stages: FlowStage[] = [
    {
      name: 'Invoice Created',
      description: `BILL.com invoice generated for ${payment.company}`,
      status: 'completed',
      timestamp: billData?.paidDate || billData?.createdAt,
      icon: <Mail className="h-4 w-4" />
    },
    {
      name: 'Customer Payment',
      description: payment.status === 'processing' ? 'Awaiting customer payment' : `$${parseFloat(payment.amount.toString()).toFixed(2)} received from customer`,
      status: payment.status === 'processing' ? 'current' : 'completed',
      timestamp: payment.status === 'processing' ? undefined : payment.paidDate,
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      name: 'BILL.com Processing',
      description: payment.status === 'error' ? 'Payment processing failed - retry available' : 'Payment processed by BILL.com',
      status: payment.status === 'error' ? 'current' : 
              payment.status === 'completed' ? 'completed' : 
              payment.status === 'processing' ? 'pending' : 'current',
      timestamp: payment.status === 'completed' ? payment.paidDate : undefined,
      icon: <Building className="h-4 w-4" />
    },
    {
      name: 'Payment to Creditor',
      description: payment.status === 'mailed' ? `Payment sent via ${payment.paymentMethod || 'ACH'}` : 
                  payment.status === 'completed' ? `Payment delivered to ${payment.company}` :
                  'Preparing payment to creditor',
      status: payment.status === 'completed' ? 'completed' :
              payment.status === 'mailed' || payment.status === 'delivered' ? 'current' : 'pending',
      timestamp: payment.status === 'mailed' ? payment.paidDate : undefined,
      icon: <Target className="h-4 w-4" />
    },
    {
      name: 'Payment Completed',
      description: payment.status === 'completed' ? `${payment.company} received payment` : 'Awaiting confirmation',
      status: payment.status === 'completed' ? 'completed' : 'pending',
      timestamp: payment.status === 'completed' ? payment.paidDate : undefined,
      icon: <CheckCircle2 className="h-4 w-4" />
    }
  ];

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const overallProgress = Math.round((completedStages / stages.length) * 100);

  return (
    <Card className="mb-4" data-testid={`payment-card-${payment.billId}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
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
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {payment.estimatedDelivery}
                  </p>
                </div>
                {isExpanded ? 
                  <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </div>
            <div className="mt-2">
              <Progress value={overallProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {overallProgress}% Complete • Paid: {new Date(payment.paidDate).toLocaleDateString()} • {payment.daysSincePaid} days ago
              </p>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {payment.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                Error: {payment.error}
                {payment.status === 'error' && onRetryPayout && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryPayout(payment.billId);
                    }}
                    size="sm" 
                    className="ml-2 h-6 text-xs"
                    data-testid={`retry-payout-${payment.billId}`}
                  >
                    Send Now
                  </Button>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Payment Flow Progress</h4>
              {stages.map((stage, index) => (
                <div key={index} className="flex items-center space-x-4">
                  {getStageIcon(stage.name, stage.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium text-sm ${
                        stage.status === 'completed' ? 'text-green-700' :
                        stage.status === 'current' ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {stage.name}
                      </h4>
                      {stage.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(stage.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${
                      stage.status === 'completed' ? 'text-green-600' :
                      stage.status === 'current' ? 'text-blue-600' :
                      'text-gray-400'
                    }`}>
                      {stage.description}
                    </p>
                  </div>
                  {index < stages.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default function UnifiedPaymentMonitoring() {
  const { isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  if (!isAuthenticated) {
    return null;
  }

  const { data: paymentsData, isLoading: isLoadingPayments, refetch: refetchPayments, error: paymentsError } = useQuery({
    queryKey: ['/api/billcom/payments/status'],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: billsData, refetch: refetchBills } = useQuery({
    queryKey: ['/api/bills'],
    staleTime: 0,
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
      
      await refetchPayments();
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
      
      // Invalidate queries first to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/billcom/payments/status'] });
      
      // Then refetch both
      await Promise.all([refetchBills(), refetchPayments()]);
      
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

  const response = paymentsData as PaymentStatusResponse | undefined;
  const paymentsArray: PaymentStatus[] = response?.payments || [];
  const summary: PaymentSummary = response?.summary || { total: 0, processing: 0, mailed: 0, delivered: 0, completed: 0, errors: 0 };
  const billsArray = Array.isArray(billsData) ? billsData : [];

  if (paymentsError) {
    return (
      <>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Error Loading Payment Status</h1>
            <p className="text-muted-foreground mb-4">
              Could not fetch payment monitoring data.
            </p>
            <Button onClick={() => refetchPayments()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payment Monitor</h1>
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
                  <p className="text-xs text-muted-foreground">Mailed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
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

        {/* Payment Cards */}
        <div className="space-y-4">
          {isLoadingPayments ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading payment data...</p>
            </div>
          ) : paymentsArray.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payments Found</h3>
              <p className="text-muted-foreground">
                No BILL.com payments to monitor yet. Your payments will appear here once processed.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Active Payments</h2>
                <p className="text-sm text-muted-foreground">
                  Click any payment to view detailed progress
                </p>
              </div>
              {paymentsArray.map((payment) => {
                const billData = billsArray.find((bill: any) => bill.id === payment.billId);
                return (
                  <ExpandablePaymentCard
                    key={payment.billId}
                    payment={payment}
                    billData={billData}
                    onRetryPayout={handleRetryPayout}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
      <BottomNavigation />
    </>
  );
}