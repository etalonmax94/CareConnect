import { useState, useMemo } from "react";
import { Plus, Archive, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientTable from "@/components/ClientTable";
import type { Client, ClientCategory } from "@shared/schema";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { getComplianceStatus } from "@/components/ComplianceIndicator";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | "All">("All");
  const [selectedCareManager, setSelectedCareManager] = useState<string>("All");
  const [selectedCompliance, setSelectedCompliance] = useState<string>("All");

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

  const careManagers = useMemo(() => {
    const managers = new Set<string>();
    clients.forEach(c => {
      if (c.careTeam?.careManager) managers.add(c.careTeam.careManager);
    });
    return Array.from(managers).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesCategory = selectedCategory === "All" || client.category === selectedCategory;
      const matchesCareManager = selectedCareManager === "All" || client.careTeam?.careManager === selectedCareManager;
      const compStatus = getComplianceStatus(client.clinicalDocuments?.carePlanDate);
      const matchesCompliance = selectedCompliance === "All" || 
        (selectedCompliance === "compliant" && compStatus === "compliant") ||
        (selectedCompliance === "due-soon" && compStatus === "due-soon") ||
        (selectedCompliance === "overdue" && compStatus === "overdue");
      return matchesCategory && matchesCareManager && matchesCompliance;
    });
  }, [clients, selectedCategory, selectedCareManager, selectedCompliance]);

  const hasActiveFilters = selectedCategory !== "All" || selectedCareManager !== "All" || selectedCompliance !== "All";

  const clearAllFilters = () => {
    setSelectedCategory("All");
    setSelectedCareManager("All");
    setSelectedCompliance("All");
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

      <div className="flex items-center gap-3 flex-wrap">
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

        <div className="h-6 w-px bg-border mx-1" />

        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ClientCategory | "All")}>
          <SelectTrigger className="w-[160px]" data-testid="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="NDIS">NDIS</SelectItem>
            <SelectItem value="Support at Home">Support at Home</SelectItem>
            <SelectItem value="Private">Private</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCareManager} onValueChange={setSelectedCareManager}>
          <SelectTrigger className="w-[180px]" data-testid="filter-care-manager">
            <SelectValue placeholder="All Care Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Care Managers</SelectItem>
            {careManagers.map(cm => (
              <SelectItem key={cm} value={cm}>{cm}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCompliance} onValueChange={setSelectedCompliance}>
          <SelectTrigger className="w-[160px]" data-testid="filter-compliance">
            <SelectValue placeholder="All Compliance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Compliance</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="due-soon">Due Soon</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-muted-foreground"
            data-testid="button-clear-filters"
          >
            <Filter className="w-4 h-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {activeTab === "active" ? (
        <>
          {isLoadingActive ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm">
                {hasActiveFilters 
                  ? "Try adjusting your filters" 
                  : "Get started by adding your first client"}
              </p>
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <ClientTable 
              clients={filteredClients} 
              onViewClient={handleViewClient} 
            />
          )}
        </>
      ) : (
        <>
          {isLoadingArchived ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
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
                clients={filteredClients} 
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
