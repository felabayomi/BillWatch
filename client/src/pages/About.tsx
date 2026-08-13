import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, Users, Shield, Smartphone, Target, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function About() {
  const [, setLocation] = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2 mr-3"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">About BillWatch</h1>
              <p className="text-xs text-muted-foreground">
                Smart bill management made simple
              </p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-8 pb-24">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">
              Never Miss a Payment Again
            </h2>
            <p className="text-sm text-muted-foreground font-medium mb-2">
              by Debt to Legacy LLC
            </p>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              BillWatch combines AI-powered bill scanning with smart reminders to help you stay on top of your finances.
            </p>
          </section>

          {/* Mission Statement */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Our Mission</h3>
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-muted-foreground leading-relaxed">
                We believe managing bills shouldn't be stressful or complicated. BillWatch was created to eliminate the anxiety of forgotten payments and provide a simple, secure way to track your financial obligations. Our AI-powered approach saves you time while keeping you organized and in control.
              </p>
            </div>
          </section>

          {/* Key Features */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-foreground">What Makes BillWatch Different</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">AI-Powered Scanning</h4>
                  <p className="text-sm text-muted-foreground">
                    Just snap a photo and let our advanced OCR technology extract all the important details - company name, amount, and due date.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6" style={{color: 'hsl(142, 71%, 45%)'}} />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Smart Reminders</h4>
                  <p className="text-sm text-muted-foreground">
                    Customizable notifications ensure you're always aware of upcoming bills without being overwhelmed by alerts.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Bank-Level Security</h4>
                  <p className="text-sm text-muted-foreground">
                    Your financial data is encrypted end-to-end and never shared. We use the same security standards as major banks.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* The Story */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Part of Something Bigger</h3>
            <div className="p-6 bg-muted/30 rounded-xl space-y-3">
              <p className="text-muted-foreground">
                BillWatch is part of the <strong className="text-foreground">Debt to Legacy Navigation Suite</strong> - a comprehensive collection of tools designed to help you move from debt relief to lasting wealth.
              </p>
              <p className="text-muted-foreground">
                Whether you're managing day-to-day bills, investing for the future, or getting out of debt, our suite provides the tools and guidance you need at every step of your financial journey.
              </p>
            </div>
          </section>

          {/* Technology */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Built for Modern Life
            </h3>
            <div className="grid gap-4">
              <div className="p-4 bg-card border border-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Mobile-First Design</h4>
                <p className="text-sm text-muted-foreground">
                  Designed for your smartphone, so you can scan and manage bills anywhere, anytime.
                </p>
              </div>
              
              <div className="p-4 bg-card border border-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Cross-Device Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Your data automatically syncs across all your devices when you use the same account.
                </p>
              </div>

              <div className="p-4 bg-card border border-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Privacy by Design</h4>
                <p className="text-sm text-muted-foreground">
                  We collect only what's necessary and never sell your data. Your financial information stays private.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="text-center pt-6 border-t border-border space-y-4">
            <h3 className="text-xl font-bold text-foreground">
              Ready to Take Control?
            </h3>
            <p className="text-muted-foreground mb-4">
              Sign up for a membership to unlock full access to BillWatch and start managing your bills today.
            </p>
            <Button 
              size="lg" 
              className="w-full max-w-xs mx-auto"
              onClick={() => window.open(import.meta.env.VITE_MEMBERSHIP_PORTAL_URL || "https://felixpay.net/membership", "_blank")}
              data-testid="button-get-started"
            >
              Sign Up for Membership
            </Button>
          </section>
        </div>
      </div>
    </Layout>
  );
}
