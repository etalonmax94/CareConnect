import { useState, useMemo, useEffect } from "react";
import { Plus, Archive, Users, Filter, LayoutGrid, LayoutList, SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ClientTable from "@/components/ClientTable";
import ClientGrid from "@/components/ClientGrid";
import type { Client, ClientCategory } from "@shared/schema";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { getComplianceStatus } from "@/components/ComplianceIndicator";

type ViewMode = "list" | "grid";
type DensityMode = "compact" | "standard" | "expanded";

interface ColumnVisibility {
  client: boolean;
  category: boolean;
  phone: boolean;
  careManager: boolean;
  compliance: boolean;
}

const defaultColumnVisibility: ColumnVisibility = {
  client: true,
  category: true,
  phone: true,
  careManager: true,
  compliance: true,
};

export default function Clients() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | "All">(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    if (category === "NDIS" || category === "Support at Home" || category === "Private") {
      return category;
    }
    return "All";
  });
  const [selectedCareManager, setSelectedCareManager] = useState<string>("All");
  const [selectedCompliance, setSelectedCompliance] = useState<string>("All");
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("clientViewMode");
    return (saved as ViewMode) || "list";
  });
  
  const [density, setDensity] = useState<DensityMode>(() => {
    const saved = localStorage.getItem("clientDensity");
    return (saved as DensityMode) || "standard";
  });
  
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const saved = localStorage.getItem("clientColumnVisibility");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, client: true };
    }
    return defaultColumnVisibility;
  });

  useEffect(() => {
    localStorage.setItem("clientViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("clientDensity", density);
  }, [density]);

  useEffect(() => {
    localStorage.setItem("clientColumnVisibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    if (category === "NDIS" || category === "Support at Home" || category === "Private") {
      setSelectedCategory(category);
    }
  }, [location]);

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

  const toggleColumn = (column: keyof ColumnVisibility) => {
    if (column === "client") return;
    setColumnVisibility(prev => ({ ...prev, [column]: !prev[column] }));
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            onClick={() => setActiveTab("active")}
            className="gap-2"
            data-testid="tab-active-clients"
          >
            <Users className="w-4 h-4" />
            Active
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
            <SelectTrigger className="w-[140px]" data-testid="filter-category">
              <SelectValue placeholder="Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Categories</SelectItem>
              <SelectItem value="NDIS">NDIS</SelectItem>
              <SelectItem value="Support at Home">Support at Home</SelectItem>
              <SelectItem value="Private">Private</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCareManager} onValueChange={setSelectedCareManager}>
            <SelectTrigger className="w-[160px]" data-testid="filter-care-manager">
              <SelectValue placeholder="Care Managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Care Managers</SelectItem>
              {careManagers.map(cm => (
                <SelectItem key={cm} value={cm}>{cm}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCompliance} onValueChange={setSelectedCompliance}>
            <SelectTrigger className="w-[140px]" data-testid="filter-compliance">
              <SelectValue placeholder="Compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Compliance</SelectItem>
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-display-options">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Display
              <span className="ml-2 text-xs text-muted-foreground">
                {viewMode === "list" ? "List" : "Grid"} • {density.charAt(0).toUpperCase() + density.slice(1)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72" data-testid="popover-display-options">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-3">View Mode</h4>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setViewMode("list")}
                    data-testid="view-list"
                  >
                    <LayoutList className="w-4 h-4" />
                    List
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setViewMode("grid")}
                    data-testid="view-grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Grid
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-3">Density</h4>
                <RadioGroup value={density} onValueChange={(v) => setDensity(v as DensityMode)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="compact" id="density-compact" data-testid="density-compact" />
                    <Label htmlFor="density-compact" className="cursor-pointer">Compact</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="density-standard" data-testid="density-standard" />
                    <Label htmlFor="density-standard" className="cursor-pointer">Standard</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expanded" id="density-expanded" data-testid="density-expanded" />
                    <Label htmlFor="density-expanded" className="cursor-pointer">Expanded</Label>
                  </div>
                </RadioGroup>
              </div>

              {viewMode === "list" && (
                <>
                  <Separator />

                  <div>
                    <h4 className="font-medium text-sm mb-3">Visible Columns</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">Client (required)</Label>
                        <Switch checked disabled className="opacity-50" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="col-category" className="text-sm cursor-pointer">Category</Label>
                        <Switch 
                          id="col-category" 
                          checked={columnVisibility.category} 
                          onCheckedChange={() => toggleColumn("category")}
                          data-testid="toggle-column-category"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="col-phone" className="text-sm cursor-pointer">Phone</Label>
                        <Switch 
                          id="col-phone" 
                          checked={columnVisibility.phone} 
                          onCheckedChange={() => toggleColumn("phone")}
                          data-testid="toggle-column-phone"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="col-care-manager" className="text-sm cursor-pointer">Care Manager</Label>
                        <Switch 
                          id="col-care-manager" 
                          checked={columnVisibility.careManager} 
                          onCheckedChange={() => toggleColumn("careManager")}
                          data-testid="toggle-column-care-manager"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="col-compliance" className="text-sm cursor-pointer">Compliance</Label>
                        <Switch 
                          id="col-compliance" 
                          checked={columnVisibility.compliance} 
                          onCheckedChange={() => toggleColumn("compliance")}
                          data-testid="toggle-column-compliance"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
          ) : viewMode === "list" ? (
            <ClientTable 
              clients={filteredClients} 
              onViewClient={handleViewClient}
              density={density}
              columnVisibility={columnVisibility}
            />
          ) : (
            <ClientGrid 
              clients={filteredClients} 
              onViewClient={handleViewClient}
              density={density}
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
              {viewMode === "list" ? (
                <ClientTable 
                  clients={filteredClients} 
                  onViewClient={handleViewClient}
                  isArchiveView={true}
                  density={density}
                  columnVisibility={columnVisibility}
                />
              ) : (
                <ClientGrid 
                  clients={filteredClients} 
                  onViewClient={handleViewClient}
                  density={density}
                  isArchiveView={true}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
