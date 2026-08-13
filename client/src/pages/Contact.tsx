import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Globe, MessageCircle, Clock, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Contact() {
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
              <h1 className="text-lg font-semibold text-foreground">Contact Us</h1>
              <p className="text-xs text-muted-foreground">
                Get help and support for BillWatch
              </p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-8 pb-24">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">
              We're Here to Help
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Have questions about BillWatch? Need support? We'd love to hear from you.
            </p>
          </section>

          {/* Contact Methods */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-foreground">Get in Touch</h3>
            
            <div className="space-y-4">
              {/* Email */}
              <a
                href="mailto:felix@debttolegacy.com"
                className="block p-6 bg-card border border-border rounded-xl hover:shadow-md transition-shadow"
                data-testid="link-contact-email"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">Email Support</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Send us an email and we'll get back to you as soon as possible.
                    </p>
                    <div className="text-primary font-medium">
                      felix@debttolegacy.com
                    </div>
                  </div>
                </div>
              </a>

              {/* Website */}
              <a
                href="https://debttolegacy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 bg-card border border-border rounded-xl hover:shadow-md transition-shadow"
                data-testid="link-website"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Globe className="h-6 w-6" style={{color: 'hsl(142, 71%, 45%)'}} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">Visit Our Website</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Learn more about our company and explore our other financial tools.
                    </p>
                    <div className="text-primary font-medium">
                      debttolegacy.com →
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </section>

          {/* Response Times */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Response Times
            </h3>
            <div className="p-6 bg-muted/30 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">General Inquiries</span>
                <span className="text-sm text-muted-foreground">1-2 business days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Technical Support</span>
                <span className="text-sm text-muted-foreground">Same day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Account Issues</span>
                <span className="text-sm text-muted-foreground">Within 24 hours</span>
              </div>
            </div>
          </section>

          {/* FAQ Reference */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Before You Contact Us</h3>
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Check Our FAQ</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                Many common questions are answered in our Frequently Asked Questions section.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/faq")}
                data-testid="button-view-faq"
              >
                View FAQ
              </Button>
            </div>
          </section>

          {/* Privacy Note */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Your Privacy Matters
            </h3>
            <div className="p-6 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you contact us, we only use your information to respond to your inquiry. We never share your contact details with third parties, and all communications are handled securely. For more details, please review our{" "}
                <a 
                  href="/privacy-policy" 
                  className="text-primary hover:underline"
                  data-testid="link-privacy"
                >
                  Privacy Policy
                </a>.
              </p>
            </div>
          </section>

          {/* Alternative Help */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Other Ways to Get Help</h3>
            <div className="grid gap-4">
              <div className="p-4 bg-card border border-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">How to Use Guide</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete guide to using all BillWatch features.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/how-to-use")}
                  data-testid="button-how-to-use"
                >
                  View Guide
                </Button>
              </div>

              <div className="p-4 bg-card border border-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">About BillWatch</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Learn more about our mission and features.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/about")}
                  data-testid="button-about"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}