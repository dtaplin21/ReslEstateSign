// Mock DocuSign integration for MVP
// In production, this would use the actual DocuSign SDK

export interface DocuSignEnvelope {
  envelopeId: string;
  status: string;
  emailSubject: string;
  emailBlurb: string;
  documents: Array<{
    documentId: string;
    name: string;
    fileExtension: string;
  }>;
  recipients: Array<{
    recipientId: string;
    name: string;
    email: string;
    roleName: string;
    routingOrder: number;
  }>;
}

export interface DocuSignSigner {
  name: string;
  email: string;
  role: string;
  routingOrder: number;
}

export interface CreateEnvelopeRequest {
  documentName: string;
  documentContent: Buffer | string;
  emailSubject: string;
  emailMessage: string;
  signers: DocuSignSigner[];
}

export class DocuSignService {
  private baseUrl: string;
  private accountId: string;

  constructor() {
    // In production, these would come from environment variables
    this.baseUrl = process.env.DOCUSIGN_BASE_URL || "https://demo.docusign.net/restapi";
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID || "mock-account-id";
  }

  async createEnvelope(request: CreateEnvelopeRequest): Promise<DocuSignEnvelope> {
    try {
      // Mock implementation for MVP
      // In production, this would use the actual DocuSign API
      
      const mockEnvelopeId = `envelope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const envelope: DocuSignEnvelope = {
        envelopeId: mockEnvelopeId,
        status: "sent",
        emailSubject: request.emailSubject,
        emailBlurb: request.emailMessage,
        documents: [
          {
            documentId: "1",
            name: request.documentName,
            fileExtension: "pdf",
          },
        ],
        recipients: request.signers.map((signer, index) => ({
          recipientId: `recipient_${index + 1}`,
          name: signer.name,
          email: signer.email,
          roleName: signer.role,
          routingOrder: signer.routingOrder,
        })),
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`Mock DocuSign envelope created: ${mockEnvelopeId}`);
      return envelope;
      
    } catch (error) {
      console.error("Error creating DocuSign envelope:", error);
      throw new Error("Failed to create DocuSign envelope: " + (error as Error).message);
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<{ status: string; recipients: Array<{ email: string; status: string; signedDateTime?: string }> }> {
    try {
      // Mock implementation
      const statuses = ["sent", "delivered", "completed"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        status: randomStatus,
        recipients: [
          {
            email: "recipient@example.com",
            status: randomStatus === "completed" ? "completed" : "sent",
            signedDateTime: randomStatus === "completed" ? new Date().toISOString() : undefined,
          },
        ],
      };
    } catch (error) {
      console.error("Error getting envelope status:", error);
      throw new Error("Failed to get envelope status: " + (error as Error).message);
    }
  }

  async sendReminder(envelopeId: string, recipientEmail: string): Promise<void> {
    try {
      // Mock implementation
      console.log(`Mock reminder sent for envelope ${envelopeId} to ${recipientEmail}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error sending reminder:", error);
      throw new Error("Failed to send reminder: " + (error as Error).message);
    }
  }
}

export const docusignService = new DocuSignService();
