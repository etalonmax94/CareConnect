import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, InsertClient } from "@shared/schema";
import ClientForm from "@/components/ClientForm";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function EditClient() {
  const [, params] = useRoute("/clients/:id/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", params?.id],
    enabled: !!params?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await apiRequest("PATCH", `/api/clients/${params?.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      setLocation(`/clients/${params?.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">Client not found</p>
          <Link href="/clients">
            <Button variant="ghost" className="mt-2">Back to Clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Redirect if client is archived - archived clients are read-only
  if (client.isArchived === "yes") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">Client is Archived</p>
          <p className="text-sm text-muted-foreground mt-1">
            Archived clients cannot be edited. Restore the client first if changes are needed.
          </p>
          <Link href={`/clients/${params?.id}`}>
            <Button variant="outline" className="mt-4">View Client Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clients/${params?.id}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Edit Client</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update {client.participantName}'s information
          </p>
        </div>
      </div>

      <ClientForm
        client={client}
        onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
        onCancel={() => setLocation(`/clients/${params?.id}`)}
      />
    </div>
  );
}
