import { useState } from "react";
import { Plus, Archive, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ClientTable from "@/components/ClientTable";
import type { Client } from "@shared/schema";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const { data: activeClients = [], isLoading: isLoadingActive } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  const { data: archivedClients = [], isLoading: isLoadingArchived } = useQuery<Client[]>({
    queryKey: ["/api/clients/archived"],
  });

  const handleViewClient = (client: Client) => {
    setLocation(`/clients/${client.id}`);
  };

  const isLoading = activeTab === "active" ? isLoadingActive : isLoadingArchived;
  const clients = activeTab === "active" ? activeClients : archivedClients;

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2" data-testid="tab-active-clients">
            <Users className="w-4 h-4" />
            Active Clients
            <Badge variant="secondary" className="ml-1">{activeClients.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2" data-testid="tab-archived-clients">
            <Archive className="w-4 h-4" />
            Archived
            <Badge variant="secondary" className="ml-1">{archivedClients.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoadingActive ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : activeClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No active clients</p>
              <p className="text-sm">Get started by adding your first client</p>
            </div>
          ) : (
            <ClientTable clients={activeClients} onViewClient={handleViewClient} />
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {isLoadingArchived ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : archivedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Archive className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No archived clients</p>
              <p className="text-sm">Archived clients will appear here</p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Archived clients are read-only and retained for 7 years per Australian Privacy Act compliance.
                </p>
              </div>
              <ClientTable 
                clients={archivedClients} 
                onViewClient={handleViewClient}
                isArchiveView={true}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
