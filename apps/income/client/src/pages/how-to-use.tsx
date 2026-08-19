import { Card, CardContent, CardHeader, CardTitle } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { ArrowLeft, Play, TrendingUp, Target, Lightbulb, BarChart3, Calendar, DollarSign } from "lucide-react";

export default function HowToUsePage() {
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

  const handleBeginJourney = () => {
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
          <h1 className="text-3xl font-bold text-gray-900">How to Use <span className="text-green-600">IncomeLift</span></h1>
        </div>

        {/* Quick Start */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="w-5 h-5 mr-2 text-green-600" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold mb-2">Set Income Goals</h3>
                <p className="text-sm text-gray-600">
                  Choose your timeframe (daily/weekly/monthly/yearly) and set your income targets.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold mb-2">Set Level Targets</h3>
                <p className="text-sm text-gray-600">
                  Define your personal dollar amounts for Foundation, Stability, Growth, and Legacy levels.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold mb-2">Start Daily Tracking</h3>
                <p className="text-sm text-gray-600">
                  Log every dollar you earn, no matter how small. Build the habit.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold text-lg">4</span>
                </div>
                <h3 className="font-semibold mb-2">Take Quick Actions</h3>
                <p className="text-sm text-gray-600">
                  Use the Quick Cash Generator to find immediate income opportunities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Features */}
        <div className="space-y-6">
          {/* Daily Income Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Daily Income Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                The foundation of IncomeLift is daily income tracking. Here's how to maximize its effectiveness:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-700">✅ Do This:</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                    <li>Log income immediately when you receive it</li>
                    <li>Include all sources: wages, tips, side hustles, portfolio income</li>
                    <li>Add notes about what worked or lessons learned</li>
                    <li>Track even small amounts ($5, $10) - they add up</li>
                    <li>Be consistent - check in daily, even on $0 days</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-red-700">❌ Avoid This:</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                    <li>Waiting until the end of the week to log everything</li>
                    <li>Skipping "small" amounts or irregular income</li>
                    <li>Forgetting to categorize income sources</li>
                    <li>Being inconsistent with tracking</li>
                    <li>Only tracking your main job income</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ask Felix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                Ask Felix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Get personalized suggestions for earning money quickly based on your situation:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">How It Works:</h4>
                <ol className="list-decimal pl-6 space-y-2 text-blue-700">
                  <li>Answer questions about your available time</li>
                  <li>Tell us about your transportation options</li>
                  <li>Share your comfort level with people interaction</li>
                  <li>Get filtered suggestions that match your situation</li>
                  <li>Each suggestion includes estimated earnings and timeframe</li>
                </ol>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Example Suggestions Include:</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                    <li>Gig work opportunities (delivery, rideshare)</li>
                    <li>Online tasks and freelance work</li>
                    <li>Reselling items you already own</li>
                    <li>Local service opportunities</li>
                    <li>Skill-based quick jobs</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Pro Tips:</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                    <li>Start with the easiest suggestions first</li>
                    <li>Focus on opportunities that match your schedule</li>
                    <li>Try one new suggestion each week</li>
                    <li>Track which suggestions work best for you</li>
                    <li>Build on successes rather than jumping around</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Progress Mapping System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Track your journey through three key financial levels:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-blue-600 font-bold">1</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-center mb-2">Stability</h4>
                    <p className="text-sm text-gray-600">
                      Covering basic monthly expenses consistently. Building emergency buffer.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-green-600 font-bold">2</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-center mb-2">Growth</h4>
                    <p className="text-sm text-gray-600">
                      Surplus income for investing, debt payoff, and skill development.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-purple-600 font-bold">3</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-center mb-2">Legacy</h4>
                    <p className="text-sm text-gray-600">
                      Building long-term wealth and passive income streams.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Summaries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Weekly Summaries & Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Every week, review your progress and plan your next moves:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Weekly Review Questions:</h4>
                <ul className="list-disc pl-6 space-y-1 text-green-700">
                  <li>What income sources worked best this week?</li>
                  <li>Which quick cash suggestions did I try?</li>
                  <li>What obstacles did I encounter and how did I handle them?</li>
                  <li>What will I focus on improving next week?</li>
                  <li>Am I on track toward my current level goals?</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-orange-600" />
                Best Practices for Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-700">Daily Habits:</h4>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Check IncomeLift first thing in the morning</li>
                    <li>Log income immediately when received</li>
                    <li>Review yesterday's performance</li>
                    <li>Choose one income-focused action for today</li>
                    <li>End the day by logging any missed income</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-blue-700">Weekly Actions:</h4>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Review your weekly income summary</li>
                    <li>Try at least one new quick cash suggestion</li>
                    <li>Identify your best-performing income sources</li>
                    <li>Plan next week's income goals</li>
                    <li>Celebrate progress and learn from setbacks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Get Started */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Ready to Start Lifting?</h3>
            <p className="text-gray-600 mb-4">
              The most important step is the first one. Start with daily tracking and build from there.
            </p>
            <Button 
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3"
                onClick={() => { handleBeginJourney(); window.location.href = "/income"; }}
                disabled={skipManifestoMutation.isPending}
              >
                {skipManifestoMutation.isPending ? "Starting..." : "Begin Your Income Journey"}
              </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



