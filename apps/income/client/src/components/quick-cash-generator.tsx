import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@income/lib/queryClient";
import { Card, CardContent } from "@income/components/ui/card";
import { Button } from "@income/components/ui/button";
import { Label } from "@income/components/ui/label";
import { Switch } from "@income/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@income/components/ui/select";
import { Badge } from "@income/components/ui/badge";
import { Input } from "@income/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@income/components/ui/dialog";
import { useToast } from "@income/hooks/use-toast";
import { Zap, Calculator, CheckCircle, DollarSign } from "lucide-react";

export default function QuickCashGenerator() {
  const [requirements, setRequirements] = useState({
    itemsToSell: false,
    freeHours: '2-3',
    needCashBy: 'today',
    transport: 'none',
    peopleComfort: 'medium',
    physical: { canLiftHeavy: false, preferIndoors: true },
    skills: [] as string[],
    assets: [] as string[],
    locationType: 'suburban',
    onlineOk: true,
  });
  const [suggestions, setSuggestions] = useState<any>({ results: [], message: '', tips: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startedOpportunities, setStartedOpportunities] = useState<string[]>([]);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [incomeAmount, setIncomeAmount] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateSuggestionsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/income-lift/quick-cash/filtered', data),
    onSuccess: (response) => {
      response.json().then(data => {
        setSuggestions(data.results ? data : { results: data, message: '', tips: [] });
        setShowSuggestions(true);
      });
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/income-lift/income', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/income/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/income/week'] });
      queryClient.invalidateQueries({ queryKey: ['/api/income-lift/level/progress'] });
      toast({
        title: "Income logged!",
        description: `Successfully tracked $${incomeAmount} from ${selectedOpportunity?.title}`,
      });
      setShowIncomeDialog(false);
      setIncomeAmount('');
      setSelectedOpportunity(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log income. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateSuggestions = () => {
    generateSuggestionsMutation.mutate(requirements);
  };

  const handleStartOpportunity = (opportunity: any) => {
    if (!startedOpportunities.includes(opportunity.id)) {
      setStartedOpportunities(prev => [...prev, opportunity.id]);
      toast({
        title: "Opportunity started!",
        description: `Started: ${opportunity.title}. Click "Log Income" when complete.`,
      });
    } else {
      // If already started, show income dialog
      setSelectedOpportunity(opportunity);
      setShowIncomeDialog(true);
    }
  };

  const handleLogIncome = () => {
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid income amount.",
        variant: "destructive",
      });
      return;
    }

    const incomeData = {
      amount: incomeAmount,
      source: 'side_hustle',
      notes: `${selectedOpportunity?.title} - Felix suggestion`,
      date: new Date().toISOString(), // Send user's local date
    };

    addIncomeMutation.mutate(incomeData);
  };

  const timeOptions = [
    { value: '0-1', label: '0-1 hours' },
    { value: '1-2', label: '1-2 hours' },
    { value: '2-3', label: '2-3 hours' },
    { value: '3-4', label: '3-4 hours' },
    { value: '4+', label: '4+ hours' },
  ];

  const cashByOptions = [
    { value: 'today', label: 'Today' },
    { value: '3days', label: '3 days' },
    { value: '7days', label: '7 days' },
  ];

  const transportOptions = [
    { value: 'none', label: 'No transport' },
    { value: 'bike', label: 'Bike/scooter' },
    { value: 'car/van', label: 'Car/van' },
  ];

  const skillOptions = [
    'cleaning', 'errands', 'cooking', 'tutoring', 'tech', 'digital', 'handyman', 'flipping'
  ];

  const assetOptions = [
    'phone', 'computer', 'internet', 'tools', 'kitchen', 'printer', 'spareRoom', 'office space'
  ];

  // No longer needed - suggestions now has different structure

  return (
    <section id="quick-cash" className="scroll-mt-4">
      <Card>
        <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Ask Felix</h3>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            <Zap className="mr-1" size={12} />
            Emergency Mode
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assessment Quiz */}
          <div className="space-y-4">
            <h4 className="font-medium">Current Situation Assessment</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Tell Felix about your situation, skills, and what you have available. 
              He'll suggest realistic opportunities to earn cash in the next 24-72 hours.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="cash-by" className="text-sm">When do you need cash?</Label>
                <Select
                  value={requirements.needCashBy}
                  onValueChange={(value) => 
                    setRequirements(prev => ({ ...prev, needCashBy: value }))
                  }
                >
                  <SelectTrigger className="w-32" data-testid="select-cash-deadline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cashByOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="free-hours" className="text-sm">Free hours?</Label>
                <Select
                  value={requirements.freeHours}
                  onValueChange={(value) => 
                    setRequirements(prev => ({ ...prev, freeHours: value }))
                  }
                >
                  <SelectTrigger className="w-32" data-testid="select-time-available">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="transport" className="text-sm">Transport?</Label>
                <Select
                  value={requirements.transport}
                  onValueChange={(value) => 
                    setRequirements(prev => ({ ...prev, transport: value }))
                  }
                >
                  <SelectTrigger className="w-32" data-testid="select-transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transportOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="people-comfort" className="text-sm">People comfort?</Label>
                <Select
                  value={requirements.peopleComfort}
                  onValueChange={(value) => 
                    setRequirements(prev => ({ ...prev, peopleComfort: value }))
                  }
                >
                  <SelectTrigger className="w-32" data-testid="select-people-comfort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="has-items" className="text-sm">Items to sell?</Label>
                <Switch
                  id="has-items"
                  checked={requirements.itemsToSell}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, itemsToSell: checked }))
                  }
                  data-testid="switch-has-items"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="lift-heavy" className="text-sm">Lift heavy?</Label>
                <Switch
                  id="lift-heavy"
                  checked={requirements.physical.canLiftHeavy}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ 
                      ...prev, 
                      physical: { ...prev.physical, canLiftHeavy: checked }
                    }))
                  }
                  data-testid="switch-lift-heavy"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="prefer-indoors" className="text-sm">Prefer indoors?</Label>
                <Switch
                  id="prefer-indoors"
                  checked={requirements.physical.preferIndoors}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ 
                      ...prev, 
                      physical: { ...prev.physical, preferIndoors: checked }
                    }))
                  }
                  data-testid="switch-prefer-indoors"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <Label htmlFor="online-ok" className="text-sm">Online tasks OK?</Label>
                <Switch
                  id="online-ok"
                  checked={requirements.onlineOk}
                  onCheckedChange={(checked) => 
                    setRequirements(prev => ({ ...prev, onlineOk: checked }))
                  }
                  data-testid="switch-online-ok"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Skills you can offer:</Label>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => (
                    <Button
                      key={skill}
                      type="button"
                      variant={requirements.skills.includes(skill) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setRequirements(prev => ({
                          ...prev,
                          skills: prev.skills.includes(skill)
                            ? prev.skills.filter(s => s !== skill)
                            : [...prev.skills, skill]
                        }));
                      }}
                      data-testid={`skill-${skill}`}
                      className="text-xs h-8"
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tools/assets you have:</Label>
                <div className="flex flex-wrap gap-2">
                  {assetOptions.map((asset) => (
                    <Button
                      key={asset}
                      type="button"
                      variant={requirements.assets.includes(asset) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setRequirements(prev => ({
                          ...prev,
                          assets: prev.assets.includes(asset)
                            ? prev.assets.filter(a => a !== asset)
                            : [...prev.assets, asset]
                        }));
                      }}
                      data-testid={`asset-${asset}`}
                      className="text-xs h-8"
                    >
                      {asset}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleGenerateSuggestions}
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={generateSuggestionsMutation.isPending}
              data-testid="button-generate-suggestions"
            >
              {generateSuggestionsMutation.isPending ? "Thinking..." : "Ask Felix"}
            </Button>
          </div>
          
          {/* Generated Suggestions */}
          <div className="space-y-4">
            <h4 className="font-medium">Felix's Suggestions</h4>
            
            {!showSuggestions ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Complete the assessment and Felix will find opportunities for you.</p>
              </div>
            ) : (
              <>
                {/* Smart results badge - only show if AI was used */}
                {suggestions.aiGenerated && suggestions.results && suggestions.results.length > 0 && (
                  <div className="mb-4 p-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      ✨ Enhanced results with personalized suggestions
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {!suggestions.results || suggestions.results.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>{suggestions.message || "No suggestions match your current situation."}</p>
                      {suggestions.tips && (
                        <div className="text-sm mt-2 space-y-1">
                          <p className="font-medium">Try:</p>
                          {suggestions.tips.map((tip: string, idx: number) => (
                            <p key={idx}>• {tip}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Top Matches */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Top matches (best fit now)</h5>
                        <div className="space-y-3">
                          {suggestions.results.map((result: any, index: number) => (
                            <div key={result.id} className="border border-border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <h6 className="font-medium text-sm">{result.title}</h6>
                                </div>
                                <span className="text-sm font-medium text-green-600">
                                  {result.est}
                                </span>
                              </div>
                              <div className="text-xs text-blue-600 mb-2">
                                Why: {result.why} • {result.cashBy}
                              </div>
                              {result.notes && (
                                <p className="text-xs text-muted-foreground mb-3">{result.notes}</p>
                              )}
                              {result.steps && result.steps.length > 0 && (
                                <div className="space-y-1 mb-3">
                                  <p className="text-xs font-medium">How to start:</p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {result.steps.slice(0, 2).map((step: string, stepIdx: number) => (
                                      <li key={stepIdx} className="flex items-start">
                                        <span className="mr-1">•</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                  {result.tags && result.tags.slice(0, 2).map((tag: string, tagIdx: number) => (
                                    <Badge key={tagIdx} variant="outline" className="text-xs px-2 py-1">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button 
                                    size="sm" 
                                    variant={startedOpportunities.includes(result.id) ? "default" : "outline"} 
                                    onClick={() => handleStartOpportunity(result)}
                                    data-testid={`button-start-${index}`}
                                    className={`flex-1 ${startedOpportunities.includes(result.id) ? "bg-green-600 hover:bg-green-700" : ""}`}
                                  >
                                    {startedOpportunities.includes(result.id) ? (
                                      <>
                                        <CheckCircle size={14} className="mr-1" />
                                        Log Income
                                      </>
                                    ) : (
                                      "Start Now"
                                    )}
                                  </Button>
                                  {startedOpportunities.includes(result.id) && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => {
                                        setStartedOpportunities(prev => prev.filter(id => id !== result.id));
                                        toast({
                                          title: "Opportunity reset",
                                          description: "You can start this opportunity again later.",
                                        });
                                      }}
                                      data-testid={`button-reset-${index}`}
                                      className="sm:flex-initial text-gray-600 border-gray-300 hover:bg-gray-50"
                                    >
                                      Reset
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Related Options */}
                      {suggestions.related && suggestions.related.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm text-muted-foreground">Related options (if you can be flexible)</h5>
                          <div className="space-y-3">
                            {suggestions.related.map((result: any, index: number) => (
                              <div key={result.id} className="border border-dashed border-border rounded-lg p-4 bg-muted/20">
                                <div className="flex items-center justify-between mb-2">
                                  <h6 className="font-medium text-sm">{result.title}</h6>
                                  <span className="text-sm font-medium text-orange-600">
                                    {result.est}
                                  </span>
                                </div>
                                <div className="text-xs text-orange-600 mb-2">
                                  {result.why} • {result.cashBy}
                                </div>
                                {result.notes && (
                                  <p className="text-xs text-muted-foreground mb-2">{result.notes}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-1">
                                    {result.tags && result.tags.slice(0, 2).map((tag: string, tagIdx: number) => (
                                      <Badge key={tagIdx} variant="secondary" className="text-xs px-2 py-1">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button 
                                      size="sm" 
                                      variant={startedOpportunities.includes(result.id) ? "default" : "secondary"} 
                                      onClick={() => handleStartOpportunity(result)}
                                      data-testid={`button-related-${index}`}
                                      className={`flex-1 ${startedOpportunities.includes(result.id) ? "bg-green-600 hover:bg-green-700" : ""}`}
                                    >
                                      {startedOpportunities.includes(result.id) ? (
                                        <>
                                          <CheckCircle size={14} className="mr-1" />
                                          Log Income
                                        </>
                                      ) : (
                                        "Consider"
                                      )}
                                    </Button>
                                    {startedOpportunities.includes(result.id) && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => {
                                          setStartedOpportunities(prev => prev.filter(id => id !== result.id));
                                          toast({
                                            title: "Opportunity reset",
                                            description: "You can start this opportunity again later.",
                                          });
                                        }}
                                        data-testid={`button-related-reset-${index}`}
                                        className="sm:flex-initial text-gray-600 border-gray-300 hover:bg-gray-50"
                                      >
                                        Reset
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {suggestions.results && suggestions.results.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <Calculator className="inline mr-2" size={16} />
                      <strong>Personalized matching</strong> • Never zero results • Category diversity
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Income Logging Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="mr-2 text-green-600" size={20} />
              Log Income from {selectedOpportunity?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="income-amount">Amount Earned ($)</Label>
              <Input
                id="income-amount"
                type="number"
                placeholder="0.00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                data-testid="input-quick-cash-income"
                className="mt-1"
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowIncomeDialog(false);
                  setIncomeAmount('');
                }}
                data-testid="button-cancel-income"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogIncome}
                disabled={addIncomeMutation.isPending}
                data-testid="button-save-income"
                className="bg-green-600 hover:bg-green-700"
              >
                {addIncomeMutation.isPending ? "Saving..." : "Log Income"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}


