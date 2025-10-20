import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Clock, CheckCircle, User, Shield } from "lucide-react";
import type { Ticket, TicketReply } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TicketDetail() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, params] = useRoute("/tickets/:id");
  const ticketId = params?.id;

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

  const { data: ticket, isLoading: ticketLoading } = useQuery<Ticket>({
    queryKey: ["/api/tickets", ticketId],
    enabled: isAuthenticated && !!ticketId,
  });

  const { data: replies, isLoading: repliesLoading } = useQuery<TicketReply[]>({
    queryKey: ["/api/tickets", ticketId, "replies"],
    enabled: isAuthenticated && !!ticketId,
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
        return null;
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

  if (authLoading || ticketLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-lg">Ticket not found</h3>
              <Link href="/tickets">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tickets
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Ticket Details</h1>
          <p className="text-muted-foreground">View conversation and replies</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card data-testid="card-ticket-info">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {getStatusIcon(ticket.status)}
                  <div>
                    <CardTitle className="text-xl" data-testid="text-ticket-subject">
                      {ticket.subject}
                    </CardTitle>
                    <CardDescription>Ticket #{ticket.id}</CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(ticket.status)} data-testid="badge-ticket-status">
                  {ticket.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-ticket-description">
                {ticket.description}
              </p>
              <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                Created on {formatDate(ticket.createdAt)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                {replies && replies.length > 0
                  ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
                  : "No replies yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repliesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : replies && replies.length > 0 ? (
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`flex gap-3 p-4 rounded-lg ${
                        reply.sender === "admin"
                          ? "bg-accent/10 border border-accent/20"
                          : "bg-card border border-border"
                      }`}
                      data-testid={`reply-${reply.id}`}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={reply.sender === "admin" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}>
                          {reply.sender === "admin" ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-medium" data-testid={`reply-sender-${reply.id}`}>
                            {reply.sender === "admin" ? "Support Team" : (reply.senderName || "You")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" data-testid={`reply-message-${reply.id}`}>
                          {reply.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No replies yet. Our support team will respond soon.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`${getStatusColor(ticket.status)} mt-1`}>
                  {ticket.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium mt-1">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium mt-1">{formatDate(ticket.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need More Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you need immediate assistance, try our AI chat for instant responses.
              </p>
              <Link href="/chat">
                <Button variant="outline" className="w-full" data-testid="button-go-to-chat">
                  Chat with AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
