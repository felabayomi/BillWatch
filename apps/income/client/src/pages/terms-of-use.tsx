import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { ArrowLeft, CheckCircle, AlertTriangle, Users, Shield } from "lucide-react";

export default function TermsOfUsePage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Terms of Use</h1>
        </div>

        {/* Last Updated */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 text-center">
              <strong>Last Updated:</strong> January 2025 | <strong>Effective Date:</strong> January 2025
            </p>
          </CardContent>
        </Card>

        {/* Key Terms Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Free to Use</h3>
              <p className="text-xs text-gray-600">IncomeLift is currently free for all users</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Personal Use</h3>
              <p className="text-xs text-gray-600">For individual financial tracking only</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Your Responsibility</h3>
              <p className="text-xs text-gray-600">You're responsible for data accuracy</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Educational Tool</h3>
              <p className="text-xs text-gray-600">Not professional financial advice</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Terms */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                By using IncomeLift, you agree to these Terms of Use. If you don't agree with any part of these terms, 
                please don't use our service. These terms apply to all users of IncomeLift and may be updated from time to time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">IncomeLift provides:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Daily income tracking and progress monitoring</li>
                <li>Personalized quick cash opportunity suggestions</li>
                <li>Financial progression milestone tracking</li>
                <li>Weekly and monthly income summaries</li>
                <li>Educational content about income building strategies</li>
              </ul>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  <strong>Important:</strong> IncomeLift is an educational and tracking tool. 
                  It does not provide professional financial advice, investment recommendations, or guaranteed results.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-3">You agree to:</h4>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                <li>Provide accurate income information for your tracking</li>
                <li>Use the service for personal financial tracking only</li>
                <li>Not attempt to hack, disrupt, or misuse the platform</li>
                <li>Keep your login credentials secure and private</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Take responsibility for your own financial decisions</li>
              </ul>
              <h4 className="font-semibold mb-3">You agree NOT to:</h4>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Use IncomeLift for illegal activities or fraud</li>
                <li>Share false or misleading information</li>
                <li>Attempt to access other users' data</li>
                <li>Copy, distribute, or reverse engineer our software</li>
                <li>Use automated tools to scrape or access our data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-red-800 mb-2">No Financial Advice</h4>
                <p className="text-red-700">
                  IncomeLift provides educational content and tracking tools only. We do not provide personalized financial, 
                  investment, tax, or legal advice. Always consult qualified professionals for specific financial decisions.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Income suggestions are educational examples, not guarantees</li>
                <li>Results may vary based on individual circumstances</li>
                <li>Past performance does not predict future results</li>
                <li>You are solely responsible for your financial decisions</li>
                <li>Consider consulting financial professionals for major decisions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                We strive to keep IncomeLift available 24/7, but we cannot guarantee uninterrupted service. 
                Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Scheduled maintenance and updates</li>
                <li>Technical issues or server problems</li>
                <li>Third-party service interruptions</li>
                <li>Force majeure events beyond our control</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We recommend regularly exporting your data as a backup.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                IncomeLift is provided "as is" without warranties of any kind. To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>We are not liable for any financial losses or missed opportunities</li>
                <li>We do not guarantee the accuracy of income suggestions or projections</li>
                <li>We are not responsible for decisions made based on our content</li>
                <li>Our total liability is limited to the amount you paid for the service</li>
                <li>You use IncomeLift at your own risk</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                We may update these Terms of Use from time to time to reflect changes in our service or legal requirements. 
                We'll notify users of significant changes through the app or email. Continued use of IncomeLift after 
                changes constitutes acceptance of the new terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Questions about these Terms of Use? Contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>Contact:</strong> Available through <a href="https://debttolegacy.com/" className="text-blue-600 underline">debttolegacy.com</a>
                  <br /><strong>Response Time:</strong> Within 72 hours
                  <br /><strong>Created by:</strong> Felix Abayomi
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">
              By using IncomeLift, you acknowledge that you have read, understood, and agreed to these Terms of Use.
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



