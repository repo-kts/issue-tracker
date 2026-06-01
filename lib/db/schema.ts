import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  lastNotificationsReadAt: integer("last_notifications_read_at", {
    mode: "timestamp_ms",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role"),
  color: text("color").notNull().default("#f97316"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  description: text("description"),
  projectUrl: text("project_url"),
  logoPath: text("logo_path"),
  brandColor: text("brand_color"),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  slug: text("slug").notNull().unique(),
  freeIterationLimit: integer("free_iteration_limit").notNull().default(5),
  paidIterations: integer("paid_iterations").notNull().default(0),
  status: text("status", { enum: ["active", "paused", "archived"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const issues = sqliteTable("issues", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  iterationNumber: integer("iteration_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  submitterName: text("submitter_name"),
  status: text("status", { enum: ["open", "in_progress", "resolved", "rejected"] })
    .notNull()
    .default("open"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] })
    .notNull()
    .default("normal"),
  etaAt: integer("eta_at", { mode: "timestamp_ms" }),
  billable: integer("billable", { mode: "boolean" }).notNull().default(false),
  ownerNotes: text("owner_notes"),
  clientApprovedAt: integer("client_approved_at", { mode: "timestamp_ms" }),
  clientApprovedBy: text("client_approved_by"),
  assigneeId: text("assignee_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
});

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  issueId: text("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  messageId: text("message_id"), // when set, attachment belongs to a reply, not the original issue
  kind: text("kind", { enum: ["image", "video", "audio", "file", "link"] }).notNull(),
  filename: text("filename").notNull(),
  storedPath: text("stored_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  issueId: text("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: [
      "created",
      "status_changed",
      "message",
      "reopened",
      "attachment_added",
      "assigned",
    ],
  }).notNull(),
  actorType: text("actor_type", { enum: ["owner", "client", "system"] }).notNull(),
  actorName: text("actor_name").notNull(),
  metadata: text("metadata"), // JSON: {from, to, messageId, attachmentCount, ...}
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  issueId: text("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  authorType: text("author_type", { enum: ["owner", "client"] }).notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  amountPaise: integer("amount_paise").notNull(),
  iterationsPurchased: integer("iterations_purchased").notNull(),
  status: text("status", { enum: ["created", "paid", "failed"] })
    .notNull()
    .default("created"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Event = typeof events.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
