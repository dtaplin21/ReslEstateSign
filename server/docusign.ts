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

  constructor() {
    // Use demo environment for OAuth integration
    this.baseUrl = process.env.DOCUSIGN_BASE_URL || "https://demo.docusign.net/restapi";
  }

  // Method to handle user OAuth connection
  async connectUserAccount(userId: string, authCode: string): Promise<void> {
    // In production, this would:
    // 1. Exchange auth code for access token
    // 2. Store user's access token in database
    // 3. Store user's account ID
    console.log(`User ${userId} connected DocuSign account with code: ${authCode}`);
  }

  // Method to get user's stored credentials
  private async getUserCredentials(userId: string): Promise<{ accessToken: string; accountId: string } | null> {
    // In production, this would fetch from database
    // For now, return null to use mock
    return null;
  }

  async createEnvelope(request: CreateEnvelopeRequest, userId?: string): Promise<DocuSignEnvelope> {
    try {
      // Check if user has connected their DocuSign account
      if (userId) {
        const userCreds = await this.getUserCredentials(userId);
        if (userCreds) {
          // Use real DocuSign API with user's credentials
          return await this.createRealEnvelope(request, userCreds);
        }
      }
      
      // Fall back to mock implementation
      return await this.createMockEnvelope(request);
      
    } catch (error) {
      console.error("Error creating DocuSign envelope:", error);
      throw new Error("Failed to create DocuSign envelope: " + (error as Error).message);
    }
  }

  private async createMockEnvelope(request: CreateEnvelopeRequest): Promise<DocuSignEnvelope> {
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
  }

  private async createRealEnvelope(request: CreateEnvelopeRequest, userCreds: { accessToken: string; accountId: string }): Promise<DocuSignEnvelope> {
    // In production, this would make real DocuSign API calls
    // For now, return mock but log that real API would be used
    console.log(`Would create real DocuSign envelope for user with account: ${userCreds.accountId}`);
    return await this.createMockEnvelope(request);
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
