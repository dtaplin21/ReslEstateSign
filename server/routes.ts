import type { Express } from "express";
import { createServer, type Server } from "http";
import { promises as fs } from "fs";
import path from "path";
import Stripe from "stripe";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { parseRealEstateDocument } from "./openai";
import { docusignService } from "./docusign";
import { sendDocumentNotification, sendDocumentCompletedNotification, sendUsageAlertNotification, sendDocumentFailedNotification, sendDocumentProcessingNotification, sendSigningReminderNotification } from "./sendgrid";
import { insertRecipientSchema, insertDocumentSchema, insertDocumentRecipientSchema, emailNotifications, documents } from "@shared/schema";
import { db } from "./db";
import { and, eq, desc, sql } from "drizzle-orm";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

// Function to check and send usage alerts
async function checkAndSendUsageAlerts(userId: string): Promise<void> {
  try {
    const alerts = await storage.getUsageThresholdAlerts(userId);
    
    if (alerts.length > 0) {
      // Get user info for email
      const user = await storage.getUser(userId);
      if (!user || !user.email) return;
      
      // Send alerts for each threshold crossed
      for (const alert of alerts) {
        await sendUsageAlertNotification(
          user.email,
          user.firstName || 'User',
          alert.recordType,
          alert.current,
          alert.limit,
          alert.percentage
        );
      }
    }
  } catch (error) {
    console.error("Error checking usage alerts:", error);
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Helper function to save uploaded file
async function saveUploadedFile(fileBuffer: Buffer, originalName: string, userId: string): Promise<{ filePath: string; fileUrl: string }> {
  const uploadsDir = path.join(process.cwd(), 'uploads', userId);
  await fs.mkdir(uploadsDir, { recursive: true });
  
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${sanitizedName}`;
  const filePath = path.join(uploadsDir, fileName);
  
  await fs.writeFile(filePath, fileBuffer);
  
  return {
    filePath: filePath,
    fileUrl: `/uploads/${userId}/${fileName}`
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Serve uploaded files
  app.use('/uploads', isAuthenticated, async (req: any, res, next) => {
    try {
      const userId = req.user.id;
      const requestedPath = req.path;
      const requestedUserId = requestedPath.split('/')[1];
      
      // Only allow users to access their own files
      if (userId !== requestedUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Sanitize and normalize the path
      const relativePath = req.path.replace(/^\/+/, ''); // Remove leading slashes
      const absolutePath = path.join(process.cwd(), 'uploads', relativePath);
      const basePath = path.join(process.cwd(), 'uploads', requestedUserId);
      
      // Ensure the resolved path is within the user's directory
      if (!absolutePath.startsWith(basePath + path.sep) && absolutePath !== basePath) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Attach the safe path to the request
      (req as any).safePath = absolutePath;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }, (req: any, res) => {
    // Serve static files using the safe path
    res.sendFile((req as any).safePath, (err) => {
      if (err) {
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard data
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [documents, usage] = await Promise.all([
        storage.getDocuments(userId),
        storage.getUsageForMonth(userId, currentMonth)
      ]);

      const stats = {
        totalDocuments: documents.length,
        pendingSignatures: documents.filter(doc => doc.status === 'pending').length,
        completed: documents.filter(doc => doc.status === 'completed').length,
        avgCompletion: 2.3, // Mock average completion time in days
      };

      const recentDocuments = documents.slice(0, 5);

      res.json({
        stats,
        usage,
        recentDocuments,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Recipients routes
  app.get('/api/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recipients = await storage.getRecipients(userId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  app.post('/api/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recipientData = insertRecipientSchema.parse({ ...req.body, userId });
      const recipient = await storage.createRecipient(recipientData);
      res.json(recipient);
    } catch (error) {
      console.error("Error creating recipient:", error);
      res.status(400).json({ message: "Failed to create recipient" });
    }
  });

  app.put('/api/recipients/:id', isAuthenticated, async (req, res) => {
    try {
      const recipient = await storage.updateRecipient(req.params.id, req.body);
      res.json(recipient);
    } catch (error) {
      console.error("Error updating recipient:", error);
      res.status(400).json({ message: "Failed to update recipient" });
    }
  });

  app.delete('/api/recipients/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteRecipient(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recipient:", error);
      res.status(400).json({ message: "Failed to delete recipient" });
    }
  });

  // Documents routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Document upload and processing
  app.post('/api/documents/upload', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      const { emailSubject, emailMessage, recipients: recipientsData } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check usage limits before processing
      const canUpload = await storage.canPerformAction(userId, 'upload_document');
      if (!canUpload.allowed) {
        return res.status(403).json({ 
          message: canUpload.message || "Upload limit exceeded",
          code: "USAGE_LIMIT_EXCEEDED"
        });
      }

      // Record document usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      await storage.recordUsage({
        userId,
        recordType: "document",
        recordMonth: currentMonth,
        count: 1,
      });

      // Check for usage threshold alerts after recording usage
      await checkAndSendUsageAlerts(userId);

      // Save file to disk
      const { filePath, fileUrl } = await saveUploadedFile(file.buffer, file.originalname, userId);

      // Create document record
      const documentData = {
        userId,
        name: file.originalname.replace('.pdf', ''),
        filename: file.originalname,
        fileSize: file.size,
        filePath: filePath,
        fileUrl: fileUrl,
        emailSubject: emailSubject || `Please sign: ${file.originalname}`,
        emailMessage: emailMessage || '',
        status: 'processing',
      };

      const document = await storage.createDocument(documentData);
      console.log(`Document saved: ${document.id} at ${filePath}`);

      // Send processing status notification to agent
      if (req.user.claims?.email) {
        try {
          await sendDocumentProcessingNotification(
            req.user.email,
            req.user?.firstName || 'Agent',
            document.name,
            'processing'
          );
        } catch (emailError) {
          console.error("Failed to send processing notification:", emailError);
        }
      }

      // Process document with AI in background
      try {
        // Extract text from PDF using dynamic import to avoid initialization issues
        let documentText = '';
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(file.buffer);
          documentText = pdfData.text;
          console.log(`Extracted ${documentText.length} characters from PDF: ${file.originalname}`);
        } catch (pdfError) {
          console.error("PDF parsing error, falling back to basic text extraction:", pdfError);
          // Fallback to basic text extraction
          documentText = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 10000));
        }
        
        // Check AI request limits before processing
        const canUseAI = await storage.canPerformAction(userId, 'ai_request');
        if (!canUseAI.allowed) {
          await storage.updateDocument(document.id, { status: 'failed' });
          return res.status(403).json({ 
            message: canUseAI.message || "AI request limit exceeded",
            code: "AI_LIMIT_EXCEEDED"
          });
        }

        const aiParsingData = await parseRealEstateDocument(documentText, file.originalname);

        // Record AI usage
        await storage.recordUsage({
          userId,
          recordType: 'ai_request',
          recordMonth: currentMonth,
          count: 1,
        });

        // Check for usage threshold alerts after recording AI usage
        await checkAndSendUsageAlerts(userId);

        // Update document with AI parsing results
        await storage.updateDocument(document.id, {
          aiParsingData,
          documentType: aiParsingData.documentType,
          propertyAddress: aiParsingData.propertyAddress,
          propertyValue: aiParsingData.propertyValue ? String(aiParsingData.propertyValue) : null,
          status: 'pending',
        });

        // Send pending status notification to agent
        if (req.user?.email) {
          try {
            await sendDocumentProcessingNotification(
              req.user.email,
              req.user?.firstName || 'Agent',
              document.name,
              'pending'
            );
          } catch (emailError) {
            console.error("Failed to send pending notification:", emailError);
          }
        }

        // Parse recipients data if provided
        if (recipientsData) {
          const recipients = JSON.parse(recipientsData);
          
          // Fetch existing recipients once and index by email for efficiency
          const existingRecipients = await storage.getRecipients(userId);
          const recipientsByEmail = existingRecipients.reduce((acc, r) => {
            acc[r.email] = r;
            return acc;
          }, {} as Record<string, any>);
          
          for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            
            // Create or find recipient
            let recipientRecord = recipientsByEmail[recipient.email];
            
            if (!recipientRecord) {
              recipientRecord = await storage.createRecipient({
                userId,
                name: recipient.name,
                email: recipient.email,
                phone: recipient.phone || '',
                role: recipient.role,
              });
              // Add to cache for potential duplicate emails in the same request
              recipientsByEmail[recipient.email] = recipientRecord;
            }

            // Add to document recipients
            await storage.addDocumentRecipient({
              documentId: document.id,
              recipientId: recipientRecord.id,
              signingOrder: i + 1,
            });
          }

          // Create DocuSign envelope
          try {
            // Check envelope creation limits
            const canCreateEnvelope = await storage.canPerformAction(userId, 'create_envelope');
            if (!canCreateEnvelope.allowed) {
              await storage.updateDocument(document.id, { status: 'failed' });
              return res.status(403).json({ 
                message: canCreateEnvelope.message || "Envelope creation limit exceeded",
                code: "ENVELOPE_LIMIT_EXCEEDED"
              });
            }

            const envelope = await docusignService.createEnvelope({
              documentName: document.name,
              documentContent: file.buffer,
              emailSubject: document.emailSubject || `Please sign: ${document.name}`,
              emailMessage: document.emailMessage || '',
              signers: recipients.map((r: any, index: number) => ({
                name: r.name,
                email: r.email,
                role: r.role,
                routingOrder: index + 1,
              })),
            });

            // Record envelope usage after successful creation
            await storage.recordUsage({
              userId,
              recordType: 'envelope',
              recordMonth: currentMonth,
              count: 1,
            });

            // Check for usage threshold alerts after recording envelope usage
            await checkAndSendUsageAlerts(userId);

            // Update document with envelope ID
            await storage.updateDocument(document.id, {
              docusignEnvelopeId: envelope.envelopeId,
              status: 'pending',
            });

            // Send notification emails
            for (const recipient of recipients) {
              await sendDocumentNotification(
                recipient.email,
                recipient.name,
                document.name,
                req.user?.firstName || 'Agent',
                document.emailMessage || undefined
              );
            }

          } catch (docusignError) {
            console.error("DocuSign error:", docusignError);
            await storage.updateDocument(document.id, { status: 'failed' });
            
            // Send failure notification to agent
            if (req.user?.email) {
              try {
                await sendDocumentFailedNotification(
                  req.user.email,
                  req.user?.firstName || 'Agent',
                  document.name,
                  'Envelope creation failed: ' + (docusignError as Error).message
                );
              } catch (emailError) {
                console.error("Failed to send document failure notification:", emailError);
              }
            }
          }
        }

      } catch (aiError) {
        console.error("AI parsing error:", aiError);
        await storage.updateDocument(document.id, { status: 'failed' });
        
        // Send failure notification to agent
        if (req.user?.email) {
          try {
            await sendDocumentFailedNotification(
              req.user.email,
              req.user?.firstName || 'Agent',
              document.name,
              'AI processing failed: ' + (aiError as Error).message
            );
          } catch (emailError) {
            console.error("Failed to send document failure notification:", emailError);
          }
        }
      }

      res.json({ documentId: document.id, message: "Document uploaded and processing started" });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Subscription plans
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Stripe subscription routes
  if (stripe) {
    app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
      try {
        const { planId } = req.body;
        const userId = req.user.id;
        
        // Validate planId
        if (!planId || !['starter', 'professional', 'enterprise'].includes(planId)) {
          return res.status(400).json({ message: "Invalid plan ID" });
        }

        let user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          const invoice = subscription.latest_invoice;
          
          if (typeof invoice === 'object' && invoice && 'payment_intent' in invoice) {
            const paymentIntent = invoice.payment_intent;
            if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
              return res.json({
                subscriptionId: subscription.id,
                clientSecret: paymentIntent.client_secret,
              });
            }
          }
        }

        if (!user.email) {
          return res.status(400).json({ message: 'No user email on file' });
        }

        // Create or retrieve customer
        let customer;
        if (user.stripeCustomerId) {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          });
        }

        // Map planId to Stripe price IDs (using environment variables or defaults)
        const priceMapping = {
          starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_default',
          professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_default', 
          enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_default'
        };

        const priceId = priceMapping[planId as keyof typeof priceMapping];

        console.log(`Creating subscription for user ${userId} with plan ${planId} and price ${priceId}`);

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

        const invoice = subscription.latest_invoice;
        if (typeof invoice === 'object' && invoice && 'payment_intent' in invoice) {
          const paymentIntent = invoice.payment_intent;
          if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: paymentIntent.client_secret,
            });
          }
        }

        res.status(400).json({ message: 'Failed to create subscription' });
      } catch (error) {
        console.error("Stripe subscription error:", error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    });

    // Webhook handler for Stripe events
    app.post('/api/stripe/webhook', async (req, res) => {
      try {
        const event = req.body;

        switch (event.type) {
          case 'invoice.payment_succeeded':
            // Handle successful payment
            console.log('Payment succeeded:', event.data.object);
            break;
          case 'invoice.payment_failed':
            // Handle failed payment
            console.log('Payment failed:', event.data.object);
            break;
          case 'customer.subscription.updated':
            // Handle subscription update
            console.log('Subscription updated:', event.data.object);
            break;
          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("Webhook error:", error);
        res.status(400).json({ message: "Webhook error" });
      }
    });
  }

  // Billing history
  app.get('/api/billing/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const billingHistory = await storage.getBillingHistory(userId);
      res.json(billingHistory);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Usage monitoring and alerts
  app.get('/api/usage/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getUsageForMonth(userId, currentMonth);
      
      // Get user's actual subscription plan limits
      const userPlan = await storage.getUserSubscriptionPlan(userId);
      if (!userPlan) {
        return res.status(404).json({ message: "No subscription plan found" });
      }

      const usageWithLimits = {
        documents: { 
          current: usage.documents, 
          limit: userPlan.documentsLimit, 
          percentage: Math.round((usage.documents / userPlan.documentsLimit) * 100) 
        },
        envelopes: { 
          current: usage.envelopes, 
          limit: userPlan.envelopesLimit, 
          percentage: Math.round((usage.envelopes / userPlan.envelopesLimit) * 100) 
        },
        aiRequests: { 
          current: usage.aiRequests, 
          limit: userPlan.aiRequestsLimit, 
          percentage: Math.round((usage.aiRequests / userPlan.aiRequestsLimit) * 100) 
        },
        planName: userPlan.name,
        planPrice: userPlan.price
      };

      res.json(usageWithLimits);
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  // Reminder system endpoint
  app.post('/api/reminders/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { daysThreshold = 3 } = req.body; // Default to 3 days
      
      // Get all pending documents for this user
      const documents = await storage.getDocuments(userId);
      const pendingDocuments = documents.filter(doc => doc.status === 'pending');
      
      let remindersSent = 0;
      const currentDate = new Date();
      
      for (const document of pendingDocuments) {
        // Get document recipients
        const docRecipients = await storage.getDocumentRecipients(document.id);
        const pendingRecipients = docRecipients.filter(dr => dr.status === 'pending');
        
        for (const docRecipient of pendingRecipients) {
          // Check if enough days have passed since document creation
          if (!document.createdAt) continue;
          const daysWaiting = Math.floor((currentDate.getTime() - new Date(document.createdAt).getTime()) / (1000 * 3600 * 24));
          
          if (daysWaiting >= daysThreshold) {
            // Check if we've already sent a reminder recently (within last 2 days)
            const recentReminder = await db
              .select()
              .from(emailNotifications)
              .where(
                and(
                  eq(emailNotifications.userId, userId),
                  eq(emailNotifications.emailType, 'signing_reminder'),
                  eq(emailNotifications.recipientEmail, docRecipient.recipient.email),
                  eq(emailNotifications.documentId, document.id)
                )
              )
              .orderBy(desc(emailNotifications.sentAt))
              .limit(1);
            
            const shouldSendReminder = recentReminder.length === 0 || 
              (recentReminder[0].sentAt && (currentDate.getTime() - new Date(recentReminder[0].sentAt).getTime()) > (2 * 24 * 60 * 60 * 1000));
            
            if (shouldSendReminder) {
              // Send reminder
              const success = await sendSigningReminderNotification(
                docRecipient.recipient.email,
                docRecipient.recipient.name,
                document.name,
                req.user?.firstName || 'Agent',
                daysWaiting
              );
              
              if (success) {
                // Record the reminder
                await storage.createEmailNotification({
                  userId,
                  emailType: 'signing_reminder',
                  recipientEmail: docRecipient.recipient.email,
                  subject: `Reminder: Please sign ${document.name}`,
                  status: 'sent',
                  documentId: document.id,
                  sentAt: new Date(),
                });
                remindersSent++;
              }
            }
          }
        }
      }
      
      res.json({ 
        message: `Sent ${remindersSent} signing reminders`,
        remindersSent,
        documentsChecked: pendingDocuments.length
      });
    } catch (error) {
      console.error("Error sending reminders:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  // Auto-schedule reminder checks (every 6 hours)
  setInterval(async () => {
    try {
      console.log("Running scheduled reminder check...");
      
      // Get all users with pending documents
      const pendingDocs = await db
        .select({ userId: documents.userId })
        .from(documents)
        .where(eq(documents.status, 'pending'))
        .groupBy(documents.userId);
      
      for (const doc of pendingDocs) {
        // Simulate reminder check for each user
        const documents = await storage.getDocuments(doc.userId);
        const pendingDocuments = documents.filter(d => d.status === 'pending');
        
        let remindersSent = 0;
        const currentDate = new Date();
        
        for (const document of pendingDocuments) {
          const docRecipients = await storage.getDocumentRecipients(document.id);
          const pendingRecipients = docRecipients.filter(dr => dr.status === 'pending');
          
          for (const docRecipient of pendingRecipients) {
            if (!document.createdAt) continue;
            const daysWaiting = Math.floor((currentDate.getTime() - new Date(document.createdAt).getTime()) / (1000 * 3600 * 24));
            
            if (daysWaiting >= 3) {
              // Check for recent reminders
              const recentReminder = await db
                .select()
                .from(emailNotifications)
                .where(
                  and(
                    eq(emailNotifications.userId, doc.userId),
                    eq(emailNotifications.emailType, 'signing_reminder'),
                    eq(emailNotifications.recipientEmail, docRecipient.recipient.email)
                  )
                )
                .orderBy(desc(emailNotifications.sentAt))
                .limit(1);
              
              const shouldSendReminder = recentReminder.length === 0 || 
                (recentReminder[0].sentAt && (currentDate.getTime() - new Date(recentReminder[0].sentAt).getTime()) > (2 * 24 * 60 * 60 * 1000));
              
              if (shouldSendReminder) {
                const user = await storage.getUser(doc.userId);
                if (user) {
                  const success = await sendSigningReminderNotification(
                    docRecipient.recipient.email,
                    docRecipient.recipient.name,
                    document.name,
                    user.firstName || 'Agent',
                    daysWaiting
                  );
                  
                  if (success) {
                    await storage.createEmailNotification({
                      userId: doc.userId,
                      recipientEmail: docRecipient.recipient.email,
                      emailType: 'signing_reminder',
                      subject: `Reminder: Please sign ${document.name}`,
                      status: 'sent',
                      documentId: document.id,
                      sentAt: new Date(),
                    });
                    remindersSent++;
                  }
                }
              }
            }
          }
        }
        
        if (remindersSent > 0) {
          console.log(`Sent ${remindersSent} automatic reminders for user ${doc.userId}`);
        }
      }
    } catch (error) {
      console.error("Error in scheduled reminder check:", error);
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours

  const httpServer = createServer(app);
  return httpServer;
}
