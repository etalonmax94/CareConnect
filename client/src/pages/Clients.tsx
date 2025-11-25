import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/ClientTable";
import type { Client } from "@shared/schema";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function Clients() {
  const [, setLocation] = useLocation();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const handleViewClient = (client: Client) => {
    setLocation(`/clients/${client.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all client records across NDIS, Support at Home, and Private categories
          </p>
        </div>
        <Link href="/clients/new">
          <Button data-testid="button-add-client">
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <ClientTable clients={clients} onViewClient={handleViewClient} />
      )}
    </div>
  );
}
