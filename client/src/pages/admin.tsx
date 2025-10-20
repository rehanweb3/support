import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Settings, RefreshCw, ShieldAlert } from "lucide-react";
import type { Ticket } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteTicketId, setDeleteTicketId] = useState<number | null>(null);

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch all tickets (admin only)
  const { data: tickets, isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/admin/tickets");
      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }
      return response.json();
    },
  });

  // Fetch AI settings
  const { data: aiSettings, isLoading: settingsLoading } = useQuery<{ geminiEnabled: boolean }>({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const response = await fetch("/api/ai/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch AI settings");
      }
      return response.json();
    },
  });

  // Update ticket status
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }
      return response.json();
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-tickets"] });
      const previousTickets = queryClient.getQueryData<Ticket[]>(["admin-tickets"]);
      
      queryClient.setQueryData<Ticket[]>(["admin-tickets"], (old) =>
        old?.map((ticket) =>
          ticket.id === id ? { ...ticket, status } : ticket
        )
      );
      
      return { previousTickets };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["admin-tickets"], context.previousTickets);
      }
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  // Delete ticket
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete ticket");
      }
      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-tickets"] });
      const previousTickets = queryClient.getQueryData<Ticket[]>(["admin-tickets"]);
      
      queryClient.setQueryData<Ticket[]>(["admin-tickets"], (old) =>
        old?.filter((ticket) => ticket.id !== id)
      );
      
      return { previousTickets };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["admin-tickets"], context.previousTickets);
      }
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
      setDeleteTicketId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  // Toggle AI
  const toggleAiMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error("Failed to update AI settings");
      }
      return response.json();
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ["ai-settings"] });
      const previousSettings = queryClient.getQueryData<{ geminiEnabled: boolean }>(["ai-settings"]);
      
      queryClient.setQueryData<{ geminiEnabled: boolean }>(["ai-settings"], {
        geminiEnabled: enabled,
      });
      
      return { previousSettings };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["ai-settings"], context.previousSettings);
      }
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI settings updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      pending: "secondary",
      completed: "outline",
      resolved: "outline",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage tickets and system settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gemini AI Settings
          </CardTitle>
          <CardDescription>
            Control the AI chat assistant for all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Switch
              id="ai-toggle"
              checked={aiSettings?.geminiEnabled ?? false}
              onCheckedChange={(checked) => toggleAiMutation.mutate(checked)}
              disabled={settingsLoading || toggleAiMutation.isPending}
            />
            <Label htmlFor="ai-toggle" className="cursor-pointer">
              {aiSettings?.geminiEnabled ? "Gemini AI is enabled" : "Gemini AI is disabled"}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>
                Manage all support tickets from users
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-tickets"] })}
              disabled={ticketsLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <div className="text-center py-8">Loading tickets...</div>
          ) : tickets && tickets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{ticket.id}</TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.userId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) =>
                            updateTicketMutation.mutate({ id: ticket.id, status: value })
                          }
                          disabled={updateTicketMutation.isPending}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue>{getStatusBadge(ticket.status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTicketId(ticket.id)}
                          disabled={deleteTicketMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tickets found
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTicketId !== null} onOpenChange={() => setDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTicketId && deleteTicketMutation.mutate(deleteTicketId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
