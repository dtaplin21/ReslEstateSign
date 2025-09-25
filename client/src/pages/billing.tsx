import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { UsageBar } from "@/components/usage-bar";
import { useLocation } from "wouter";

export default function Billing() {
  const [, setLocation] = useLocation();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["/api/usage/current"],
  });

  const { data: billingHistory, isLoading: billingLoading } = useQuery({
    queryKey: ["/api/billing/history"],
  });

  // Mock subscription data - would come from Stripe in production
  const subscriptionData = {
    plan: "Professional Plan",
    price: "$99/month",
    status: "active",
    features: {
      documents: 200,
      envelopes: 500,
      aiRequests: 1000,
      storage: "50 GB",
    }
  };

  // Mock pricing plans
  const pricingPlans = [
    {
      id: "starter",
      name: "Starter",
      price: 29,
      documents: 50,
      envelopes: 100,
      aiRequests: 500,
      storage: "10 GB",
      features: ["Email support"],
      current: false,
    },
    {
      id: "professional",
      name: "Professional",
      price: 99,
      documents: 200,
      envelopes: 500,
      aiRequests: 1000,
      storage: "50 GB",
      features: ["Priority support", "Advanced analytics"],
      current: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 249,
      documents: "Unlimited",
      envelopes: "Unlimited",
      aiRequests: "Unlimited",
      storage: "500 GB",
      features: ["24/7 phone support", "Custom integrations"],
      current: false,
    },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
              <p className="text-muted-foreground">Manage your subscription plan and billing information</p>
            </div>
            <Button data-testid="button-billing-portal">
              Billing Portal
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <i className="fas fa-crown text-primary-foreground text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground">{subscriptionData.plan}</h4>
                      <p className="text-muted-foreground">{subscriptionData.price} • Billed monthly</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Documents per month</p>
                      <p className="font-semibold text-foreground">{subscriptionData.features.documents}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Envelopes per month</p>
                      <p className="font-semibold text-foreground">{subscriptionData.features.envelopes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AI parsing requests</p>
                      <p className="font-semibold text-foreground">{subscriptionData.features.aiRequests}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Storage</p>
                      <p className="font-semibold text-foreground">{subscriptionData.features.storage}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full"
                    onClick={() => setLocation('/subscribe')}
                    data-testid="button-upgrade-plan"
                  >
                    Upgrade Plan
                  </Button>
                  <Button variant="outline" className="w-full" data-testid="button-change-billing">
                    Change Billing
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-destructive hover:text-destructive/80"
                    data-testid="button-cancel-subscription"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage This Month */}
          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <UsageBar
                      label="Documents Processed"
                      current={(usage as any)?.documents?.current || 0}
                      limit={(usage as any)?.documents?.limit || 200}
                    />
                    <p className="text-xs text-muted-foreground">
                      {((usage as any)?.documents?.limit || 200) - ((usage as any)?.documents?.current || 0)} remaining this month
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <UsageBar
                      label="Envelopes Sent"
                      current={(usage as any)?.envelopes?.current || 0}
                      limit={(usage as any)?.envelopes?.limit || 500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {((usage as any)?.envelopes?.limit || 500) - ((usage as any)?.envelopes?.current || 0)} remaining this month
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <UsageBar
                      label="AI Parsing Requests"
                      current={(usage as any)?.aiRequests?.current || 0}
                      limit={(usage as any)?.aiRequests?.limit || 1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {((usage as any)?.aiRequests?.limit || 1000) - ((usage as any)?.aiRequests?.current || 0)} remaining this month
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {pricingPlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`border rounded-lg p-6 ${plan.current ? 'border-primary border-2 relative' : 'border-border'}`}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {plan.current && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Current
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-semibold text-foreground">{plan.name}</h4>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>
                    
                    <ul className="space-y-3 text-sm mb-6">
                      <li className="flex items-center space-x-2">
                        <i className="fas fa-check text-green-600"></i>
                        <span>{plan.documents} documents/month</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <i className="fas fa-check text-green-600"></i>
                        <span>{plan.envelopes} envelopes/month</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <i className="fas fa-check text-green-600"></i>
                        <span>{plan.aiRequests} AI requests/month</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <i className="fas fa-check text-green-600"></i>
                        <span>{plan.storage} storage</span>
                      </li>
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full ${plan.current ? 'bg-primary text-primary-foreground' : ''}`}
                      variant={plan.current ? 'default' : 'outline'}
                      disabled={plan.current}
                      onClick={() => plan.current ? null : setLocation('/subscribe')}
                      data-testid={`button-select-plan-${plan.id}`}
                    >
                      {plan.current ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Method</CardTitle>
                <Button variant="ghost" data-testid="button-update-payment">
                  Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <i className="fab fa-cc-visa text-white"></i>
                </div>
                <div>
                  <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Billing History</CardTitle>
                <Button variant="ghost" data-testid="button-view-all-invoices">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex justify-between py-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-48"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-4 bg-muted rounded w-16"></div>
                        <div className="h-3 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mock billing history */}
                  {[
                    { description: "Professional Plan - February 2024", date: "Feb 1, 2024", amount: "$99.00", status: "Paid" },
                    { description: "Professional Plan - January 2024", date: "Jan 1, 2024", amount: "$99.00", status: "Paid" },
                    { description: "Professional Plan - December 2023", date: "Dec 1, 2023", amount: "$99.00", status: "Paid" },
                  ].map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-b-0" data-testid={`invoice-item-${index}`}>
                      <div>
                        <p className="font-medium text-foreground">{invoice.description}</p>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{invoice.amount}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {invoice.status}
                          </Badge>
                          <Button variant="ghost" size="sm" data-testid={`button-download-invoice-${index}`}>
                            <i className="fas fa-download text-xs"></i>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
