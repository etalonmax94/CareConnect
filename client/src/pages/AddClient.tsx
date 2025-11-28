import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertClient, Client } from "@shared/schema";
import NewClientWizard from "@/components/NewClientWizard";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AddClient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ data, photoFile }: { data: InsertClient; photoFile?: File | null }) => {
      const response = await apiRequest("POST", "/api/clients", data);
      const createdClient = await response.json() as Client;
      
      if (photoFile && createdClient.id) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        
        await fetch(`/api/clients/${createdClient.id}/photo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }
      
      return createdClient;
    },
    onSuccess: (createdClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Created",
        description: `${createdClient.firstName} ${createdClient.lastName} has been added successfully.`,
      });
      setLocation(`/clients/${createdClient.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" data-testid="button-back-to-clients">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">Add New Client</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create a new client record step by step
          </p>
        </div>
      </div>

      <NewClientWizard
        onSubmit={async (data, photoFile) => { 
          await createMutation.mutateAsync({ data, photoFile }); 
        }}
        onCancel={() => setLocation("/clients")}
      />
    </div>
  );
}
