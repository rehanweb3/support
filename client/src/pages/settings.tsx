import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Bot } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const { data: aiSettings, isLoading } = useQuery<{ geminiEnabled: boolean }>({
    queryKey: ["/api/ai/settings"],
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("POST", "/api/ai/settings", { enabled });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/settings"] });
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
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (enabled: boolean) => {
    updateMutation.mutate(enabled);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your platform settings and preferences</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <SettingsIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure your account and platform preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>Control Gemini AI chat functionality</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="gemini-toggle" className="text-base font-medium">
                  Enable Gemini AI Chat
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to interact with the AI support assistant. When disabled, chat functionality will be unavailable.
                </p>
              </div>
              <Switch
                id="gemini-toggle"
                checked={aiSettings?.geminiEnabled ?? true}
                onCheckedChange={handleToggle}
                disabled={isLoading || updateMutation.isPending}
                data-testid="switch-gemini-enabled"
              />
            </div>

            {aiSettings?.geminiEnabled === false && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ AI Chat Disabled
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Users will see an error message when trying to use the chat feature. Enable it to restore functionality.
                </p>
              </div>
            )}

            {aiSettings?.geminiEnabled === true && (
              <div className="p-4 rounded-lg bg-chart-4/10 border border-chart-4/20">
                <p className="text-sm text-chart-4 font-medium">
                  ✓ AI Chat Active
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Users can now interact with the Gemini AI assistant for instant support.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
