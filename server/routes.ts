import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateAIResponse } from "./gemini";
import { z } from "zod";
import { insertTicketSchema, insertTicketReplySchema, insertUserAiMemorySchema } from "@shared/schema";

const isAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Ticket routes
  app.get('/api/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tickets = await storage.getTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId, userId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post('/api/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTicketSchema.parse({
        ...req.body,
        userId,
        status: 'open',
      });

      const ticket = await storage.createTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Ticket reply routes
  app.get('/api/tickets/:id/replies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      // Verify ticket belongs to user
      const ticket = await storage.getTicket(ticketId, userId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const replies = await storage.getTicketReplies(ticketId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching ticket replies:", error);
      res.status(500).json({ message: "Failed to fetch ticket replies" });
    }
  });

  app.post('/api/tickets/:id/replies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      // Verify ticket belongs to user
      const ticket = await storage.getTicket(ticketId, userId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const user = await storage.getUser(userId);
      const senderName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email || "User";

      const validatedData = insertTicketReplySchema.parse({
        ticketId,
        sender: "user",
        senderName,
        message: req.body.message,
      });

      const reply = await storage.createTicketReply(validatedData);
      
      // Update ticket status to pending if it was open
      if (ticket.status === 'open') {
        await storage.updateTicket(ticketId, userId, { status: 'pending' });
      }

      res.status(201).json(reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reply data", errors: error.errors });
      }
      console.error("Error creating ticket reply:", error);
      res.status(500).json({ message: "Failed to create ticket reply" });
    }
  });

  // AI chat routes
  app.post('/api/ai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Check if AI is enabled
      const settings = await storage.getAiSettings();
      if (!settings?.geminiEnabled) {
        return res.status(503).json({ message: "Gemini AI is currently disabled" });
      }

      // Get conversation history
      const history = await storage.getUserAiMemory(userId);
      const conversationHistory = history.reverse().map(m => ({
        message: m.message,
        aiResponse: m.aiResponse,
      }));

      // Generate AI response
      const aiResponse = await generateAIResponse({
        userId,
        message,
        history: conversationHistory,
      });

      // Store in memory
      await storage.createAiMemory({
        userId,
        message,
        aiResponse,
      });

      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to process AI chat" });
    }
  });

  app.get('/api/ai/memory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memory = await storage.getUserAiMemory(userId);
      res.json(memory.reverse());
    } catch (error) {
      console.error("Error fetching AI memory:", error);
      res.status(500).json({ message: "Failed to fetch conversation history" });
    }
  });

  // AI settings routes (admin only for updates)
  app.get('/api/ai/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getAiSettings();
      res.json({ geminiEnabled: settings?.geminiEnabled ?? true });
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.post('/api/ai/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }

      const settings = await storage.updateAiSettings(enabled);
      res.json({ geminiEnabled: settings.geminiEnabled });
    } catch (error) {
      console.error("Error updating AI settings:", error);
      res.status(500).json({ message: "Failed to update AI settings" });
    }
  });

  // Admin routes
  app.get('/api/admin/tickets', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching all tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get('/api/admin/tickets/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicketById(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.patch('/api/admin/tickets/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const { status, subject, description } = req.body;
      const updates: any = {};
      
      if (status) updates.status = status;
      if (subject) updates.subject = subject;
      if (description) updates.description = description;

      const ticket = await storage.updateTicketAsAdmin(ticketId, updates);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  app.delete('/api/admin/tickets/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      await storage.deleteTicket(ticketId);
      res.json({ message: "Ticket deleted successfully" });
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
