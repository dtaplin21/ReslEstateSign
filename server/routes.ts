import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { parseRealEstateDocument } from "./openai";
import { docusignService } from "./docusign";
import { sendDocumentNotification, sendDocumentCompletedNotification, sendUsageAlertNotification } from "./sendgrid";
import { insertRecipientSchema, insertDocumentSchema, insertDocumentRecipientSchema } from "@shared/schema";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const recipients = await storage.getRecipients(userId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  app.post('/api/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const file = req.file;
      const { emailSubject, emailMessage, recipients: recipientsData } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Record document usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      await storage.recordUsage({
        userId,
        recordType: "document",
        recordMonth: currentMonth,
        count: 1,
      });

      // Create document record
      const documentData = {
        userId,
        name: file.originalname.replace('.pdf', ''),
        filename: file.originalname,
        fileSize: file.size,
        emailSubject: emailSubject || `Please sign: ${file.originalname}`,
        emailMessage: emailMessage || '',
        status: 'processing',
      };

      const document = await storage.createDocument(documentData);

      // Process document with AI in background
      try {
        // Record AI usage
        await storage.recordUsage({
          userId,
          recordType: "ai_request",
          recordMonth: currentMonth,
          count: 1,
        });

        // Convert PDF to text (simplified - in production use proper PDF parsing)
        const documentText = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 10000));
        const aiParsingData = await parseRealEstateDocument(documentText, file.originalname);

        // Update document with AI parsing results
        await storage.updateDocument(document.id, {
          aiParsingData,
          documentType: aiParsingData.documentType,
          propertyAddress: aiParsingData.propertyAddress,
          propertyValue: aiParsingData.propertyValue ? String(aiParsingData.propertyValue) : null,
          status: 'pending',
        });

        // Parse recipients data if provided
        if (recipientsData) {
          const recipients = JSON.parse(recipientsData);
          for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            
            // Create or find recipient
            let existingRecipient = await storage.getRecipients(userId);
            let recipientRecord = existingRecipient.find(r => r.email === recipient.email);
            
            if (!recipientRecord) {
              recipientRecord = await storage.createRecipient({
                userId,
                name: recipient.name,
                email: recipient.email,
                phone: recipient.phone || '',
                role: recipient.role,
              });
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

            // Update document with envelope ID
            await storage.updateDocument(document.id, {
              docusignEnvelopeId: envelope.envelopeId,
              status: 'pending',
            });

            // Record envelope usage
            await storage.recordUsage({
              userId,
              recordType: "envelope",
              recordMonth: currentMonth,
              count: 1,
            });

            // Send notification emails
            for (const recipient of recipients) {
              await sendDocumentNotification(
                recipient.email,
                recipient.name,
                document.name,
                req.user.claims?.first_name || 'Agent',
                document.emailMessage || undefined
              );
            }

          } catch (docusignError) {
            console.error("DocuSign error:", docusignError);
            await storage.updateDocument(document.id, { status: 'failed' });
          }
        }

      } catch (aiError) {
        console.error("AI parsing error:", aiError);
        await storage.updateDocument(document.id, { status: 'failed' });
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
        const userId = req.user.claims.sub;
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

        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });

        // Use default price ID or from environment
        const priceId = process.env.STRIPE_PRICE_ID || 'price_default';

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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getUsageForMonth(userId, currentMonth);
      
      // Get user's plan limits (would come from subscription plan)
      const planLimits = {
        documents: 200,
        envelopes: 500,
        aiRequests: 1000,
      };

      const usageWithLimits = {
        documents: { current: usage.documents, limit: planLimits.documents, percentage: Math.round((usage.documents / planLimits.documents) * 100) },
        envelopes: { current: usage.envelopes, limit: planLimits.envelopes, percentage: Math.round((usage.envelopes / planLimits.envelopes) * 100) },
        aiRequests: { current: usage.aiRequests, limit: planLimits.aiRequests, percentage: Math.round((usage.aiRequests / planLimits.aiRequests) * 100) },
      };

      res.json(usageWithLimits);
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
