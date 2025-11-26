import { useState } from "react";
import { Plus, Archive, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientTable from "@/components/ClientTable";
import type { Client, ClientCategory } from "@shared/schema";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | "All">("All");

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

  const filteredByCategory = selectedCategory === "All" 
    ? clients 
    : clients.filter(c => c.category === selectedCategory);

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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            onClick={() => setActiveTab("active")}
            className="gap-2"
            data-testid="tab-active-clients"
          >
            <Users className="w-4 h-4" />
            Active Clients
            <Badge variant={activeTab === "active" ? "secondary" : "outline"} className="ml-1">
              {activeClients.length}
            </Badge>
          </Button>
          <Button
            variant={activeTab === "archived" ? "default" : "outline"}
            onClick={() => setActiveTab("archived")}
            className="gap-2"
            data-testid="tab-archived-clients"
          >
            <Archive className="w-4 h-4" />
            Archived
            <Badge variant={activeTab === "archived" ? "secondary" : "outline"} className="ml-1">
              {archivedClients.length}
            </Badge>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={selectedCategory === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("All")}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant={selectedCategory === "NDIS" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("NDIS")}
            className={selectedCategory === "NDIS" ? "" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"}
            data-testid="filter-ndis"
          >
            NDIS
          </Button>
          <Button
            variant={selectedCategory === "Support at Home" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("Support at Home")}
            className={selectedCategory === "Support at Home" ? "" : "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"}
            data-testid="filter-support"
          >
            Support at Home
          </Button>
          <Button
            variant={selectedCategory === "Private" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("Private")}
            className={selectedCategory === "Private" ? "" : "border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"}
            data-testid="filter-private"
          >
            Private
          </Button>
        </div>
      </div>

      {activeTab === "active" ? (
        <>
          {isLoadingActive ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm">
                {selectedCategory === "All" 
                  ? "Get started by adding your first client" 
                  : `No ${selectedCategory} clients found`}
              </p>
            </div>
          ) : (
            <ClientTable clients={filteredByCategory} onViewClient={handleViewClient} />
          )}
        </>
      ) : (
        <>
          {isLoadingArchived ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Archive className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No archived clients</p>
              <p className="text-sm">Archived clients will appear here</p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Archived clients are read-only and retained for 7 years per Australian Privacy Act compliance.
                </p>
              </div>
              <ClientTable 
                clients={filteredByCategory} 
                onViewClient={handleViewClient}
                isArchiveView={true}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
