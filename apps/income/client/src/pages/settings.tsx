
import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";
import { Settings, BookOpen, User, Shield, HelpCircle, Wallet } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Settings className="mr-3 text-blue-600" size={32} />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 text-green-600" size={20} />
                Profile & Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage your income goals and personal preferences.
              </p>
              <Button variant="outline" className="w-full">
                Edit Goals & Targets
              </Button>
            </CardContent>
          </Card>

          {/* Reflections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 text-purple-600" size={20} />
                Weekly Reflections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Review your past weekly insights and strategies for growth.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "/income/reflections"}>
                  View All Reflections
                </Button>
            </CardContent>
          </Card>

          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="mr-2 text-blue-600" size={20} />
                Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage your deposit accounts for FinanceWatch income syncing.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "/income/accounts"}>
                Manage Accounts
              </Button>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 text-blue-600" size={20} />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your data is encrypted and secure. Manage privacy settings.
              </p>
              <Button variant="outline" className="w-full">
                Privacy Settings
              </Button>
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="mr-2 text-orange-600" size={20} />
                Help & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Get help, view FAQ, and contact support.
              </p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => window.location.href = "/income/faq"}>
                    View FAQ
                  </Button>
                <Button variant="outline" className="w-full" onClick={() => window.location.href = "/income/how-to-use"}>
                    How to Use Guide
                  </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <a href="/income" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
            â† Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}


