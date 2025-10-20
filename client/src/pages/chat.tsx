import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  message: string;
  timestamp: Date;
}

export default function Chat() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: aiSettings } = useQuery<{ geminiEnabled: boolean }>({
    queryKey: ["/api/ai/settings"],
    enabled: isAuthenticated,
  });

  const { data: conversationHistory } = useQuery<Array<{ message: string; aiResponse: string; createdAt: Date }>>({
    queryKey: ["/api/ai/memory"],
    enabled: isAuthenticated,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0) {
      const loadedMessages: ChatMessage[] = [];
      conversationHistory.forEach((item, index) => {
        loadedMessages.push({
          id: `user-${index}`,
          sender: "user",
          message: item.message,
          timestamp: new Date(item.createdAt),
        });
        loadedMessages.push({
          id: `ai-${index}`,
          sender: "ai",
          message: item.aiResponse,
          timestamp: new Date(item.createdAt),
        });
      });
      setMessages(loadedMessages);
    }
  }, [conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", "/api/ai/chat", { message });
    },
    onSuccess: (data: { response: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          message: data.response,
          timestamp: new Date(),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/memory"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== `user-${Date.now()}`));
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    if (!aiSettings?.geminiEnabled) {
      toast({
        title: "AI Chat Disabled",
        description: "Gemini AI chat is currently disabled by the administrator.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      message: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto h-full flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Support Chat</h1>
            <p className="text-muted-foreground">Get instant help from Gemini AI</p>
          </div>
          <Badge
            variant={aiSettings?.geminiEnabled ? "default" : "destructive"}
            className="flex items-center gap-2"
            data-testid="badge-ai-status"
          >
            {aiSettings?.geminiEnabled ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Gemini AI Online
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Gemini AI Offline
              </>
            )}
          </Badge>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              Ask me anything about your support needs. I have access to your conversation history.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Start a conversation</h3>
                      <p className="text-muted-foreground">
                        I'm here to help! Ask me anything about your support needs.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.sender}`}
                    >
                      {msg.sender === "ai" && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p
                          className={`text-xs mt-2 ${
                            msg.sender === "user"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                      {msg.sender === "user" && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                )}
                {chatMutation.isPending && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-secondary text-secondary-foreground">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 p-4 border-t border-border bg-card/50 backdrop-blur">
              <div className="flex gap-2">
                <Input
                  placeholder={
                    aiSettings?.geminiEnabled
                      ? "Type your message..."
                      : "AI chat is currently disabled"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={chatMutation.isPending || !aiSettings?.geminiEnabled}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending || !aiSettings?.geminiEnabled}
                  data-testid="button-send-message"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {!aiSettings?.geminiEnabled && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Gemini AI is currently disabled. Please contact support or try again later.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
