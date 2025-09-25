import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-file-signature text-primary-foreground text-xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">DocuSign Pro</h1>
              <p className="text-lg text-muted-foreground">Real Estate Edition</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Streamline Your Real Estate Document Workflow
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upload, parse, and send real estate documents for e-signature with AI-powered automation. 
            Manage your entire document lifecycle from one professional platform.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-brain text-blue-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Document Parsing</h3>
              <p className="text-muted-foreground">
                Automatically extract property details, signers, and key terms from your real estate documents using advanced AI.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-file-signature text-green-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">E-Signature Integration</h3>
              <p className="text-muted-foreground">
                Send documents for signature through DocuSign with automated recipient management and status tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-purple-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Usage Analytics</h3>
              <p className="text-muted-foreground">
                Track your document processing, signature completion rates, and manage subscription billing with detailed analytics.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4">Trusted by Real Estate Professionals</h3>
          <p className="text-muted-foreground mb-8">
            Join thousands of agents, brokers, and real estate professionals who use DocuSign Pro to close deals faster.
          </p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <span className="text-lg font-semibold">Coldwell Banker</span>
            <span className="text-lg font-semibold">RE/MAX</span>
            <span className="text-lg font-semibold">Century 21</span>
            <span className="text-lg font-semibold">Keller Williams</span>
          </div>
        </div>
      </div>
    </div>
  );
}
