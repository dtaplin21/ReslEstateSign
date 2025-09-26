import {
  users,
  recipients,
  documents,
  documentRecipients,
  usageRecords,
  subscriptionPlans,
  billingRecords,
  emailNotifications,
  type User,
  type UpsertUser,
  type Recipient,
  type InsertRecipient,
  type Document,
  type InsertDocument,
  type DocumentRecipient,
  type InsertDocumentRecipient,
  type UsageRecord,
  type InsertUsageRecord,
  type SubscriptionPlan,
  type BillingRecord,
  type InsertBillingRecord,
  type EmailNotification,
  type InsertEmailNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;

  // Recipients operations
  getRecipients(userId: string): Promise<Recipient[]>;
  createRecipient(recipient: InsertRecipient): Promise<Recipient>;
  updateRecipient(id: string, recipient: Partial<Recipient>): Promise<Recipient>;
  deleteRecipient(id: string): Promise<void>;

  // Documents operations
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Document recipients operations
  getDocumentRecipients(documentId: string): Promise<(DocumentRecipient & { recipient: Recipient })[]>;
  addDocumentRecipient(documentRecipient: InsertDocumentRecipient): Promise<DocumentRecipient>;
  updateDocumentRecipientStatus(id: string, status: string, signedAt?: Date): Promise<DocumentRecipient>;

  // Usage tracking
  getUsageForMonth(userId: string, month: string): Promise<{ documents: number; envelopes: number; aiRequests: number }>;
  recordUsage(usage: InsertUsageRecord): Promise<UsageRecord>;

  // Subscription plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;

  // Billing operations
  createBillingRecord(billing: InsertBillingRecord): Promise<BillingRecord>;
  getBillingHistory(userId: string): Promise<BillingRecord[]>;

  // Email notifications
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  updateEmailNotificationStatus(id: string, status: string, sentAt?: Date): Promise<EmailNotification>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
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

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Recipients operations
  async getRecipients(userId: string): Promise<Recipient[]> {
    return await db.select().from(recipients).where(eq(recipients.userId, userId)).orderBy(desc(recipients.createdAt));
  }

  async createRecipient(recipient: InsertRecipient): Promise<Recipient> {
    const [newRecipient] = await db.insert(recipients).values(recipient).returning();
    return newRecipient;
  }

  async updateRecipient(id: string, recipient: Partial<Recipient>): Promise<Recipient> {
    const [updatedRecipient] = await db
      .update(recipients)
      .set({ ...recipient, updatedAt: new Date() })
      .where(eq(recipients.id, id))
      .returning();
    return updatedRecipient;
  }

  async deleteRecipient(id: string): Promise<void> {
    await db.delete(recipients).where(eq(recipients.id, id));
  }

  // Documents operations
  async getDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Document recipients operations
  async getDocumentRecipients(documentId: string): Promise<(DocumentRecipient & { recipient: Recipient })[]> {
    return await db
      .select({
        id: documentRecipients.id,
        documentId: documentRecipients.documentId,
        recipientId: documentRecipients.recipientId,
        signingOrder: documentRecipients.signingOrder,
        status: documentRecipients.status,
        signedAt: documentRecipients.signedAt,
        createdAt: documentRecipients.createdAt,
        recipient: recipients,
      })
      .from(documentRecipients)
      .innerJoin(recipients, eq(documentRecipients.recipientId, recipients.id))
      .where(eq(documentRecipients.documentId, documentId))
      .orderBy(documentRecipients.signingOrder);
  }

  async addDocumentRecipient(documentRecipient: InsertDocumentRecipient): Promise<DocumentRecipient> {
    const [newDocumentRecipient] = await db.insert(documentRecipients).values(documentRecipient).returning();
    return newDocumentRecipient;
  }

  async updateDocumentRecipientStatus(id: string, status: string, signedAt?: Date): Promise<DocumentRecipient> {
    const [updatedDocumentRecipient] = await db
      .update(documentRecipients)
      .set({ status, signedAt })
      .where(eq(documentRecipients.id, id))
      .returning();
    return updatedDocumentRecipient;
  }

  // Usage tracking
  async getUsageForMonth(userId: string, month: string): Promise<{ documents: number; envelopes: number; aiRequests: number }> {
    const usage = await db
      .select({
        recordType: usageRecords.recordType,
        totalCount: sql<number>`sum(${usageRecords.count})`,
      })
      .from(usageRecords)
      .where(and(eq(usageRecords.userId, userId), eq(usageRecords.recordMonth, month)))
      .groupBy(usageRecords.recordType);

    const result = { documents: 0, envelopes: 0, aiRequests: 0 };
    usage.forEach((record) => {
      if (record.recordType === "document") result.documents = Number(record.totalCount);
      if (record.recordType === "envelope") result.envelopes = Number(record.totalCount);
      if (record.recordType === "ai_request") result.aiRequests = Number(record.totalCount);
    });

    return result;
  }

  async recordUsage(usage: InsertUsageRecord): Promise<UsageRecord> {
    // Try to increment existing record or create new one
    const existing = await db
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, usage.userId),
          eq(usageRecords.recordType, usage.recordType),
          eq(usageRecords.recordMonth, usage.recordMonth)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updatedRecord] = await db
        .update(usageRecords)
        .set({ count: sql`${usageRecords.count} + ${usage.count || 1}` })
        .where(eq(usageRecords.id, existing[0].id))
        .returning();
      return updatedRecord;
    } else {
      const [newRecord] = await db.insert(usageRecords).values(usage).returning();
      return newRecord;
    }
  }

  // Subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.price);
  }

  async getUserSubscriptionPlan(userId: string): Promise<SubscriptionPlan | null> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) return null;
    
    if (!user[0].subscriptionPlan) return null;
    
    const plan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user[0].subscriptionPlan)).limit(1);
    return plan.length > 0 ? plan[0] : null;
  }

  // Usage enforcement functions
  async checkUsageLimits(userId: string, recordType: 'document' | 'envelope' | 'ai_request'): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await this.getUsageForMonth(userId, currentMonth);
    const plan = await this.getUserSubscriptionPlan(userId);
    
    if (!plan) {
      return { allowed: false, current: 0, limit: 0, message: "No subscription plan found" };
    }

    let current: number, limit: number;
    switch (recordType) {
      case 'document':
        current = usage.documents;
        limit = plan.documentsLimit;
        break;
      case 'envelope':
        current = usage.envelopes;
        limit = plan.envelopesLimit;
        break;
      case 'ai_request':
        current = usage.aiRequests;
        limit = plan.aiRequestsLimit;
        break;
    }

    const allowed = current < limit;
    const message = allowed ? undefined : `You have reached your ${recordType} limit of ${limit} for this month. Upgrade your plan to continue.`;
    
    return { allowed, current, limit, message };
  }

  async canPerformAction(userId: string, actionType: 'upload_document' | 'create_envelope' | 'ai_request'): Promise<{ allowed: boolean; message?: string }> {
    // Map action types to record types
    const recordTypeMap: Record<string, 'document' | 'envelope' | 'ai_request'> = {
      'upload_document': 'document',
      'create_envelope': 'envelope', 
      'ai_request': 'ai_request'
    };

    const recordType = recordTypeMap[actionType];
    if (!recordType) {
      return { allowed: false, message: "Invalid action type" };
    }

    const result = await this.checkUsageLimits(userId, recordType);
    return { allowed: result.allowed, message: result.message };
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  // Billing operations
  async createBillingRecord(billing: InsertBillingRecord): Promise<BillingRecord> {
    const [newBilling] = await db.insert(billingRecords).values(billing).returning();
    return newBilling;
  }

  async getBillingHistory(userId: string): Promise<BillingRecord[]> {
    return await db
      .select()
      .from(billingRecords)
      .where(eq(billingRecords.userId, userId))
      .orderBy(desc(billingRecords.billingDate));
  }

  // Email notifications
  async createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    const [newNotification] = await db.insert(emailNotifications).values(notification).returning();
    return newNotification;
  }

  async updateEmailNotificationStatus(id: string, status: string, sentAt?: Date): Promise<EmailNotification> {
    const [updatedNotification] = await db
      .update(emailNotifications)
      .set({ status, sentAt })
      .where(eq(emailNotifications.id, id))
      .returning();
    return updatedNotification;
  }
}

export const storage = new DatabaseStorage();
