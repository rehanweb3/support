import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Shield, Send, Ban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Ticket, TicketReply } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function AdminTicketDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/admin/tickets/:id");
  const ticketId = params?.id;
  const [replyMessage, setReplyMessage] = useState("");

  const { data: ticket, isLoading: ticketLoading } = useQuery<Ticket>({
    queryKey: ["admin-ticket", ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/tickets/${ticketId}`);
      if (!response.ok) throw new Error("Failed to fetch ticket");
      return response.json();
    },
    enabled: !!ticketId,
  });

  const { data: replies, isLoading: repliesLoading } = useQuery<TicketReply[]>({
    queryKey: ["admin-ticket-replies", ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}/replies`);
      if (!response.ok) throw new Error("Failed to fetch replies");
      return response.json();
    },
    enabled: !!ticketId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast({
        title: "Success",
        description: "Ticket status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/admin/tickets/${ticketId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reply");
      }
      return response.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-replies", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      toast({
        title: "Success",
        description: "Reply sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendReply = () => {
    if (!replyMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    replyMutation.mutate(replyMessage);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-yellow-500 text-white";
      case "resolved":
        return "bg-green-500 text-white";
      case "closed":
        return "bg-gray-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
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

  const canReply = ticket && (ticket.status === 'open' || ticket.status === 'pending');
  const isClosed = ticket && (ticket.status === 'closed' || ticket.status === 'rejected' || ticket.status === 'resolved');

  if (ticketLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-lg">Ticket not found</h3>
              <Link href="/admin">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Ticket #{ticket.id}</h1>
          <p className="text-muted-foreground">Admin View</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                  <CardDescription>
                    User ID: {ticket.userId}
                  </CardDescription>
                </div>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
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
                          ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                          : "bg-card border border-border"
                      }`}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={reply.sender === "admin" ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"}>
                          {reply.sender === "admin" ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-medium">
                            {reply.sender === "admin" ? "Admin Support" : (reply.senderName || "User")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No replies yet</p>
                </div>
              )}

              {isClosed && (
                <Alert className="mt-6" variant="destructive">
                  <Ban className="h-4 w-4" />
                  <AlertDescription>
                    This ticket is {ticket.status}. Cannot send more replies.
                  </AlertDescription>
                </Alert>
              )}

              {canReply && (
                <div className="mt-6 space-y-4">
                  <div className="border-t pt-6">
                    <label className="text-sm font-medium mb-2 block">Admin Reply</label>
                    <Textarea
                      placeholder="Type your response to the user..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={4}
                      className="mb-3"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={replyMutation.isPending || !replyMessage.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {replyMutation.isPending ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
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
                <p className="text-sm text-muted-foreground">Ticket ID</p>
                <p className="text-sm font-medium mt-1">#{ticket.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="text-sm font-medium mt-1 break-all">{ticket.userId}</p>
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
        </div>
      </div>
    </div>
  );
}
