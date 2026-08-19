import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { useState } from "react";

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
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

  const handleStartTracking = () => {
    skipManifestoMutation.mutate();
  };

  const toggleItem = (index: number) => {
    setOpenItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      question: "How do I get started with IncomeLift?",
      answer: "Follow these 4 simple steps: 1) Set your income goals (choose daily, weekly, monthly, or yearly timeframe), 2) Set your level targets (define what Foundation, Stability, Growth, and Legacy mean in dollars for YOU), 3) Start tracking your daily income, and 4) Use Quick Cash suggestions to find immediate opportunities. Your profile has numbered buttons to guide you through steps 1 and 2."
    },
    {
      question: "How does IncomeLift help me make more money?",
      answer: "IncomeLift provides daily income tracking and personalized quick cash suggestions based on your available time, transportation, and comfort level. By tracking your income patterns and identifying opportunities, you can systematically increase your earnings."
    },
    {
      question: "Is my financial data secure?",
      answer: "Absolutely. IncomeLift doesn't connect to your bank accounts and doesn't store sensitive financial information. All data is encrypted and stays private. We don't sell your data or share it with third parties."
    },
    {
      question: "Do I need to connect my bank account?",
      answer: "No! IncomeLift works entirely with manual income tracking. You simply log what you earn each day from different sources. This keeps your banking information completely private and secure."
    },
    {
      question: "What are the four progression levels?",
      answer: "The system tracks your progress through Foundation (building your base), Stability (covering essential expenses), Growth (building surplus income), and Legacy (long-term wealth building). Each level has specific milestones and empowering strategies."
    },
    {
      question: "How much does IncomeLift cost?",
      answer: "IncomeLift is currently free to use. Our focus is on helping people improve their financial situation through practical daily actions and clear progress tracking."
    },
    {
      question: "Can I use this if I have irregular income?",
      answer: "Yes! IncomeLift is especially helpful for people with irregular income like freelancers, gig workers, or small business owners. Daily tracking helps you see patterns and plan for income fluctuations."
    },
    {
      question: "What makes this different from other budgeting apps?",
      answer: "IncomeLift focuses on growing income rather than just tracking expenses. While budgeting apps help you manage what you have, IncomeLift helps you increase what you earn through practical suggestions and daily tracking."
    },
    {
      question: "How long does it take to see results?",
      answer: "You'll see immediate benefits from daily tracking (knowing exactly where you stand), and quick cash suggestions can generate income within days or weeks. Long-term wealth building takes months and years of consistent action."
    },
    {
      question: "Do I need any special skills or experience?",
      answer: "No special skills required! IncomeLift provides suggestions for all skill levels, from basic tasks anyone can do to more advanced opportunities that match your existing abilities."
    },
    {
      question: "Can I use this alongside other financial tools?",
      answer: "Yes! IncomeLift is part of the Debt-to-Legacy Suite and works well with budgeting apps, investment platforms, and other financial tools. Focus on income growth while managing expenses and investments."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <a href="/income" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors mr-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
          <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-lg text-gray-700 text-center">
              Get answers to common questions about IncomeLift and how it can help you 
              build a stronger financial future through practical daily actions.
            </p>
          </CardContent>
        </Card>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="transition-all duration-200">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleItem(index)}
              >
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{faq.question}</span>
                  {openItems[index] ? (
                    <Minus className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-500" />
                  )}
                </CardTitle>
              </CardHeader>
              {openItems[index] && (
                <CardContent className="pt-0">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Still have questions?</h3>
            <p className="text-gray-600 mb-4">
              Ready to start lifting your income? Get started with daily tracking and see the difference it makes.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => { handleStartTracking(); window.location.href = "/income"; }}
                  disabled={skipManifestoMutation.isPending}
                >
                  {skipManifestoMutation.isPending ? "Starting..." : "Start Tracking Now"}
                </Button>
              <a href="https://debttolegacy.com/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  Contact Felix
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



