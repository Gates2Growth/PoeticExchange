import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
});

export const poems = pgTable("poems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  tags: text("tags").array(),
  visibility: text("visibility").notNull().default("shared"),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  poemId: integer("poem_id").notNull(),
  imageData: text("image_data").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  poemId: integer("poem_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  parentId: integer("parent_id"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  imageData: text("image_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertPoemSchema = createInsertSchema(poems).pick({
  title: true,
  content: true,
  userId: true,
  tags: true,
  visibility: true,
});

export const insertImageSchema = createInsertSchema(images).pick({
  poemId: true,
  imageData: true,
  caption: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  poemId: true,
  userId: true,
  content: true,
  parentId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  imageData: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type Poem = typeof poems.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Message = typeof messages.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPoem = z.infer<typeof insertPoemSchema>;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Extended schemas for frontend validation
export const poemFormSchema = insertPoemSchema.extend({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  content: z.string().min(1, "Content is required"),
});

export const commentFormSchema = insertCommentSchema.extend({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment must be less than 1000 characters"),
});

export const messageFormSchema = insertMessageSchema.extend({
  content: z.string().min(1, "Message cannot be empty").max(1000, "Message must be less than 1000 characters"),
});
