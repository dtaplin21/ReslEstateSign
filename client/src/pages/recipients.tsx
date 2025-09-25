import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { apiRequest } from "@/lib/queryClient";
import { insertRecipientSchema } from "@shared/schema";
import type { Recipient } from "@shared/schema";

type RecipientFormData = {
  name: string;
  email: string;
  phone?: string;
  role: string;
};

export default function Recipients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipients, isLoading } = useQuery({
    queryKey: ["/api/recipients"],
  });

  const form = useForm<RecipientFormData>({
    resolver: zodResolver(insertRecipientSchema.omit({ userId: true })),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "buyer",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RecipientFormData) => {
      return await apiRequest("POST", "/api/recipients", data);
    },
    onSuccess: () => {
      toast({
        title: "Contact created",
        description: "New contact has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RecipientFormData & { id: string }) => {
      const { id, ...updateData } = data;
      return await apiRequest("PUT", `/api/recipients/${id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Contact updated",
        description: "Contact has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients"] });
      setIsDialogOpen(false);
      setEditingRecipient(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/recipients/${id}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Contact deleted",
        description: "Contact has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredRecipients = (recipients as Recipient[] || [])?.filter((recipient: Recipient) =>
    recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipient.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const onSubmit = (data: RecipientFormData) => {
    if (editingRecipient) {
      updateMutation.mutate({ ...data, id: editingRecipient.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    form.reset({
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone || "",
      role: recipient.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      deleteMutation.mutate(id);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRecipient(null);
    form.reset();
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Recipients</h1>
              <p className="text-muted-foreground">Manage your contacts for faster document processing</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                <Input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-contact">
                    <i className="fas fa-plus mr-2"></i>
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecipient ? 'Edit Contact' : 'Add New Contact'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" data-testid="input-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email address" data-testid="input-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" data-testid="input-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select role" />
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
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-save"
                        >
                          {createMutation.isPending || updateMutation.isPending ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Saving...
                            </>
                          ) : (
                            editingRecipient ? 'Update Contact' : 'Add Contact'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredRecipients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipients.map((recipient: Recipient, index: number) => (
                <Card key={recipient.id} data-testid={`card-recipient-${index}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-primary text-lg"></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{recipient.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{recipient.role}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(recipient.id)}
                        data-testid={`button-delete-${index}`}
                      >
                        <i className="fas fa-trash-alt text-muted-foreground"></i>
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <i className="fas fa-envelope w-4"></i>
                        <span className="truncate">{recipient.email}</span>
                      </div>
                      {recipient.phone && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <i className="fas fa-phone w-4"></i>
                          <span>{recipient.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <i className="fas fa-file-alt w-4"></i>
                        <span>{recipient.documentsSignedCount || 0} documents signed</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEdit(recipient)}
                        data-testid={`button-edit-${index}`}
                      >
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" data-testid={`button-send-document-${index}`}>
                        Send Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-muted-foreground text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No contacts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Add your first contact to get started.'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-contact">
                Add Contact
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
