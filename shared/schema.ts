import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  serial,
  integer,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  country: varchar("country"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Tickets table
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Ticket replies table
export const ticketReplies = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  sender: varchar("sender", { length: 50 }).notNull(),
  senderName: varchar("sender_name", { length: 100 }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;

// AI memory table for conversation context
export const userAiMemory = pgTable("user_ai_memory", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  aiResponse: text("ai_response").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserAiMemorySchema = createInsertSchema(userAiMemory).omit({
  id: true,
  createdAt: true,
});

export type InsertUserAiMemory = z.infer<typeof insertUserAiMemorySchema>;
export type UserAiMemory = typeof userAiMemory.$inferSelect;

// AI settings table for admin controls
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  geminiEnabled: boolean("gemini_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAiSettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
export type AiSettings = typeof aiSettings.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets),
  aiMemory: many(userAiMemory),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  replies: many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketReplies.ticketId],
    references: [tickets.id],
  }),
}));

export const userAiMemoryRelations = relations(userAiMemory, ({ one }) => ({
  user: one(users, {
    fields: [userAiMemory.userId],
    references: [users.id],
  }),
}));
