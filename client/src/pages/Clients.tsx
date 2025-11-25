import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/ClientTable";
import { mockClients } from "@/lib/mockData";
import type { Client } from "@shared/schema";
import { useLocation } from "wouter";

export default function Clients() {
  const [, setLocation] = useLocation();

  const handleViewClient = (client: Client) => {
    console.log('View client:', client.participantName);
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
        <Button data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Add New Client
        </Button>
      </div>

      <ClientTable clients={mockClients} onViewClient={handleViewClient} />
    </div>
  );
}
