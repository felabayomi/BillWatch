import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { ArrowLeft, Target, Calculator, TrendingUp, Users } from "lucide-react";

export default function AboutPage() {
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const skipManifestoMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', '/api/income-lift/user', { showManifesto: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/user'] });
    },
  });

  const handleStartJourney = () => {
    skipManifestoMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <a href="/income" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors mr-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">About <span className="text-green-600">IncomeLift</span></h1>
            <p className="text-sm text-gray-500 mt-1">by Debt to Legacy LLC</p>
          </div>
        </div>

        {/* Mission Statement */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Bills Don't Wait!</h2>
              <h2 className="text-2xl font-bold mb-4">Neither should Income!</h2>
            </div>
            <p className="text-lg text-gray-700 text-center mb-6">
              IncomeLift cuts through the noise to give you what actually works: 
              daily tracking, clear actions, and measurable progress toward financial independence.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-800 font-medium">
                "Bills don't wait. Neither should your income."
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                No-Nonsense Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We skip the motivational speeches and focus on practical actions. 
                Every feature is designed to close the gap between your bills and your income.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                Math-Based Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Track real numbers, see real progress. Our system shows you exactly 
                where you stand and what actions will move you forward fastest.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                Daily Action Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Small daily actions compound into major financial wins. 
                We make it easy to track income and spot quick cash opportunities every day.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-red-600" />
                Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your financial data stays yours. No bank connections required, 
                no data selling, no privacy compromises. Simple, secure, private.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* The System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">How IncomeLift Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold mb-2">Track It</h3>
                <p className="text-sm text-gray-600">
                  Log every dollar you earn daily. See patterns, identify trends, know exactly where you stand.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold mb-2">Lift It</h3>
                <p className="text-sm text-gray-600">
                  Get personalized quick cash suggestions based on your time, skills, and resources.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold mb-2">Grow It</h3>
                <p className="text-sm text-gray-600">
                  Build from Stability to Growth to Legacy with clear milestones and actionable next steps.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Branding Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">About Debt to Legacy LLC</h3>
              <div className="max-w-4xl mx-auto">
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Debt to Legacy is a personal finance and debt management consulting business that equips 
                  individuals with practical tools to regain control of their money, eliminate debt, and build 
                  lasting wealth. Through comprehensive solutions, we guide clients step by step from financial 
                  struggle to financial freedom and legacy building.
                </p>
                <Button 
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer">
                    Learn More About Debt to Legacy LLC
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Financial Suite */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Complete Financial Suite</h3>
              <p className="text-lg text-gray-600">
                Explore our comprehensive range of financial tools and services
              </p>
            </div>
           
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {/* IncomeLift Card - Current */}
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
                <div className="text-2xl mb-3">⚡</div>
                <h4 className="text-lg font-bold text-green-800 mb-2">IncomeLift</h4>
                <p className="text-green-600 mb-2">Boost your income streams</p>
                <p className="text-sm text-green-500 font-medium">You're here!</p>
              </div>

              {/* SteadyVest Card */}
              <a 
                href="https://steadyvest.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-green-300 group"
              >
                <div className="text-2xl mb-3">🌱</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-green-600 mb-2 transition-colors">SteadyVest</h4>
                <p className="text-gray-600 group-hover:text-green-600 transition-colors">Steady growth investing</p>
              </a>

              {/* BillWatch Card */}
              <a 
                href="https://billwatch.pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-blue-300 group"
              >
                <div className="text-2xl mb-3">📊</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 mb-2 transition-colors">BillWatch</h4>
                <p className="text-gray-600 group-hover:text-blue-600 transition-colors">Smart bill management</p>
              </a>

              {/* DIY Debt Card */}
              <a 
                href="https://diydebt.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-red-300 group"
              >
                <div className="text-2xl mb-3">🛡️</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-red-600 mb-2 transition-colors">DIY Debt</h4>
                <p className="text-gray-600 group-hover:text-red-600 transition-colors">Debt elimination strategies</p>
              </a>

              {/* Felix Pay Card */}
              <a 
                href="https://felixpay.net" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-purple-300 group"
              >
                <div className="text-2xl mb-3">💳</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 mb-2 transition-colors">Felix Pay</h4>
                <p className="text-gray-600 group-hover:text-purple-600 transition-colors">Secure payment solutions</p>
              </a>

              {/* ExpenseWatch Card */}
              <a 
                href="https://expensewatch.pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-teal-300 group"
              >
                <div className="text-2xl mb-3">🧾</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-teal-600 mb-2 transition-colors">ExpenseWatch</h4>
                <p className="text-gray-600 group-hover:text-teal-600 transition-colors">Advanced expense tracking</p>
              </a>

              {/* FinanceWatch Card */}
              <a 
                href="https://financewatch.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-indigo-300 group"
              >
                <div className="text-2xl mb-3">📈</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 mb-2 transition-colors">FinanceWatch</h4>
                <p className="text-gray-600 group-hover:text-indigo-600 transition-colors">Complete financial overview</p>
              </a>

              {/* Felix CheckBook Card */}
              <a 
                href="https://felixcheck.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-emerald-300 group"
              >
                <div className="text-2xl mb-3">✅</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 mb-2 transition-colors">Felix CheckBook</h4>
                <p className="text-gray-600 group-hover:text-emerald-600 transition-colors">Check printing & mailing</p>
              </a>

              {/* Savings Pro Card */}
              <a 
                href="https://savingspro.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-pink-300 group"
              >
                <div className="text-2xl mb-3">🐷</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 mb-2 transition-colors">SavingsPro</h4>
                <p className="text-gray-600 group-hover:text-pink-600 transition-colors">Smart savings strategies</p>
              </a>

              {/* WealthWatch Card */}
              <a 
                href="https://wealth-watch.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-all duration-200 hover:border-amber-300 group"
              >
                <div className="text-2xl mb-3">💰</div>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 mb-2 transition-colors">WealthWatch</h4>
                <p className="text-gray-600 group-hover:text-amber-600 transition-colors">Track Your Cash Flow, Build Your Wealth</p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Created By */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Created by Felix Abayomi</h3>
            <p className="text-gray-600 mb-4">
              Financial educator and developer committed to practical wealth-building tools 
              that work for real people in real situations.
            </p>
            <div className="flex justify-center">
              <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => { handleStartJourney(); window.location.href = "/income"; }}
                  disabled={skipManifestoMutation.isPending}
                >
                  {skipManifestoMutation.isPending ? "Starting..." : "Start Your Income Journey"}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



