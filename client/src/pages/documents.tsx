import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { useLocation } from "wouter";

export default function Documents() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/documents"],
  });

  const filteredDocuments = Array.isArray(documents) ? documents.filter((doc: any) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.propertyAddress?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Documents</h1>
              <p className="text-muted-foreground">Manage your real estate documents and track signing progress</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setLocation('/upload')}
                data-testid="button-upload"
                className="flex items-center space-x-2"
              >
                <i className="fas fa-plus"></i>
                <span>Upload</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded"></div>
                    ))}
                  </div>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold text-foreground">Document</th>
                      <th className="text-left p-4 font-semibold text-foreground">Property</th>
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-left p-4 font-semibold text-foreground">Date</th>
                      <th className="text-left p-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDocuments.map((document: any, index: number) => (
                      <tr key={document.id} className="hover:bg-muted/25" data-testid={`document-row-${index}`}>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                              <i className="fas fa-file-pdf text-red-600 text-sm"></i>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{document.name}</p>
                              <p className="text-sm text-muted-foreground">{document.filename}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-foreground">{document.propertyAddress || 'N/A'}</p>
                          {document.propertyValue && (
                            <p className="text-sm text-muted-foreground">
                              ${document.propertyValue.toLocaleString()}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={
                            document.status === 'completed' ? 'default' :
                            document.status === 'pending' ? 'secondary' : 
                            document.status === 'processing' ? 'outline' : 'destructive'
                          }>
                            {document.status === 'completed' ? 'Completed' :
                             document.status === 'pending' ? 'Pending Signatures' :
                             document.status === 'processing' ? 'Processing' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-foreground">{new Date(document.createdAt).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(document.createdAt).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" data-testid={`button-view-${index}`}>
                              <i className="fas fa-eye"></i>
                            </Button>
                            {document.status === 'completed' ? (
                              <Button variant="ghost" size="sm" data-testid={`button-download-${index}`}>
                                <i className="fas fa-download"></i>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" data-testid={`button-send-${index}`}>
                                <i className="fas fa-paper-plane"></i>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" data-testid={`button-more-${index}`}>
                              <i className="fas fa-ellipsis-h"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-folder-open text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No documents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter ? 'Try adjusting your search criteria.' : 'Upload your first document to get started.'}
                  </p>
                  <Button 
                    onClick={() => setLocation('/upload')}
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
