import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@income/components/ui/card";
import { format } from "date-fns";
import { ArrowLeft, BookOpen } from "lucide-react";

interface Reflection {
  id: string;
  weekStart: string;
  reflection: string | null;
  strategy: string | null;
  createdAt: string;
}

export default function Reflections() {
  const { data: reflections = [], isLoading } = useQuery<Reflection[]>({
    queryKey: ['/api/income-lift/reflections'],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Weekly Reflections</h1>
          <p className="text-muted-foreground">Loading your reflections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <a href="/income" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors mr-4" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </div>
        <div className="flex items-center mb-6">
          <BookOpen className="mr-3 text-purple-600" size={32} />
          <h1 className="text-3xl font-bold">Weekly Reflections</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Review your weekly insights and strategies over time.
        </p>

        {reflections.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No reflections saved yet. Start tracking your weekly insights from the Home page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {reflections
              .sort((a, b) => 
                new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
              )
              .map((reflection) => (
                <Card key={reflection.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold">
                        Week of {format(new Date(reflection.weekStart), 'MMM dd, yyyy')}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        Saved {format(new Date(reflection.createdAt), 'MMM dd')}
                      </span>
                    </div>
                    
                    {reflection.reflection && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2 text-sm text-muted-foreground">
                          What worked best for income this week?
                        </h3>
                        <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-lg">
                          {reflection.reflection}
                        </p>
                      </div>
                    )}
                    
                    {reflection.strategy && reflection.strategy !== reflection.reflection && (
                      <div>
                        <h3 className="font-medium mb-2 text-sm text-muted-foreground">
                          Strategy
                        </h3>
                        <p className="text-sm leading-relaxed bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          {reflection.strategy}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}


