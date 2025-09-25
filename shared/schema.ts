import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  decimal,
  boolean,
  index,
} from "drizzle-orm/pg-core";
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
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  brokerage: varchar("brokerage"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionPlan: varchar("subscription_plan").default("starter"),
  subscriptionStatus: varchar("subscription_status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  documentsLimit: integer("documents_limit").notNull(),
  envelopesLimit: integer("envelopes_limit").notNull(),
  aiRequestsLimit: integer("ai_requests_limit").notNull(),
  storageLimit: integer("storage_limit").notNull(), // in GB
  features: jsonb("features").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipients management
export const recipients = pgTable("recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  role: varchar("role").notNull(), // buyer, seller, agent, witness
  documentsSignedCount: integer("documents_signed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  filename: varchar("filename").notNull(),
  documentType: varchar("document_type"), // purchase_agreement, listing_agreement, etc.
  propertyAddress: varchar("property_address"),
  propertyValue: decimal("property_value", { precision: 12, scale: 2 }),
  status: varchar("status").default("processing"), // processing, pending, completed, failed
  fileUrl: varchar("file_url"),
  filePath: varchar("file_path"),
  fileSize: integer("file_size"),
  docusignEnvelopeId: varchar("docusign_envelope_id"),
  aiParsingData: jsonb("ai_parsing_data"),
  emailSubject: varchar("email_subject"),
  emailMessage: text("email_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document recipients (many-to-many relationship)
export const documentRecipients = pgTable("document_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  recipientId: varchar("recipient_id").notNull().references(() => recipients.id),
  signingOrder: integer("signing_order").default(1),
  status: varchar("status").default("pending"), // pending, sent, signed, declined
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage tracking
export const usageRecords = pgTable("usage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recordType: varchar("record_type").notNull(), // document, envelope, ai_request
  recordMonth: varchar("record_month").notNull(), // YYYY-MM format
  count: integer("count").default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Billing records
export const billingRecords = pgTable("billing_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: varchar("description").notNull(),
  status: varchar("status").notNull(), // paid, pending, failed
  billingDate: timestamp("billing_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email notifications log
export const emailNotifications = pgTable("email_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentId: varchar("document_id").references(() => documents.id),
  recipientEmail: varchar("recipient_email").notNull(),
  emailType: varchar("email_type").notNull(), // document_sent, reminder, completion
  subject: varchar("subject").notNull(),
  status: varchar("status").default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertRecipient = typeof recipients.$inferInsert;
export type Recipient = typeof recipients.$inferSelect;

export type InsertDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;

export type InsertDocumentRecipient = typeof documentRecipients.$inferInsert;
export type DocumentRecipient = typeof documentRecipients.$inferSelect;

export type InsertUsageRecord = typeof usageRecords.$inferInsert;
export type UsageRecord = typeof usageRecords.$inferSelect;

export type InsertBillingRecord = typeof billingRecords.$inferInsert;
export type BillingRecord = typeof billingRecords.$inferSelect;

export type InsertEmailNotification = typeof emailNotifications.$inferInsert;
export type EmailNotification = typeof emailNotifications.$inferSelect;

// Zod schemas
export const insertRecipientSchema = createInsertSchema(recipients).omit({
  id: true,
  documentsSignedCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentRecipientSchema = createInsertSchema(documentRecipients).omit({
  id: true,
  status: true,
  signedAt: true,
  createdAt: true,
});
