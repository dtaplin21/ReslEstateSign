import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 
  loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) : 
  Promise.resolve(null);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/billing',
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are subscribed!",
      });
      setLocation('/billing');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => setLocation('/billing')} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || !elements} data-testid="button-subscribe">
          Subscribe
        </Button>
      </div>
    </form>
  );
};

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  documentsLimit: number;
  envelopesLimit: number;
  aiRequestsLimit: number;
  storageLimit: number;
  features: string[];
}

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch subscription plans from API
  const { data: pricingPlans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  useEffect(() => {
    // Only create subscription once a plan is selected
    if (selectedPlan) {
      apiRequest("POST", "/api/get-or-create-subscription", { planId: selectedPlan })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to initialize subscription. Please try again.",
            variant: "destructive",
          });
          console.error("Subscription error:", error);
        });
    }
  }, [selectedPlan, toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" aria-label="Loading"/>
            <p className="text-muted-foreground">Initializing subscription...</p>
          </div>
        </main>
      </div>
    );
  }

  // Handle missing Stripe configuration
  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Stripe Not Configured</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Payment processing is not available. Please contact support to set up your subscription.
              </p>
              <Button variant="outline" onClick={() => setLocation('/billing')}>
                Back to Billing
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (plansLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" aria-label="Loading"/>
            <p className="text-muted-foreground">Loading subscription plans...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Subscribe</h1>
              <p className="text-muted-foreground">Choose the plan that's right for your business</p>
            </div>
            <Button variant="outline" onClick={() => setLocation('/billing')} data-testid="button-back-to-billing">
              Back to Billing
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {/* Pricing Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={plan.id} 
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  selectedPlan === plan.id ? 'border-primary border-2 shadow-lg' : 
                  index === 1 ? 'border-primary border-2' : ''
                }`}
                onClick={() => setSelectedPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                {(index === 1 || selectedPlan === plan.id) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {selectedPlan === plan.id ? 'Selected' : 'Most Popular'}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-green-600"></i>
                      <span>{plan.documentsLimit} documents/month</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-green-600"></i>
                      <span>{plan.envelopesLimit} envelopes/month</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-green-600"></i>
                      <span>{plan.aiRequestsLimit} AI requests/month</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-green-600"></i>
                      <span>{plan.storageLimit} GB storage</span>
                    </li>
                    {(plan.features || []).map((feature: string, featureIndex: number) => (
                      <li key={featureIndex} className="flex items-center space-x-2">
                        <i className="fas fa-check text-green-600"></i>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${selectedPlan === plan.id ? 'bg-primary text-primary-foreground' : ''}`}
                    variant={selectedPlan === plan.id ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.id);
                    }}
                    data-testid={`button-select-plan-${plan.id}`}
                  >
                    {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Form */}
          {clientSecret && selectedPlan && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Complete Your Subscription</CardTitle>
                <p className="text-muted-foreground">
                  Enter your payment information to activate your {pricingPlans.find(p => p.id === selectedPlan)?.name} plan
                </p>
              </CardHeader>
              <CardContent>
                {/* Selected Plan Summary */}
                {(() => {
                  const plan = pricingPlans.find(p => p.id === selectedPlan);
                  return plan ? (
                    <div className="bg-muted p-4 rounded-lg mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{plan.name} Plan</h4>
                          <p className="text-sm text-muted-foreground">
                            {plan.documentsLimit} documents, {plan.envelopesLimit} envelopes, {plan.aiRequestsLimit} AI requests/month
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${plan.price}</div>
                          <div className="text-sm text-muted-foreground">per month</div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscribeForm />
                </Elements>
              </CardContent>
            </Card>
          )}

          {!clientSecret && selectedPlan && (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Preparing your subscription...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features Summary */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">What You Get with DocuSign Pro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-brain text-blue-600 text-xl"></i>
                  </div>
                  <h3 className="font-semibold mb-2">AI Document Parsing</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically extract property details and signature fields from your documents
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-file-signature text-green-600 text-xl"></i>
                  </div>
                  <h3 className="font-semibold mb-2">E-Signature Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Send documents for signature with automated tracking and reminders
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-line text-purple-600 text-xl"></i>
                  </div>
                  <h3 className="font-semibold mb-2">Usage Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track performance and manage your subscription with detailed insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
