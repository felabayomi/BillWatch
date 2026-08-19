import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";
import { ChartLine, Target, TrendingUp, Crown, ExternalLink, LogIn } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <ChartLine className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">IncomeLift</h1>
                <p className="text-xs text-slate-500 mb-1">by Debt to Legacy LLC</p>
                <p className="text-sm text-slate-600">Bills don't wait! Neither Should Income!</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6 leading-tight">
                Secure Your Financial Future To Legacy
              </h2>
              <p className="text-xl text-slate-600 mb-6 leading-relaxed">
                Make Income, Track and build sustainable wealth through 
                structured progress and actionable insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-lg"
                >
                  <a href="https://felixpay.net/membership" target="_blank" rel="noopener noreferrer">
                    Get Started with Membership
                    <ExternalLink className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button 
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                  <a href="/api/login">
                    Sign In with SSO
                    <LogIn className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  className="border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-8 py-3 text-lg"
                >
                  <a href="https://debtlegacypath.com" target="_blank" rel="noopener noreferrer">
                    Take Financial Roadmap Test
                    <ExternalLink className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Daily Foundation Building</h3>
                  <p className="text-slate-600">
                    Track every dollar with precision. Build awareness of your money flow and 
                    create consistent income habits that compound over time.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Smart Opportunity Engine</h3>
                  <p className="text-slate-600">
                    Get personalized quick-cash suggestions based on your resources, skills, and 
                    availability. Turn spare time into real income.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Crown className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Progressive Level System</h3>
                  <p className="text-slate-600">
                    Advance through Foundation → Stability → Growth → Legacy. Each level unlocks 
                    new strategies and builds toward long-term wealth.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
              <p className="text-slate-700 italic mb-4">
                "Finally, a system that focuses on tracking real income instead of just expenses. 
                The level progression keeps me motivated to push beyond survival mode."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">FA</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Felix A.</p>
                  <p className="text-sm text-slate-600">Financial Consultant → Full-time Entrepreneur</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center" id="auth-form">
            <Card className="w-full max-w-md shadow-xl border-0">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">
                  Welcome to IncomeLift
                </CardTitle>
                <p className="text-muted-foreground">
                  Sign in to start tracking your income and building your financial future
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Button 
                    asChild
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-6"
                  >
                    <a href="https://felixpay.net/membership" target="_blank" rel="noopener noreferrer">
                      Get Started with Membership
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    New here? Subscribe to the Felix Financial Suite first
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Already a member?</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    asChild
                    variant="outline"
                    className="w-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-lg py-6"
                  >
                    <a href="/api/login">
                      <LogIn className="mr-2 h-5 w-5 text-blue-600" />
                      Sign In with SSO
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in with your Google, GitHub, Apple, or email account
                  </p>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-center text-muted-foreground">
                    Part of the <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Debt to Legacy LLC</a> financial suite.
                    A <a href="https://felixpay.net/membership" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Felix Financial Suite</a> subscription is required.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="max-w-4xl mx-auto px-4 py-16 space-y-8">
          <div className="text-center space-y-6">
            <h3 className="text-3xl font-bold text-slate-800">About Debt to Legacy LLC</h3>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-slate-600 leading-relaxed">
                Debt to Legacy is a personal finance and debt management consulting business that equips 
                individuals with practical tools to regain control of their money, eliminate debt, and build 
                lasting wealth. Through comprehensive solutions, we guide clients step by step from financial 
                struggle to financial freedom and legacy building.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 space-y-8">
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-bold text-slate-800">Complete Financial Suite</h3>
            <p className="text-lg text-slate-600">
              Explore our comprehensive range of financial tools and services
            </p>
          </div>
         
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center shadow-lg">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChartLine className="text-white" size={24} />
              </div>
              <h4 className="text-xl font-bold text-green-800 mb-2">IncomeLift</h4>
              <p className="text-green-600 mb-2">Boost your income streams</p>
              <p className="text-sm text-green-500 font-medium">You're here!</p>
            </div>

            <a 
              href="https://steadyvest.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-green-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🌱</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-green-600 mb-2 transition-colors">SteadyVest</h4>
              <p className="text-slate-600 group-hover:text-green-600 transition-colors">Steady growth investing</p>
            </a>

            <a 
              href="https://billwatch.pro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-blue-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 mb-2 transition-colors">BillWatch</h4>
              <p className="text-slate-600 group-hover:text-blue-600 transition-colors">Smart bill management</p>
            </a>

            <a 
              href="https://diydebt.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-red-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🛡️</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-red-600 mb-2 transition-colors">DIY Debt</h4>
              <p className="text-slate-600 group-hover:text-red-600 transition-colors">Debt elimination strategies</p>
            </a>

            <a 
              href="https://felixpay.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-purple-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">💳</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 mb-2 transition-colors">Felix Pay</h4>
              <p className="text-slate-600 group-hover:text-purple-600 transition-colors">Secure payment solutions</p>
            </a>

            <a 
              href="https://expensewatch.pro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-teal-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🧾</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 mb-2 transition-colors">ExpenseWatch</h4>
              <p className="text-slate-600 group-hover:text-teal-600 transition-colors">Advanced expense tracking</p>
            </a>

            <a 
              href="https://financewatch.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-indigo-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">📈</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 mb-2 transition-colors">FinanceWatch</h4>
              <p className="text-slate-600 group-hover:text-indigo-600 transition-colors">Complete financial overview</p>
            </a>

            <a 
              href="https://felixcheck.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-emerald-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">✅</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 mb-2 transition-colors">Felix CheckBook</h4>
              <p className="text-slate-600 group-hover:text-emerald-600 transition-colors">Check printing & mailing</p>
            </a>

            <a 
              href="https://savingspro.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-pink-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">🐷</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-pink-600 mb-2 transition-colors">SavingsPro</h4>
              <p className="text-slate-600 group-hover:text-pink-600 transition-colors">Smart savings strategies</p>
            </a>

            <a 
              href="https://wealth-watch.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:border-amber-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 group-hover:bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <span className="text-2xl">💰</span>
              </div>
              <h4 className="text-xl font-bold text-slate-800 group-hover:text-amber-600 mb-2 transition-colors">WealthWatch</h4>
              <p className="text-slate-600 group-hover:text-amber-600 transition-colors">Track Your Cash Flow, Build Your Wealth</p>
            </a>
          </div>
        </section>

        <section className="mt-20">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-slate-200">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <h3 className="text-2xl font-bold text-slate-800">About Debt to Legacy LLC</h3>
                <div className="max-w-4xl mx-auto">
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
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
        </section>
      </main>
    </div>
  );
}

