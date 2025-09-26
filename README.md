# Real Estate DocuSign SaaS Platform

An AI-powered document processing and e-signature platform designed for real estate professionals.

## Features

- **AI Document Parsing**: Automatically extract property details and signature fields
- **Subscription Billing**: Tiered pricing with usage tracking and enforcement
- **Email Notifications**: Automated status updates, reminders, and usage alerts
- **E-Signature Integration**: DocuSign API integration for professional workflows
- **Usage Analytics**: Comprehensive tracking and reporting
- **Real Estate Focused**: Purpose-built for real estate document workflows

## Deployment on Vercel

This project is configured for deployment on Vercel with serverless functions.

### Environment Variables

Set the following environment variables in your Vercel dashboard:

```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# Authentication
SESSION_SECRET=your_session_secret

# AI & Email Services
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key

# Stripe (Payment Processing)
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_publishable_key

# DocuSign (Optional)
DOCUSIGN_INTEGRATION_KEY=your_docusign_integration_key
DOCUSIGN_USER_ID=your_docusign_user_id
DOCUSIGN_ACCOUNT_ID=your_docusign_account_id
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_PRIVATE_KEY=your_docusign_private_key
```

### Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Configure Build**: Vercel should auto-detect the Next.js configuration
3. **Set Environment Variables**: Add all required environment variables
4. **Deploy**: Push to your main branch to trigger deployment
5. **Database Setup**: Run database migrations after first deployment:
   ```bash
   npm run db:push
   ```

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**: Create a `.env` file with the required variables

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Application**: Open http://localhost:5000

### Authentication

The application uses a demo authentication system for development. In production, replace with your preferred authentication provider (Auth0, Firebase Auth, etc.).

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `demo123`

### Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with serverless functions
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Passport.js
- **Payments**: Stripe subscriptions
- **AI**: OpenAI GPT for document parsing
- **Email**: SendGrid for notifications

### Support

For deployment issues or questions, refer to the Vercel documentation or contact support.