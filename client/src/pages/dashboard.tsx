import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { UsageBar } from "@/components/usage-bar";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const stats = (dashboardData as any)?.stats || {};
  const usage = (dashboardData as any)?.usage || {};
  const recentDocuments = (dashboardData as any)?.recentDocuments || [];

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's your activity overview.</p>
            </div>
            <Button 
              onClick={() => setLocation('/upload')}
              data-testid="button-upload"
              className="flex items-center space-x-2"
            >
              <i className="fas fa-plus"></i>
              <span>Upload Document</span>
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-documents">
                      {stats?.totalDocuments || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-file-alt text-blue-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Signatures</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-pending-signatures">
                      {stats?.pendingSignatures || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clock text-orange-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-completed">
                      {stats?.completed || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-check-circle text-green-600 text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Completion</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-avg-completion">
                      {stats?.avgCompletion || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-stopwatch text-purple-600 text-xl"></i>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">days to complete</p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usage This Month</CardTitle>
                <span className="text-sm text-muted-foreground">Professional Plan</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageBar
                label="Documents Processed"
                current={usage?.documents || 0}
                limit={200}
              />
              <UsageBar
                label="Envelopes Sent"
                current={usage?.envelopes || 0}
                limit={500}
              />
              <UsageBar
                label="AI Parsing Requests"
                current={usage?.aiRequests || 0}
                limit={1000}
              />
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Documents</CardTitle>
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation('/documents')}
                  data-testid="button-view-all"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDocuments && recentDocuments.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentDocuments.map((document: any, index: number) => (
                    <div key={document.id || index} className="py-4 flex items-center justify-between" data-testid={`document-item-${index}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <i className="fas fa-file-pdf text-red-600"></i>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{document.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {document.propertyAddress} • {document.propertyValue ? `$${document.propertyValue.toLocaleString()}` : 'No value'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={
                          document.status === 'completed' ? 'default' :
                          document.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {document.status === 'completed' ? 'Completed' :
                           document.status === 'pending' ? 'Pending Signatures' : 'Processing'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(document.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No documents yet. Upload your first document to get started.</p>
                  <Button 
                    onClick={() => setLocation('/upload')} 
                    className="mt-4"
                    data-testid="button-upload-first"
                  >
                    Upload Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
