import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set - emails will be logged instead of sent");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      // Log email instead of sending for development
      console.log("=== EMAIL WOULD BE SENT ===");
      console.log(`To: ${params.to}`);
      console.log(`From: ${params.from}`);
      console.log(`Subject: ${params.subject}`);
      console.log(`Content: ${params.text || params.html}`);
      console.log("========================");
      return true;
    }

    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || "",
      html: params.html || "",
    });
    
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendDocumentNotification(
  recipientEmail: string,
  recipientName: string,
  documentName: string,
  senderName: string,
  customMessage?: string
): Promise<boolean> {
  const subject = `Please sign: ${documentName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Document Signature Required</h2>
      <p>Hello ${recipientName},</p>
      <p>${senderName} has sent you a document that requires your signature:</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>${documentName}</strong>
      </div>
      ${customMessage ? `<p><em>${customMessage}</em></p>` : ''}
      <p>Please review and sign the document at your earliest convenience.</p>
      <p>Thank you,<br>DocuSign Pro Team</p>
    </div>
  `;

  return await sendEmail({
    to: recipientEmail,
    from: process.env.FROM_EMAIL || 'noreply@docusignpro.com',
    subject,
    html,
  });
}

export async function sendDocumentCompletedNotification(
  agentEmail: string,
  agentName: string,
  documentName: string,
  propertyAddress: string
): Promise<boolean> {
  const subject = `Document Completed: ${documentName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Document Signing Complete!</h2>
      <p>Hello ${agentName},</p>
      <p>Great news! The following document has been fully executed:</p>
      <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
        <strong>${documentName}</strong><br>
        <span style="color: #666;">${propertyAddress}</span>
      </div>
      <p>All parties have successfully signed the document. You can download the completed document from your dashboard.</p>
      <p>Best regards,<br>DocuSign Pro Team</p>
    </div>
  `;

  return await sendEmail({
    to: agentEmail,
    from: process.env.FROM_EMAIL || 'noreply@docusignpro.com',
    subject,
    html,
  });
}

export async function sendUsageAlertNotification(
  userEmail: string,
  userName: string,
  usageType: string,
  currentUsage: number,
  limit: number,
  percentageUsed: number
): Promise<boolean> {
  const subject = `Usage Alert: ${percentageUsed}% of ${usageType} limit reached`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ffc107;">Usage Alert</h2>
      <p>Hello ${userName},</p>
      <p>You have used <strong>${percentageUsed}%</strong> of your monthly ${usageType} limit.</p>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <strong>Current Usage:</strong> ${currentUsage} / ${limit} ${usageType}<br>
        <strong>Percentage Used:</strong> ${percentageUsed}%
      </div>
      <p>Consider upgrading your plan to avoid service interruptions.</p>
      <p>Best regards,<br>DocuSign Pro Team</p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    from: process.env.FROM_EMAIL || 'noreply@docusignpro.com',
    subject,
    html,
  });
}

export async function sendDocumentFailedNotification(
  agentEmail: string,
  agentName: string,
  documentName: string,
  errorReason: string
): Promise<boolean> {
  const subject = `Document Processing Failed: ${documentName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Document Processing Failed</h2>
      <p>Hello ${agentName},</p>
      <p>Unfortunately, there was an issue processing your document:</p>
      <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <strong>${documentName}</strong><br>
        <span style="color: #721c24;"><strong>Error:</strong> ${errorReason}</span>
      </div>
      <p>Please try uploading the document again, or contact support if the issue persists.</p>
      <p>Best regards,<br>DocuSign Pro Team</p>
    </div>
  `;

  return await sendEmail({
    to: agentEmail,
    from: process.env.FROM_EMAIL || 'noreply@docusignpro.com',
    subject,
    html,
  });
}

export async function sendDocumentProcessingNotification(
  agentEmail: string,
  agentName: string,
  documentName: string,
  status: string
): Promise<boolean> {
  const subject = `Document Update: ${documentName}`;
  const statusColors: Record<string, string> = {
    processing: '#6c757d',
    pending: '#17a2b8',
    completed: '#28a745',
    failed: '#dc3545'
  };
  
  const statusMessages: Record<string, string> = {
    processing: 'Your document is being processed with AI analysis.',
    pending: 'Your document is ready and has been sent to recipients for signing.',
    completed: 'All parties have signed the document successfully.',
    failed: 'There was an issue processing your document.'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${statusColors[status] || '#6c757d'};">Document Status Update</h2>
      <p>Hello ${agentName},</p>
      <p>Your document status has been updated:</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${statusColors[status] || '#6c757d'};">
        <strong>${documentName}</strong><br>
        <span style="color: ${statusColors[status] || '#6c757d'}; text-transform: uppercase; font-weight: bold;">Status: ${status}</span><br>
        <span style="color: #666;">${statusMessages[status] || 'Status updated.'}</span>
      </div>
      <p>You can check your dashboard for more details and track the signing progress.</p>
      <p>Best regards,<br>DocuSign Pro Team</p>
    </div>
  `;

  return await sendEmail({
    to: agentEmail,
    from: process.env.FROM_EMAIL || 'noreply@docusignpro.com',
    subject,
    html,
  });
}

export async function sendSigningReminderNotification(
  recipientEmail: string,
  recipientName: string,
  documentName: string,
  senderName: string,
  daysWaiting: number
): Promise<boolean> {
  const subject = `Reminder: Please sign ${documentName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ffc107;">Signature Reminder</h2>
      <p>Hello ${recipientName},</p>
      <p>This is a friendly reminder that you have a document waiting for your signature:</p>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <strong>${documentName}</strong><br>
        <span style="color: #856404;">From: ${senderName}</span><br>
        <span style="color: #856404;">Waiting: ${daysWaiting} day${daysWaiting > 1 ? 's' : ''}</span>
      </div>
      <p>Please review and sign the document at your earliest convenience to keep the transaction moving forward.</p>
      <p>Thank you for your attention to this matter.</p>
      <p>Best regards,<br>DocuSign Pro Team</p>
    </div>
  `;

  return await sendEmail({
    to: recipientEmail,
    from: process.env.FROM_EMAIL || 'noreply@docusignpro.com',
    subject,
    html,
  });
}
