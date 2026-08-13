import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Bell, Calendar, Settings, Receipt, Eye, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function HowToUse() {
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
              <h1 className="text-lg font-semibold text-foreground">How to Use BillWatch</h1>
              <p className="text-xs text-muted-foreground">
                Complete guide to managing your bills • by Debt to Legacy LLC
              </p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 pb-24">
          <div className="space-y-6">
            {/* Getting Started */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Getting Started
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">1. Sign In</h3>
                  <p>Use your BillWatch account to sign in securely. All your data will be private and encrypted.</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">2. Add Your First Bill</h3>
                  <p>Use the "Scan Bill" button to take a photo, or "Add Bill" to enter details manually.</p>
                </div>
              </div>
            </section>

            {/* Scanning Bills */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Scanning Bills
              </h2>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-foreground mb-2">Smart OCR Technology</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                    <li>Take clear photos of your bills in good lighting</li>
                    <li>AI automatically extracts company name, amount, and due date</li>
                    <li>Review and edit extracted information before saving</li>
                    <li>Original documents are stored securely for reference</li>
                  </ul>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Tip:</strong> For best results, ensure bills are flat, well-lit, and text is clearly visible.
                  </p>
                </div>
              </div>
            </section>

            {/* Understanding Color Codes */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Bill Status & Color Codes
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-red-800 dark:text-red-200">Overdue Bills</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">Bills past their due date - pay immediately</p>
                </div>
                
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-yellow-800 dark:text-yellow-200">Critical (4 days or less)</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Due very soon - schedule payment now</p>
                </div>
                
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-orange-800 dark:text-orange-200">Warning (within a week)</span>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">Due this week - plan your payment</p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-semibold text-green-800 dark:text-green-200">Paid Bills</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">Successfully paid - archived safely</p>
                </div>
              </div>
            </section>

            {/* Setting Reminders */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Smart Reminders
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Never miss a payment with customizable reminder notifications:</p>
                <ul className="space-y-2 list-disc pl-4">
                  <li><strong className="text-foreground">Two weeks before:</strong> Early planning reminder</li>
                  <li><strong className="text-foreground">One week before:</strong> Payment preparation</li>
                  <li><strong className="text-foreground">Three days before:</strong> Final notice</li>
                  <li><strong className="text-foreground">Same day:</strong> Due date alert</li>
                </ul>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p><strong className="text-foreground">Customize in Settings:</strong> Choose which reminders you want and set your preferred notification time.</p>
                </div>
              </div>
            </section>

            {/* Calendar View */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Calendar View
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Visualize all your bills on an interactive calendar:</p>
                <ul className="space-y-2 list-disc pl-4">
                  <li>See all upcoming due dates at a glance</li>
                  <li>Bills are color-coded by urgency level</li>
                  <li>Click any date to see bills due that day</li>
                  <li>Plan your monthly budget effectively</li>
                </ul>
              </div>
            </section>

            {/* Managing Bills */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                Managing Your Bills
              </h2>
              <div className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Mark as Paid</h3>
                  <p className="text-sm text-muted-foreground">
                    Tap the "Mark as Paid" button when you've completed payment. Bills automatically move to the paid filter.
                  </p>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Edit Bill Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Tap any bill to edit amount, due date, or other details. Perfect for correcting OCR mistakes or updating information.
                  </p>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Recurring Bills</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up monthly recurring bills like utilities, rent, or subscriptions. New bills are automatically created each month.
                  </p>
                </div>
              </div>
            </section>

            {/* Settings & Preferences */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Settings & Preferences
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Customize BillWatch to work best for you:</p>
                <ul className="space-y-2 list-disc pl-4">
                  <li><strong className="text-foreground">Notification Preferences:</strong> Choose when and how you receive reminders</li>
                  <li><strong className="text-foreground">Auto-Cleanup:</strong> Automatically archive or delete paid bills after a set time</li>
                  <li><strong className="text-foreground">Bill Categories:</strong> View spending breakdown by category (utilities, subscriptions, etc.)</li>
                  <li><strong className="text-foreground">Document Management:</strong> View all uploaded documents and manage storage</li>
                </ul>
              </div>
            </section>

            {/* Accessing Data Across Devices */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                Accessing Your Data Across Devices
              </h2>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your BillWatch data automatically syncs across all your devices when you use the same authentication method.
                </p>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔐 Important Authentication Rule</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    You must use the <strong>same authentication method</strong> (same account) on all devices to access your data.
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <h4 className="font-semibold text-foreground">How Cross-Device Sync Works:</h4>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Bills scanned on your phone appear instantly on your computer</li>
                    <li>Reminders and preferences sync automatically</li>
                    <li>Payment status updates across all devices in real-time</li>
                    <li>Your data is tied to your unique account, not the device</li>
                  </ul>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Security Note:</strong> Using a different email or authentication method creates a separate account with no access to your existing data. This protects your financial information from unauthorized access.
                  </p>
                </div>
              </div>
            </section>

            {/* Tips for Success */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Tips for Success</h2>
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Best Practices</h3>
                  <ul className="space-y-1 text-sm text-green-700 dark:text-green-300 list-disc pl-4">
                    <li>Add bills as soon as you receive them</li>
                    <li>Check the app weekly to stay on top of upcoming payments</li>
                    <li>Verify OCR-extracted information before saving</li>
                    <li>Set up recurring bills for regular monthly expenses</li>
                    <li>Use the calendar view for monthly budget planning</li>
                    <li><strong>Always use the same account when switching devices</strong></li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
