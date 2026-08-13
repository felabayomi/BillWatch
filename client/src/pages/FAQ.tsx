import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: "getting-started-1",
    question: "How do I get started with BillWatch?",
    answer: "Simply sign in with your BillWatch account to begin. Once logged in, you can start adding bills by scanning them with your camera or entering details manually. Your first bill scan will guide you through the process.",
    category: "Getting Started"
  },
  {
    id: "getting-started-2",
    question: "Is BillWatch really free?",
    answer: "Yes! BillWatch is completely free to use. There are no hidden fees, premium tiers, or credit card requirements. All features including AI bill scanning, smart reminders, and cross-device sync are available at no cost.",
    category: "Getting Started"
  },
  {
    id: "scanning-1",
    question: "How accurate is the bill scanning feature?",
    answer: "Our AI-powered OCR technology is highly accurate, but you should always review extracted information before saving. The system works best with clear, well-lit photos of flat bills. You can easily edit any details that need correction.",
    category: "Bill Scanning"
  },
  {
    id: "scanning-2",
    question: "What types of bills can I scan?",
    answer: "BillWatch can scan most printed bills including utilities, credit cards, rent, subscriptions, medical bills, and more. The system works best with standard bill formats that clearly show company name, amount, and due date.",
    category: "Bill Scanning"
  },
  {
    id: "scanning-3",
    question: "Can I add bills manually instead of scanning?",
    answer: "Absolutely! You can add bills manually by tapping 'Add Bill' and entering the details yourself. This is useful for digital bills, recurring payments, or when scanning isn't convenient.",
    category: "Bill Scanning"
  },
  {
    id: "reminders-1",
    question: "How do bill reminders work?",
    answer: "BillWatch automatically sets up smart reminders based on your bill due dates. You'll receive notifications at customizable intervals (two weeks, one week, three days, and same day). You can adjust these preferences in Settings.",
    category: "Reminders"
  },
  {
    id: "reminders-2",
    question: "Can I customize when I receive reminders?",
    answer: "Yes! Go to Settings to choose which reminders you want and set your preferred notification times. You can enable or disable each type of reminder and adjust the timing to fit your schedule.",
    category: "Reminders"
  },
  {
    id: "sync-1",
    question: "Can I access my bills on multiple devices?",
    answer: "Yes! Your data automatically syncs across all devices when you use the same BillWatch account. Bills added on your phone will appear on your computer and vice versa. Just make sure to use the same login credentials on all devices.",
    category: "Sync & Access"
  },
  {
    id: "sync-2",
    question: "What happens if I use a different account on another device?",
    answer: "Using a different account creates a completely separate profile with no access to your existing data. This is a security feature. To access your bills on a new device, always sign in with the same BillWatch account you used originally.",
    category: "Sync & Access"
  },
  {
    id: "privacy-1",
    question: "How secure is my financial data?",
    answer: "Very secure. We use bank-level encryption to protect your data, both in transit and at rest. Your financial information is never shared with third parties, and we use the same security standards as major financial institutions.",
    category: "Privacy & Security"
  },
  {
    id: "privacy-2",
    question: "Do you sell my data?",
    answer: "Never. We don't sell, rent, or share your personal or financial data with anyone. Your privacy is paramount, and we only collect what's necessary to provide the service. See our Privacy Policy for complete details.",
    category: "Privacy & Security"
  },
  {
    id: "managing-1",
    question: "How do I mark a bill as paid?",
    answer: "Tap any bill in your list and select 'Mark as Paid'. The bill will automatically move to your paid bills section and update across all your devices. You can also mark bills as paid from the bill details screen.",
    category: "Managing Bills"
  },
  {
    id: "managing-2",
    question: "Can I set up recurring bills?",
    answer: "Yes! When adding or editing a bill, you can mark it as recurring and set the frequency (monthly, quarterly, etc.). BillWatch will automatically create new bills based on your schedule.",
    category: "Managing Bills"
  },
  {
    id: "managing-3",
    question: "How do I edit or delete a bill?",
    answer: "Tap any bill to view its details, then use the edit or delete options. You can modify the amount, due date, company name, or any other details. Deleted bills are permanently removed and cannot be recovered.",
    category: "Managing Bills"
  },
  {
    id: "troubleshooting-1",
    question: "The app isn't loading my bills. What should I do?",
    answer: "First, check your internet connection and try refreshing the app. If the issue persists, make sure you're signed in with the correct account. Contact us if you continue experiencing problems.",
    category: "Troubleshooting"
  },
  {
    id: "troubleshooting-2",
    question: "Bill scanning isn't working properly. How can I fix this?",
    answer: "For best results, ensure good lighting, hold the camera steady, and make sure the entire bill is visible in the frame. Try cleaning your camera lens and ensure the bill is flat against a dark background.",
    category: "Troubleshooting"
  }
];

const categories = Array.from(new Set(faqData.map(item => item.category)));

export default function FAQ() {
  const [, setLocation] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQ = selectedCategory === "all" 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

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
              <h1 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h1>
              <p className="text-xs text-muted-foreground">
                Find answers to common questions about BillWatch
              </p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 pb-24">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">
              How Can We Help?
            </h2>
            <p className="text-sm text-muted-foreground font-medium mb-2">
              by Debt to Legacy LLC
            </p>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Find quick answers to the most common questions about using BillWatch.
            </p>
          </section>

          {/* Category Filter */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Browse by Category</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                data-testid="filter-all"
              >
                All Questions
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </section>

          {/* FAQ Items */}
          <section className="space-y-4">
            <div className="space-y-3">
              {filteredFAQ.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
                    onClick={() => toggleItem(item.id)}
                    data-testid={`faq-question-${item.id}`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {item.category}
                      </div>
                      <h4 className="font-medium text-foreground">
                        {item.question}
                      </h4>
                    </div>
                    {expandedItems.has(item.id) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  
                  {expandedItems.has(item.id) && (
                    <div className="px-4 pb-4 border-t border-border">
                      <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Still Need Help */}
          <section className="pt-6 border-t border-border space-y-4">
            <h3 className="text-xl font-bold text-foreground text-center">
              Still Need Help?
            </h3>
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                Can't find what you're looking for? We're here to help.
              </p>
              <Button 
                onClick={() => setLocation("/contact")}
                data-testid="button-contact-us"
              >
                Contact Us
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
