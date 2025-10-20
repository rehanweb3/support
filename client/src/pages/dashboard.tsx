import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { Ticket as TicketType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
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

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets"],
    enabled: isAuthenticated,
  });

  const { data: aiSettings } = useQuery<{ geminiEnabled: boolean }>({
    queryKey: ["/api/ai/settings"],
    enabled: isAuthenticated,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Ticket className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-chart-3 text-chart-3";
      case "resolved":
        return "bg-chart-4 text-card";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const openTickets = tickets?.filter(t => t.status === "open").length || 0;
  const pendingTickets = tickets?.filter(t => t.status === "pending").length || 0;
  const resolvedTickets = tickets?.filter(t => t.status === "resolved").length || 0;

  if (authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your support overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-open-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-open-count">{openTickets}</div>
            <p className="text-xs text-muted-foreground">Active support requests</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">{pendingTickets}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card data-testid="card-resolved-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-resolved-count">{resolvedTickets}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate active-elevate-2 transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>AI Support Chat</CardTitle>
                <CardDescription>
                  {aiSettings?.geminiEnabled
                    ? "Get instant answers from Gemini AI"
                    : "AI chat is currently disabled"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/chat">
              <Button className="w-full" data-testid="button-start-chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start AI Chat
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-elevate active-elevate-2 transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Ticket className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>My Tickets</CardTitle>
                <CardDescription>View and manage your support tickets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/tickets">
              <Button variant="outline" className="w-full" data-testid="button-view-tickets">
                <Ticket className="h-4 w-4 mr-2" />
                View All Tickets
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {ticketsLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </CardContent>
        </Card>
      ) : tickets && tickets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Your latest support requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tickets.slice(0, 5).map((ticket) => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                  <div
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate active-elevate-2 cursor-pointer transition-all"
                    data-testid={`ticket-item-${ticket.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {getStatusIcon(ticket.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {ticket.description}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No tickets yet</h3>
                <p className="text-muted-foreground">
                  Start a conversation with our AI or create your first support ticket
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/chat">
                  <Button data-testid="button-empty-chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with AI
                  </Button>
                </Link>
                <Link href="/tickets/new">
                  <Button variant="outline" data-testid="button-empty-create">
                    <Ticket className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
