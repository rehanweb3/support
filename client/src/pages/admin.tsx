import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldAlert, 
  Ticket as TicketIcon, 
  Settings, 
  Users, 
  BookOpen,
  FileText,
  Upload,
  Trash2,
  Ban,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import type { Ticket } from "@shared/schema";
import { Link } from "wouter";

interface User {
  id: string;
  username?: string;
  email?: string;
  isBlocked: boolean;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  source: string;
  createdAt: string;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newFaqOpen, setNewFaqOpen] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [blockUserId, setBlockUserId] = useState("");

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

  const { data: tickets } = useQuery<Ticket[]>({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/admin/tickets");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
  });

  const { data: aiSettings } = useQuery<{ geminiEnabled: boolean }>({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const response = await fetch("/api/ai/settings");
      if (!response.ok) throw new Error("Failed to fetch AI settings");
      return response.json();
    },
  });

  const { data: faqs } = useQuery<FAQ[]>({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/faq");
      if (!response.ok) throw new Error("Failed to fetch FAQs");
      return response.json();
    },
  });

  const toggleAiMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to update AI settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({ title: "Success", description: "AI settings updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update AI settings", variant: "destructive" });
    },
  });

  const analyzePdfMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch("/api/admin/analyze-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: url }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to analyze PDF");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      setPdfUrl("");
      toast({
        title: "Success",
        description: `Extracted ${data.faqs.length} FAQs from PDF`,
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

  const createFaqMutation = useMutation({
    mutationFn: async (faq: { question: string; answer: string }) => {
      const response = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faq),
      });
      if (!response.ok) throw new Error("Failed to create FAQ");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      setNewFaqOpen(false);
      setFaqQuestion("");
      setFaqAnswer("");
      toast({ title: "Success", description: "FAQ created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create FAQ", variant: "destructive" });
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete FAQ");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast({ title: "Success", description: "FAQ deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete FAQ", variant: "destructive" });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to block user");
      return response.json();
    },
    onSuccess: () => {
      setBlockUserId("");
      toast({ title: "Success", description: "User blocked successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to block user", variant: "destructive" });
    },
  });

  const handleAnalyzePdf = async () => {
    if (!pdfUrl.trim()) {
      toast({ title: "Error", description: "Please enter a PDF URL", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      await analyzePdfMutation.mutateAsync(pdfUrl);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ticketStats = tickets ? {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    rejected: tickets.filter(t => t.status === 'rejected').length,
  } : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage tickets, users, and system settings</p>
      </div>

      {ticketStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <TicketIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats.resolved}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">
            <TicketIcon className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="faq">
            <BookOpen className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>View and manage all support tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {tickets && tickets.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Subject</TableHead>
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
                          <TableCell>
                            <Badge variant={
                              ticket.status === 'open' ? 'default' :
                              ticket.status === 'pending' ? 'secondary' :
                              ticket.status === 'resolved' ? 'outline' :
                              'destructive'
                            }>
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/tickets/${ticket.id}`}>
                              <Button variant="ghost" size="sm">
                                View & Reply
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No tickets found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Block or unblock users from creating tickets and using AI chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter User ID to block"
                  value={blockUserId}
                  onChange={(e) => setBlockUserId(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => blockUserMutation.mutate(blockUserId)}
                  disabled={!blockUserId.trim() || blockUserMutation.isPending}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block User
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Blocked users cannot create tickets or use the AI chat feature.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>FAQ Management</CardTitle>
                  <CardDescription>Manage AI knowledge base from PDF or manual entry</CardDescription>
                </div>
                <Button onClick={() => setNewFaqOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Analyze FAQ PDF</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter PDF URL"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAnalyzePdf}
                    disabled={isAnalyzing || !pdfUrl.trim()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isAnalyzing ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI will extract FAQ questions and answers from the PDF automatically
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">FAQ Knowledge Base ({faqs?.length || 0})</h3>
                {faqs && faqs.length > 0 ? (
                  <div className="space-y-3">
                    {faqs.map((faq) => (
                      <Card key={faq.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium mb-2">Q: {faq.question}</p>
                              <p className="text-sm text-muted-foreground mb-2">A: {faq.answer}</p>
                              <Badge variant="outline" className="text-xs">
                                Source: {faq.source}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFaqMutation.mutate(faq.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No FAQs yet. Add manually or analyze a PDF.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gemini AI Settings
              </CardTitle>
              <CardDescription>Control the AI chat assistant for all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Switch
                  id="ai-toggle"
                  checked={aiSettings?.geminiEnabled ?? false}
                  onCheckedChange={(checked) => toggleAiMutation.mutate(checked)}
                  disabled={toggleAiMutation.isPending}
                />
                <Label htmlFor="ai-toggle" className="cursor-pointer">
                  {aiSettings?.geminiEnabled ? "Gemini AI is enabled" : "Gemini AI is disabled"}
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={newFaqOpen} onOpenChange={setNewFaqOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New FAQ</DialogTitle>
            <DialogDescription>
              Add a question and answer to the AI knowledge base
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                placeholder="What is..."
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
              />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea
                placeholder="The answer is..."
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFaqOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createFaqMutation.mutate({ question: faqQuestion, answer: faqAnswer })}
              disabled={!faqQuestion.trim() || !faqAnswer.trim() || createFaqMutation.isPending}
            >
              Add FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
