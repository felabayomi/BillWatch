import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  actionTaken?: {
    billCreated?: string;
    billUpdated?: string;
    reminderSet?: string;
    query?: string;
  };
}

interface ChatResponse {
  response: string;
  messageType: string;
  actionTaken?: {
    billCreated?: string;
    billUpdated?: string;
    reminderSet?: string;
    query?: string;
  };
}

export function AskFelix() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm Felix, your personal bill assistant. I can help you add bills, check what's due, mark payments, and give you financial insights. Try saying something like 'What bills do I have this week?' or 'Add my electric bill for $120 due on the 15th'.",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversation history
  const { data: conversationHistory } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: isExpanded,
  });

  // Load conversation history when expanded
  useEffect(() => {
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const historyMessages: Message[] = conversationHistory.flatMap((conv: any) => [
        {
          id: `${conv.id}-user`,
          type: 'user' as const,
          content: conv.userMessage,
          timestamp: new Date(conv.createdAt),
        },
        {
          id: `${conv.id}-ai`,
          type: 'ai' as const,
          content: conv.aiResponse,
          timestamp: new Date(conv.createdAt),
          actionTaken: conv.actionTaken,
        }
      ]);
      
      if (historyMessages.length > 0) {
        setMessages([messages[0], ...historyMessages]); // Keep welcome message first
      }
    } else if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length === 0) {
      // If conversation history is explicitly empty, reset to welcome message only
      setMessages([{
        id: '1',
        type: 'ai',
        content: "Hi! I'm Felix, your personal bill assistant. I can help you add bills, check what's due, mark payments, and give you financial insights. Try saying something like 'What bills do I have this week?' or 'Add my electric bill for $120 due on the 15th'.",
        timestamp: new Date(),
      }]);
    }
  }, [conversationHistory]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      try {
        const response = await apiRequest('POST', '/api/chat', { message }, controller.signal);
        clearTimeout(timeoutId);
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onSuccess: (response, userMessage) => {
      const userMsg: Message = {
        id: Date.now().toString() + '-user',
        type: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      
      const aiMsg: Message = {
        id: Date.now().toString() + '-ai',
        type: 'ai',
        content: response.response,
        timestamp: new Date(),
        actionTaken: response.actionTaken,
      };

      setMessages(prev => [...prev, userMsg, aiMsg]);
      
      // Invalidate bills data if bill was created/updated
      if (response.actionTaken?.billCreated || response.actionTaken?.billUpdated) {
        queryClient.invalidateQueries({ queryKey: ['/api/bills'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['/api/bills/stats'], exact: false });
      }
    },
    onError: (error: any) => {
      console.error("Felix error:", error);
      const errorMsg: Message = {
        id: Date.now().toString() + '-error',
        type: 'ai',
        content: error.name === 'AbortError' 
          ? "I'm taking too long to respond. Please try a simpler question or try again." 
          : "Sorry, I'm having trouble processing your request right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    },
  });

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    sendMessageMutation.mutate(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to clear chat history...");
      const response = await apiRequest('DELETE', '/api/conversations');
      console.log("Clear chat response:", response.status);
      return response;
    },
    onSuccess: () => {
      console.log("Chat cleared successfully!");
      setMessages([{
        id: '1',
        type: 'ai',
        content: "Hi! I'm Felix, your personal bill assistant. I can help you add bills, check what's due, mark payments, and give you financial insights. Try saying something like 'What bills do I have this week?' or 'Add my electric bill for $120 due on the 15th'.",
        timestamp: new Date(),
      }]);
      // Force refetch conversation history to bypass cache
      queryClient.removeQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      // Force refetch immediately to get empty conversation list
      queryClient.refetchQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: any) => {
      console.error("Error clearing chat:", error);
      
      // Check if it's an authentication error
      if (error.message && error.message.includes('401')) {
        console.log("Authentication expired, redirecting to login...");
        window.location.href = "/api/login";
        return;
      }
      
      // Still clear locally even if backend fails
      setMessages([{
        id: '1',
        type: 'ai',
        content: "Hi! I'm Felix, your personal bill assistant. I can help you add bills, check what's due, mark payments, and give you financial insights. Try saying something like 'What bills do I have this week?' or 'Add my electric bill for $120 due on the 15th'.",
        timestamp: new Date(),
      }]);
    },
  });

  const handleClearChat = () => {
    clearChatMutation.mutate();
  };

  const getActionBadge = (actionTaken?: Message['actionTaken']) => {
    if (!actionTaken) return null;
    
    if (actionTaken.billCreated) {
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Bill Created</Badge>;
    }
    if (actionTaken.billUpdated) {
      return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Bill Updated</Badge>;
    }
    if (actionTaken.reminderSet) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Reminder Set</Badge>;
    }
    if (actionTaken.query) {
      return <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Search</Badge>;
    }
    return null;
  };

  if (!isExpanded) {
    return (
      <Card className="bg-white shadow-sm" data-testid="ask-felix-collapsed">
        <CardContent className="p-4">
          <Button 
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center gap-2 justify-center"
            variant="outline"
            data-testid="expand-felix-chat"
          >
            <MessageCircle className="h-4 w-4" />
            Ask Felix - Your Bill Assistant
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Chat with Felix to manage bills, get insights, and ask questions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm" data-testid="ask-felix-expanded">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-600" />
            Ask Felix
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearChat}
              title="Clear chat history"
              data-testid="clear-felix-chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
              data-testid="collapse-felix-chat"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <ScrollArea className="h-80 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.type}-${message.id}`}
              >
                <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`
                      rounded-lg px-3 py-2 text-sm
                      ${message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                      }
                    `}
                  >
                    {message.content}
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-1 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-muted-foreground">
                      {format(message.timestamp, 'HH:mm')}
                    </span>
                    {getActionBadge(message.actionTaken)}
                  </div>
                </div>
                
                <div className={`flex items-end ${message.type === 'user' ? 'order-1 mr-2' : 'order-2 ml-2'}`}>
                  {message.type === 'user' ? (
                    <User className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Bot className="h-6 w-6 text-gray-600" />
                  )}
                </div>
              </div>
            ))}
            
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="order-1 max-w-[85%]">
                  <div className="bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Felix is thinking...
                    </div>
                  </div>
                </div>
                <div className="order-2 ml-2 flex items-end">
                  <Bot className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message to Felix..."
            disabled={sendMessageMutation.isPending}
            className="flex-1"
            data-testid="felix-message-input"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
            size="sm"
            data-testid="send-message-button"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setInputValue("What bills do I have this week?")}
            disabled={sendMessageMutation.isPending}
            data-testid="quick-action-this-week"
          >
            Bills this week?
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setInputValue("Show me my spending summary")}
            disabled={sendMessageMutation.isPending}
            data-testid="quick-action-spending"
          >
            Spending summary
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setInputValue("What bills are overdue?")}
            disabled={sendMessageMutation.isPending}
            data-testid="quick-action-overdue"
          >
            Overdue bills?
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}