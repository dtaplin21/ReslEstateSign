import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface DocumentParsingResult {
  documentType: string;
  propertyAddress: string;
  propertyValue: number | null;
  signers: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  signatureFields: Array<{
    signerName: string;
    fieldType: string;
    page: number;
    coordinates: { x: number; y: number };
  }>;
  keyTerms: {
    closingDate?: string;
    purchasePrice?: number;
    earnestMoney?: number;
    listingPrice?: number;
    commissionRate?: number;
    [key: string]: any;
  };
  confidence: number;
}

export async function parseRealEstateDocument(documentText: string, filename: string): Promise<DocumentParsingResult> {
  try {
    const prompt = `You are an expert real estate document analyzer. Parse the following document and extract key information. The document is named "${filename}".

Analyze this real estate document and return a JSON object with the following structure:
{
  "documentType": "one of: purchase_agreement, listing_agreement, disclosure, addendum, contract, other",
  "propertyAddress": "full property address if found",
  "propertyValue": "numeric value of property price/value or null",
  "signers": [
    {
      "name": "full name of signer",
      "email": "email if found or empty string",
      "role": "one of: buyer, seller, agent, witness, other"
    }
  ],
  "signatureFields": [
    {
      "signerName": "name of person who should sign",
      "fieldType": "one of: signature, initial, date, checkbox",
      "page": 1,
      "coordinates": {"x": 100, "y": 200}
    }
  ],
  "keyTerms": {
    "closingDate": "date string or null",
    "purchasePrice": "numeric value or null",
    "earnestMoney": "numeric value or null",
    "listingPrice": "numeric value or null",
    "commissionRate": "percentage as decimal or null"
  },
  "confidence": "confidence score from 0.0 to 1.0"
}

Document content:
${documentText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert real estate document analyzer. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and set defaults
    return {
      documentType: result.documentType || "other",
      propertyAddress: result.propertyAddress || "",
      propertyValue: result.propertyValue ? Number(result.propertyValue) : null,
      signers: result.signers || [],
      signatureFields: result.signatureFields || [],
      keyTerms: result.keyTerms || {},
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
    };
  } catch (error) {
    console.error("Error parsing document with AI:", error);
    throw new Error("Failed to parse document with AI: " + (error as Error).message);
  }
}

export async function recordAIUsage(userId: string): Promise<void> {
  // Record AI usage for billing purposes
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  
  // This would be called by the storage layer to track usage
  // The actual recording is handled in the storage implementation
}
