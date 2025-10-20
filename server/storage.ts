import {
  users,
  tickets,
  ticketReplies,
  userAiMemory,
  aiSettings,
  faqKnowledge,
  type User,
  type UpsertUser,
  type Ticket,
  type InsertTicket,
  type TicketReply,
  type InsertTicketReply,
  type UserAiMemory,
  type InsertUserAiMemory,
  type AiSettings,
  type InsertAiSettings,
  type FaqKnowledge,
  type InsertFaqKnowledge,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - required for Replit Auth and local auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(user: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User>;

  // Ticket operations
  getTickets(userId: string): Promise<Ticket[]>;
  getAllTickets(): Promise<Ticket[]>;
  getTicket(id: number, userId: string): Promise<Ticket | undefined>;
  getTicketById(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, userId: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  updateTicketAsAdmin(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<void>;

  // Ticket reply operations
  getTicketReplies(ticketId: number): Promise<TicketReply[]>;
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;

  // AI memory operations
  getUserAiMemory(userId: string): Promise<UserAiMemory[]>;
  createAiMemory(memory: InsertUserAiMemory): Promise<UserAiMemory>;

  // AI settings operations
  getAiSettings(): Promise<AiSettings | undefined>;
  updateAiSettings(enabled: boolean): Promise<AiSettings>;
  updateAiSettingsWithPdf(enabled: boolean, pdfUrl: string | null): Promise<AiSettings>;

  // User blocking operations
  blockUser(userId: string): Promise<User | undefined>;
  unblockUser(userId: string): Promise<User | undefined>;
  isUserBlocked(userId: string): Promise<boolean>;

  // FAQ knowledge operations
  getFaqKnowledge(): Promise<FaqKnowledge[]>;
  createFaqKnowledge(faq: InsertFaqKnowledge): Promise<FaqKnowledge>;
  deleteFaqKnowledge(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth and local auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Ticket operations
  async getTickets(userId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: number, userId: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.userId, userId)));
    return ticket;
  }

  async getTicketById(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(ticketData: InsertTicket): Promise<Ticket> {
    const [ticket] = await db
      .insert(tickets)
      .values(ticketData)
      .returning();
    return ticket;
  }

  async updateTicket(id: number, userId: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const [ticket] = await db
      .update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(tickets.id, id), eq(tickets.userId, userId)))
      .returning();
    return ticket;
  }

  async updateTicketAsAdmin(id: number, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const [ticket] = await db
      .update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async deleteTicket(id: number): Promise<void> {
    await db
      .delete(tickets)
      .where(eq(tickets.id, id));
  }

  // Ticket reply operations
  async getTicketReplies(ticketId: number): Promise<TicketReply[]> {
    return await db
      .select()
      .from(ticketReplies)
      .where(eq(ticketReplies.ticketId, ticketId))
      .orderBy(ticketReplies.createdAt);
  }

  async createTicketReply(replyData: InsertTicketReply): Promise<TicketReply> {
    const [reply] = await db
      .insert(ticketReplies)
      .values(replyData)
      .returning();
    return reply;
  }

  // AI memory operations
  async getUserAiMemory(userId: string): Promise<UserAiMemory[]> {
    return await db
      .select()
      .from(userAiMemory)
      .where(eq(userAiMemory.userId, userId))
      .orderBy(desc(userAiMemory.createdAt))
      .limit(10);
  }

  async createAiMemory(memoryData: InsertUserAiMemory): Promise<UserAiMemory> {
    const [memory] = await db
      .insert(userAiMemory)
      .values(memoryData)
      .returning();
    return memory;
  }

  // AI settings operations
  async getAiSettings(): Promise<AiSettings | undefined> {
    const [settings] = await db.select().from(aiSettings).limit(1);
    
    // If no settings exist, create default
    if (!settings) {
      const [newSettings] = await db
        .insert(aiSettings)
        .values({ geminiEnabled: true })
        .returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateAiSettings(enabled: boolean): Promise<AiSettings> {
    const existing = await this.getAiSettings();
    
    if (existing) {
      const [updated] = await db
        .update(aiSettings)
        .set({ geminiEnabled: enabled, updatedAt: new Date() })
        .where(eq(aiSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiSettings)
        .values({ geminiEnabled: enabled })
        .returning();
      return created;
    }
  }

  async updateAiSettingsWithPdf(enabled: boolean, pdfUrl: string | null): Promise<AiSettings> {
    const existing = await this.getAiSettings();
    
    if (existing) {
      const [updated] = await db
        .update(aiSettings)
        .set({ geminiEnabled: enabled, faqPdfUrl: pdfUrl, updatedAt: new Date() })
        .where(eq(aiSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiSettings)
        .values({ geminiEnabled: enabled, faqPdfUrl: pdfUrl })
        .returning();
      return created;
    }
  }

  // User blocking operations
  async blockUser(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async unblockUser(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isBlocked || false;
  }

  // FAQ knowledge operations
  async getFaqKnowledge(): Promise<FaqKnowledge[]> {
    return await db
      .select()
      .from(faqKnowledge)
      .orderBy(desc(faqKnowledge.createdAt));
  }

  async createFaqKnowledge(faqData: InsertFaqKnowledge): Promise<FaqKnowledge> {
    const [faq] = await db
      .insert(faqKnowledge)
      .values(faqData)
      .returning();
    return faq;
  }

  async deleteFaqKnowledge(id: number): Promise<void> {
    await db
      .delete(faqKnowledge)
      .where(eq(faqKnowledge.id, id));
  }
}

export const storage = new DatabaseStorage();
