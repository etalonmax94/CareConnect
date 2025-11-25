import { useState, useMemo } from "react";
import type { Client, ClientCategory } from "@shared/schema";
import { calculateAge } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CategoryBadge from "./CategoryBadge";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, Phone, Star, StarOff, Heart, HeartOff } from "lucide-react";

interface ClientTableProps {
  clients: Client[];
  onViewClient: (client: Client) => void;
  isArchiveView?: boolean;
}

type SortField = "name" | "category" | "careManager" | "phone" | "compliance";
type SortDirection = "asc" | "desc";

export default function ClientTable({ clients, onViewClient, isArchiveView = false }: ClientTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | "All">("All");
  const [selectedCareManager, setSelectedCareManager] = useState<string>("All");
  const [selectedCompliance, setSelectedCompliance] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pinnedClients, setPinnedClients] = useState<Set<string>>(new Set());

  const careManagers = useMemo(() => {
    const managers = new Set<string>();
    clients.forEach(c => {
      if (c.careTeam?.careManager) managers.add(c.careTeam.careManager);
    });
    return Array.from(managers).sort();
  }, [clients]);

  const togglePin = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const getClientId = (client: Client) => {
    if (client.category === "NDIS") return client.ndisDetails?.ndisNumber;
    if (client.category === "Support at Home") return client.supportAtHomeDetails?.hcpNumber;
    return client.medicareNumber;
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesCategory = selectedCategory === "All" || client.category === selectedCategory;
      const matchesCareManager = selectedCareManager === "All" || client.careTeam?.careManager === selectedCareManager;
      const compStatus = getComplianceStatus(client.clinicalDocuments?.carePlanDate);
      const matchesCompliance = selectedCompliance === "All" || 
        (selectedCompliance === "compliant" && compStatus === "compliant") ||
        (selectedCompliance === "due-soon" && compStatus === "due-soon") ||
        (selectedCompliance === "overdue" && compStatus === "overdue");
      const matchesSearch = client.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.careTeam?.careManager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientId(client)?.includes(searchTerm);
      return matchesCategory && matchesCareManager && matchesCompliance && matchesSearch;
    });
  }, [clients, selectedCategory, selectedCareManager, selectedCompliance, searchTerm]);

  const sortedClients = useMemo(() => {
    const pinned = filteredClients.filter(c => pinnedClients.has(c.id));
    const unpinned = filteredClients.filter(c => !pinnedClients.has(c.id));
    
    const sortFn = (a: Client, b: Client) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      switch (sortField) {
        case "name":
          aVal = a.participantName.toLowerCase();
          bVal = b.participantName.toLowerCase();
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "careManager":
          aVal = a.careTeam?.careManager?.toLowerCase() || "zzz";
          bVal = b.careTeam?.careManager?.toLowerCase() || "zzz";
          break;
        case "phone":
          aVal = a.phoneNumber || "";
          bVal = b.phoneNumber || "";
          break;
        case "compliance":
          const statusOrder: Record<string, number> = { "none": 0, "overdue": 1, "due-soon": 2, "compliant": 3 };
          aVal = statusOrder[getComplianceStatus(a.clinicalDocuments?.carePlanDate)] ?? 0;
          bVal = statusOrder[getComplianceStatus(b.clinicalDocuments?.carePlanDate)] ?? 0;
          break;
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    };
    
    return [...pinned.sort(sortFn), ...unpinned.sort(sortFn)];
  }, [filteredClients, sortField, sortDirection, pinnedClients]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="w-3 h-3 ml-1" /> : 
      <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, phone numbers, IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <div className="flex flex-wrap gap-3">
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
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>
                <button 
                  className="flex items-center font-medium hover:text-primary transition-colors"
                  onClick={() => handleSort("name")}
                  data-testid="sort-name"
                >
                  Client <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  className="flex items-center font-medium hover:text-primary transition-colors"
                  onClick={() => handleSort("category")}
                  data-testid="sort-category"
                >
                  Category <SortIcon field="category" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  className="flex items-center font-medium hover:text-primary transition-colors"
                  onClick={() => handleSort("phone")}
                  data-testid="sort-phone"
                >
                  Phone <SortIcon field="phone" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  className="flex items-center font-medium hover:text-primary transition-colors"
                  onClick={() => handleSort("careManager")}
                  data-testid="sort-care-manager"
                >
                  Care Manager <SortIcon field="careManager" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  className="flex items-center font-medium hover:text-primary transition-colors"
                  onClick={() => handleSort("compliance")}
                  data-testid="sort-compliance"
                >
                  Compliance <SortIcon field="compliance" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.map((client) => {
              const complianceStatus = getComplianceStatus(client.clinicalDocuments?.carePlanDate);
              const clientId = getClientId(client);
              const isPinned = pinnedClients.has(client.id);
              const clientAge = calculateAge(client.dateOfBirth);
              
              return (
                <TableRow 
                  key={client.id} 
                  className={`hover-elevate ${isPinned ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`} 
                  data-testid={`row-client-${client.id}`}
                >
                  <TableCell className="w-8 px-2">
                    <button
                      onClick={(e) => togglePin(client.id, e)}
                      className="p-1 hover:bg-muted rounded"
                      data-testid={`button-pin-${client.id}`}
                    >
                      {isPinned ? (
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={client.photo || undefined} alt={client.participantName} />
                        <AvatarFallback>{getInitials(client.participantName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{client.participantName}</p>
                          {client.advancedCareDirective === "NFR" && (
                            <Badge 
                              variant="outline" 
                              className="gap-1 bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs"
                              data-testid={`badge-nfr-${client.id}`}
                            >
                              <HeartOff className="w-3 h-3" />
                              NFR
                            </Badge>
                          )}
                          {client.advancedCareDirective === "For Resus" && (
                            <Badge 
                              variant="outline" 
                              className="gap-1 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-xs"
                              data-testid={`badge-resus-${client.id}`}
                            >
                              <Heart className="w-3 h-3" />
                              Resus
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {clientAge ? `${clientAge} years` : "Age N/A"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <CategoryBadge category={client.category} abbreviated />
                      {clientId && (
                        <p className="text-xs text-muted-foreground font-mono">{clientId}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.phoneNumber ? (
                      <a 
                        href={`tel:${client.phoneNumber}`}
                        className="flex items-center gap-1 text-sm hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3" />
                        {client.phoneNumber}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{client.careTeam?.careManager || "Not assigned"}</TableCell>
                  <TableCell>
                    <ComplianceIndicator status={complianceStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewClient(client)}
                      data-testid={`button-view-${client.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {sortedClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No clients found matching your filters.</p>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Showing {sortedClients.length} of {clients.length} clients</p>
        {pinnedClients.size > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {pinnedClients.size} pinned
          </Badge>
        )}
      </div>
    </div>
  );
}
