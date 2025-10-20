import {
  users,
  tickets,
  ticketReplies,
  userAiMemory,
  aiSettings,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
}

export const storage = new DatabaseStorage();
