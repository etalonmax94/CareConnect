import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertClient, Client } from "@shared/schema";
import ClientForm from "@/components/ClientForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AddClient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ data, photoFile }: { data: InsertClient; photoFile?: File | null }) => {
      // Create the client first
      const response = await apiRequest("POST", "/api/clients", data);
      const createdClient = response as Client;
      
      // If there's a photo, upload it
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      setLocation("/clients");
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
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg sm:text-2xl font-semibold">Add New Client</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create a new client record
          </p>
        </div>
      </div>

      <ClientForm
        onSubmit={async (data, photoFile) => { 
          await createMutation.mutateAsync({ data, photoFile }); 
        }}
        onCancel={() => setLocation("/clients")}
      />
    </div>
  );
}
