import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getOidcConfig, updateUserSession } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import { generateAIResponse } from "./gemini";
import { z } from "zod";
import { insertTicketSchema, insertTicketReplySchema, insertUserAiMemorySchema } from "@shared/schema";
import passport from "passport";
import * as client from "openid-client";

// Unified authentication middleware that supports both Replit Auth and local auth
const isAuthenticatedLocal: RequestHandler = async (req: any, res, next) => {
  // Check if user is authenticated via passport (local or Replit)
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // For Replit Auth users, check token expiration and refresh if needed
  if (user.claims && user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      // Token is expired - try to refresh if possible
      if (!user.refresh_token) {
        // No refresh token available - session is invalid
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, user.refresh_token);
        updateUserSession(user, tokenResponse);
      } catch (error) {
        // Refresh failed - session is invalid
        return res.status(401).json({ message: "Unauthorized" });
      }
    }
  }
  
  return next();
};

const isAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
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
  // Auth middleware - setup both Replit Auth and Local Auth
  await setupAuth(app);
  setupLocalAuth();

  // Local Auth routes
  app.post('/api/local/signup', (req, res, next) => {
    passport.authenticate('local-signup', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Server error during signup" });
      }
      if (!user) {
        return res.status(400).json({ message: info?.message || "Signup failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Error logging in after signup" });
        }
        res.status(201).json({ user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
      });
    })(req, res, next);
  });

  app.post('/api/local/login', (req, res, next) => {
    passport.authenticate('local-login', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Server error during login" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Error logging in" });
        }
        res.json({ user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
      });
    })(req, res, next);
  });

  app.post('/api/local/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Auth routes (works for both Replit Auth and Local Auth)
  app.get('/api/auth/user', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Ticket routes
  app.get('/api/tickets', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const tickets = await storage.getTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get('/api/tickets/:id', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
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

  app.post('/api/tickets', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
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
  app.get('/api/tickets/:id/replies', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
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

  app.post('/api/tickets/:id/replies', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
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
  app.post('/api/ai/chat', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
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

  app.get('/api/ai/memory', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const memory = await storage.getUserAiMemory(userId);
      res.json(memory.reverse());
    } catch (error) {
      console.error("Error fetching AI memory:", error);
      res.status(500).json({ message: "Failed to fetch conversation history" });
    }
  });

  // AI settings routes (admin only for updates)
  app.get('/api/ai/settings', isAuthenticatedLocal, async (req: any, res) => {
    try {
      const settings = await storage.getAiSettings();
      res.json({ geminiEnabled: settings?.geminiEnabled ?? true });
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.post('/api/ai/settings', isAuthenticatedLocal, isAdmin, async (req: any, res) => {
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
  app.get('/api/admin/tickets', isAuthenticatedLocal, isAdmin, async (req: any, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching all tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get('/api/admin/tickets/:id', isAuthenticatedLocal, isAdmin, async (req: any, res) => {
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

  app.patch('/api/admin/tickets/:id', isAuthenticatedLocal, isAdmin, async (req: any, res) => {
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

  app.delete('/api/admin/tickets/:id', isAuthenticatedLocal, isAdmin, async (req: any, res) => {
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
