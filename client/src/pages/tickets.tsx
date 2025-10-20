import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Plus, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import type { Ticket as TicketType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tickets() {
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

  const { data: tickets, isLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets"],
    enabled: isAuthenticated,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-5 w-5" />;
      case "pending":
        return <Clock className="h-5 w-5" />;
      case "resolved":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Ticket className="h-5 w-5" />;
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-muted-foreground">View and manage all your support tickets</p>
        </div>
        <Link href="/tickets/new">
          <Button data-testid="button-create-ticket">
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card
                className="hover-elevate active-elevate-2 cursor-pointer transition-all h-full"
                data-testid={`ticket-card-${ticket.id}`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <CardTitle className="text-base line-clamp-1">
                        {ticket.subject}
                      </CardTitle>
                    </div>
                    <Badge className={getStatusColor(ticket.status)} data-testid={`badge-status-${ticket.id}`}>
                      {ticket.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {ticket.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ID: #{ticket.id}</span>
                    <span className="text-muted-foreground" data-testid={`text-date-${ticket.id}`}>
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No tickets yet</h3>
                <p className="text-muted-foreground">
                  Create your first support ticket to get started
                </p>
              </div>
              <Link href="/tickets/new">
                <Button data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Ticket
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
