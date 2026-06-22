import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botsTable = pgTable("bots", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("inactive"),
  token: text("token").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  avatar: text("avatar"),
  commandCount: integer("command_count").notNull().default(0),
  pluginCount: integer("plugin_count").notNull().default(0),
  userCount: integer("user_count").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBotSchema = createInsertSchema(botsTable).omit({ createdAt: true, updatedAt: true });
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof botsTable.$inferSelect;
