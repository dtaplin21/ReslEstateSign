import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { DocumentUpload } from "@/components/document-upload";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const uploadSchema = z.object({
  documentType: z.string().optional(),
  propertyAddress: z.string().optional(),
  emailSubject: z.string().min(1, "Email subject is required"),
  emailMessage: z.string().optional(),
  recipients: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    role: z.string().min(1, "Role is required"),
  })).min(1, "At least one recipient is required"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function Upload() {
  const [, setLocation] = useLocation();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipients = [] } = useQuery({
    queryKey: ["/api/recipients"],
  });

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      emailSubject: "",
      emailMessage: "",
      recipients: [{ name: "", email: "", phone: "", role: "buyer" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData & { file: File }) => {
      const formData = new FormData();
      formData.append('document', data.file);
      formData.append('emailSubject', data.emailSubject);
      formData.append('emailMessage', data.emailMessage || '');
      formData.append('recipients', JSON.stringify(data.recipients));

      return await apiRequest("POST", "/api/documents/upload", formData);
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded successfully",
        description: "Your document is being processed and will be sent for signatures.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setLocation('/documents');
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UploadFormData) => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ ...data, file: uploadedFile });
  };

  const addRecipientFromContacts = (recipient: any) => {
    append({
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone || "",
      role: recipient.role,
    });
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload Document</h1>
              <p className="text-muted-foreground">Upload your real estate documents for processing and e-signature</p>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-4xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentUpload
                    onFileSelect={setUploadedFile}
                    selectedFile={uploadedFile}
                  />
                </CardContent>
              </Card>

              {/* Document Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="documentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-document-type">
                                <SelectValue placeholder="Auto-detect with AI" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="auto">Auto-detect with AI</SelectItem>
                              <SelectItem value="purchase_agreement">Purchase Agreement</SelectItem>
                              <SelectItem value="listing_agreement">Listing Agreement</SelectItem>
                              <SelectItem value="disclosure">Disclosure Statement</SelectItem>
                              <SelectItem value="addendum">Addendum</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="propertyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Will be extracted automatically" 
                              data-testid="input-property-address"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="emailSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject Line</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Please sign: [Document Name]" 
                            data-testid="input-email-subject"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Add a personal message to recipients..."
                            data-testid="textarea-email-message"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recipients</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({ name: "", email: "", phone: "", role: "buyer" })}
                      data-testid="button-add-recipient"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Recipient
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick Add from Contacts */}
                  {(recipients as any[] || []).length > 0 && (
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Quick Add from Contacts</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(recipients as any[] || []).slice(0, 6).map((recipient: any) => (
                          <Button
                            key={recipient.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addRecipientFromContacts(recipient)}
                            className="justify-start"
                            data-testid={`button-add-contact-${recipient.id}`}
                          >
                            <i className="fas fa-plus w-4 h-4 mr-2"></i>
                            {recipient.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Recipients */}
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`recipients.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Full Name" 
                                  data-testid={`input-recipient-name-${index}`}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`recipients.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="email@example.com" 
                                  data-testid={`input-recipient-email-${index}`}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`recipients.${index}.role`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-recipient-role-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="buyer">Buyer</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                  <SelectItem value="witness">Witness</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-end">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => remove(index)}
                              data-testid={`button-remove-recipient-${index}`}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/documents')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadMutation.isPending || !uploadedFile}
                  data-testid="button-process-document"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Processing...
                    </>
                  ) : (
                    'Process Document'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
