import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { ArrowUp, Check, ArrowRight } from "lucide-react";
import { Button } from "@income/components/ui/button";
import { Card, CardContent } from "@income/components/ui/card";
import Footer from "@income/components/footer";

interface ManifestoProps {
  onComplete: () => void;
}

export default function Manifesto({ onComplete }: ManifestoProps) {
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: (updates: any) => apiRequest('PATCH', '/api/income-lift/user', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
      onComplete();
    },
  });

  const handleComplete = () => {
    updateUserMutation.mutate({ showManifesto: false });
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-primary/10 to-primary/5 min-h-screen py-12 flex items-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-lg border border-border">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <ArrowUp className="text-primary-foreground" size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-manifesto-title">Welcome to IncomeLift</h2>
                <p className="text-sm text-muted-foreground mb-4">by Debt to Legacy LLC</p>
              
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 mb-6">
                  <h1 className="text-3xl font-bold mb-3 text-foreground">
                    Bills Don't Wait. Neither Should Your Income.
                  </h1>
                  <p className="text-xl text-muted-foreground mb-4">
                    Track it. Lift it. Grow it. One day at a time.
                  </p>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-white dark:bg-card rounded-lg p-4 shadow-lg border max-w-sm">
                      <div className="text-sm text-muted-foreground mb-2">Today's Progress</div>
                      <div className="text-2xl font-bold text-primary mb-2">$124.50</div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{width: '78%'}}></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">78% of daily goal</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <Button 
                    onClick={handleComplete}
                    variant="outline" 
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Starting..." : "Start Tracking Daily Income"}
                  </Button>
                </div>
                
                <p className="text-lg text-muted-foreground mb-6">This isn't motivation. This is math.</p>
                
                {/* Problem Statement */}
                <div className="bg-muted rounded-xl p-6 mb-6">
                  <p className="text-lg font-medium text-foreground mb-4">
                    Bills don't wait!<br />
                    <span className="text-green-600">IncomeLift</span> gives you a daily plan to track, earn, and take control.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-background rounded-lg">
                      <span className="text-green-600 text-lg">✅</span>
                      <span className="text-sm font-medium">Track every dollar</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-background rounded-lg">
                      <span className="text-yellow-600 text-lg">⚡</span>
                      <span className="text-sm font-medium">Income Earning Idea Guide</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-background rounded-lg">
                      <span className="text-blue-600 text-lg">📊</span>
                      <span className="text-sm font-medium">Progress from foundation → legacy</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <Button 
                    onClick={handleComplete}
                    variant="outline" 
                    className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Starting..." : "Start Taking Control Today"}
                  </Button>
                </div>
              </div>
              
              <div className="text-left space-y-4 mb-8">
                <h3 className="font-semibold text-lg">How It Works (3 Steps)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">1</span>
                      </div>
                      <span className="font-semibold">Track It</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Log your daily income. See what's real.</p>
                  </div>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">2</span>
                      </div>
                      <span className="font-semibold">Lift It</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Take practical actions you can do this week.</p>
                  </div>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">3</span>
                      </div>
                      <span className="font-semibold">Grow It</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Turn small wins into long-term wealth.</p>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <Button 
                    onClick={handleComplete}
                    variant="outline" 
                    className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Starting..." : "Start Your 3-Step Journey"}
                  </Button>
                </div>
                
                <div className="bg-muted rounded-lg p-4 mt-6 text-center">
                  <p className="font-medium mb-2">No speeches. No excuses. Just clear steps to lift yourself to:</p>
                  <div className="flex items-center justify-center space-x-2 text-sm flex-wrap gap-y-2">
                    <span className="level-badge stability">Stability</span>
                    <ArrowRight className="text-muted-foreground" size={16} />
                    <span className="level-badge growth">Growth</span>
                    <ArrowRight className="text-muted-foreground" size={16} />
                    <span className="level-badge legacy">Legacy</span>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <Button 
                    onClick={handleComplete}
                    variant="outline" 
                    className="border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Starting..." : "Begin Building Your Legacy"}
                  </Button>
                </div>
                
                <div className="bg-secondary rounded-lg p-4">
                  <p className="font-medium mb-2">Your pledge:</p>
                  <ul className="text-sm space-y-1">
                    <li>• I will track what I earn daily.</li>
                    <li>• I will cut what bleeds my income.</li>
                    <li>• I will act daily to grow income.</li>
                    <li>• I will steady invest to build my future.</li>
                  </ul>
                </div>
                
                <div className="text-center mb-6">
                  <Button 
                    onClick={handleComplete}
                    variant="outline" 
                    className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Starting..." : "I'm Ready to Take the Pledge"}
                  </Button>
                </div>
                
                <div className="flex items-center justify-center space-x-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🔒</span>
                    </div>
                    <span className="text-sm font-medium text-green-800">Private</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🏛️</span>
                    </div>
                    <span className="text-sm font-medium text-green-800">No bank required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">👤</span>
                    </div>
                    <span className="text-sm font-medium text-green-800">Your data stays yours</span>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <Button 
                    onClick={handleComplete}
                    variant="outline" 
                    className="border-teal-500 text-teal-600 hover:bg-teal-500 hover:text-white"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Starting..." : "Start with Complete Privacy"}
                  </Button>
                </div>

                {/* Complete Financial Suite */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-center mb-2">Complete Financial Suite</h3>
                  <p className="text-center text-muted-foreground mb-6">Explore our comprehensive range of financial tools and services</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* IncomeLift Card - Current App */}
                    <div className="block p-4 bg-green-50 rounded-lg border-2 border-green-300 shadow-md text-center">
                      <div className="text-2xl mb-2">⚡</div>
                      <h4 className="font-semibold text-green-700">IncomeLift</h4>
                      <p className="text-sm text-green-600 mt-1">Boost your income streams</p>
                      <p className="text-xs text-green-500 mt-1 font-medium">You're here!</p>
                    </div>

                    {/* SteadyVest Card */}
                    <a 
                      href="https://steadyvest.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 text-center group"
                    >
                      <div className="text-2xl mb-2">🌱</div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-green-600">SteadyVest</h4>
                      <p className="text-sm text-gray-600 mt-1">Steady growth investing</p>
                    </a>

                    {/* BillWatch Card */}
                    <a 
                      href="https://billwatch.pro" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center group"
                    >
                      <div className="text-2xl mb-2">📊</div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">BillWatch</h4>
                      <p className="text-sm text-gray-600 mt-1">Smart bill management</p>
                    </a>

                    {/* DIY Debt Card */}
                    <a 
                      href="https://diydebt.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 text-center group"
                    >
                      <div className="text-2xl mb-2">🛡️</div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-red-600">DIY Debt</h4>
                      <p className="text-sm text-gray-600 mt-1">Debt elimination strategies</p>
                    </a>

                    {/* Felix Pay Card */}
                    <a 
                      href="https://felixpay.net" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 text-center group"
                    >
                      <div className="text-2xl mb-2">💳</div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-purple-600">Felix Pay</h4>
                      <p className="text-sm text-gray-600 mt-1">Secure payment solutions</p>
                    </a>

                    {/* ExpenseWatch Card */}
                    <a 
                      href="https://expensewatch.pro/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200 text-center group"
                    >
                      <div className="text-2xl mb-2">💰</div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-orange-600">ExpenseWatch</h4>
                      <p className="text-sm text-gray-600 mt-1">Advanced expense tracking</p>
                    </a>

                    {/* FinanceWatch Card */}
                    <a 
                      href="https://financewatch.app/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-center group"
                    >
                      <div className="text-2xl mb-2">🏢</div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600">FinanceWatch</h4>
                      <p className="text-sm text-gray-600 mt-1">Complete financial overview</p>
                    </a>
                  </div>
                  
                  <div className="text-center mt-6">
                    <Button 
                      onClick={handleComplete}
                      variant="outline" 
                      className="border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? "Starting..." : "Launch Your Complete Financial System"}
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleComplete}
                className="w-full" 
                size="lg"
                disabled={updateUserMutation.isPending}
                data-testid="button-start-lifting"
              >
                {updateUserMutation.isPending ? "Starting..." : "🔵 Start Lifting"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </div>
  );
}

