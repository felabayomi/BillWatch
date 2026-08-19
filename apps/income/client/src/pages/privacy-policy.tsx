import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { ArrowLeft, Shield, Lock, Eye, Database } from "lucide-react";

export default function PrivacyPolicyPage() {
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

  const handleBackToApp = () => {
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
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        </div>

        {/* Last Updated */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              <strong>Last Updated:</strong> January 2025 | <strong>Effective Date:</strong> January 2025
            </p>
          </CardContent>
        </Card>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">No Bank Access</h3>
              <p className="text-xs text-gray-600">We never connect to your bank accounts</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Lock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Encrypted Data</h3>
              <p className="text-xs text-gray-600">All data is securely encrypted</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Eye className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">No Data Selling</h3>
              <p className="text-xs text-gray-600">Your data is never sold or shared</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Database className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Minimal Collection</h3>
              <p className="text-xs text-gray-600">We collect only what's necessary</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Income Tracking Data</h4>
                <p className="text-gray-700">
                  • Daily income amounts you manually enter
                  <br />• Income source categories (wages, side hustle, services, etc.)
                  <br />• Optional notes you add to income entries
                  <br />• Weekly and monthly income summaries
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Data</h4>
                <p className="text-gray-700">
                  • Basic analytics to improve the app experience
                  <br />• Feature usage patterns to enhance functionality
                  <br />• Error logs to fix technical issues
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What We DON'T Collect</h4>
                <p className="text-gray-700">
                  • Bank account information or credentials
                  <br />• Credit card or payment information
                  <br />• Social security numbers or government IDs
                  <br />• Precise location data
                  <br />• Personal conversations or communications
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                We use your information solely to provide and improve IncomeLift services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Display your income tracking progress and summaries</li>
                <li>Generate personalized quick cash suggestions</li>
                <li>Calculate your progression through financial levels</li>
                <li>Provide weekly and monthly income reports</li>
                <li>Improve app functionality based on usage patterns</li>
                <li>Send you important service updates (if you opt in)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Your financial data security is our top priority:
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Bank-Level Security</h4>
                  <ul className="list-disc pl-6 space-y-1 text-green-700">
                    <li>256-bit SSL encryption for all data transmission</li>
                    <li>Encrypted data storage with secure access controls</li>
                    <li>Regular security audits and vulnerability assessments</li>
                    <li>No third-party access to your personal financial data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                <strong>We do not sell, rent, or share your personal financial data with third parties.</strong> 
                Limited sharing may occur only in these specific circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>With your explicit consent for specific services you request</li>
                <li>To comply with legal requirements or court orders</li>
                <li>To protect against fraud or abuse of our services</li>
                <li>With service providers who help operate our platform (under strict confidentiality agreements)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">You have full control over your data:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Access:</strong> Request a copy of all data we have about you</li>
                <li><strong>Delete:</strong> Request deletion of your account and all associated data</li>
                <li><strong>Correct:</strong> Update or correct any inaccurate information</li>
                <li><strong>Export:</strong> Download your income tracking data in standard formats</li>
                <li><strong>Opt-out:</strong> Unsubscribe from any communications</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                For privacy questions, data requests, or concerns, contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>Email:</strong> Available through <a href="https://debttolegacy.com/" className="text-blue-600 underline">debttolegacy.com</a>
                  <br /><strong>Response Time:</strong> Within 72 hours
                  <br /><strong>Data Requests:</strong> Processed within 30 days
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">
              This policy may be updated to reflect changes in our practices or for legal compliance. 
              We'll notify users of significant changes.
            </p>
            <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { handleBackToApp(); window.location.href = "/income"; }}
                disabled={skipManifestoMutation.isPending}
              >
                {skipManifestoMutation.isPending ? "Loading..." : "Back to IncomeLift"}
              </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



