import { useState, useMemo } from "react";
import type { Client } from "@shared/schema";
import { calculateAge, formatClientNumber } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CategoryBadge from "./CategoryBadge";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { ArrowUpDown, ArrowUp, ArrowDown, Phone, Mail, CalendarPlus, Star, StarOff, Heart, HeartOff, Sparkles, MoreHorizontal, Eye, Edit, UserPlus, Archive } from "lucide-react";
import { useLocation } from "wouter";

type DensityMode = "compact" | "standard" | "expanded";

interface ColumnVisibility {
  client: boolean;
  category: boolean;
  phone: boolean;
  careManager: boolean;
  compliance: boolean;
}

interface ClientTableProps {
  clients: Client[];
  onViewClient: (client: Client) => void;
  isArchiveView?: boolean;
  density?: DensityMode;
  columnVisibility?: ColumnVisibility;
}

type SortField = "name" | "category" | "careManager" | "phone" | "compliance";
type SortDirection = "asc" | "desc";

const defaultColumnVisibility: ColumnVisibility = {
  client: true,
  category: true,
  phone: true,
  careManager: true,
  compliance: true,
};

export default function ClientTable({ 
  clients, 
  onViewClient, 
  isArchiveView = false,
  density = "standard",
  columnVisibility = defaultColumnVisibility
}: ClientTableProps) {
  const [, setLocation] = useLocation();
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pinnedClients, setPinnedClients] = useState<Set<string>>(new Set());
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);

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

  const sortedClients = useMemo(() => {
    const pinned = clients.filter(c => pinnedClients.has(c.id));
    const unpinned = clients.filter(c => !pinnedClients.has(c.id));
    
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
  }, [clients, sortField, sortDirection, pinnedClients]);

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

  const formatCareManagerName = (name: string | null | undefined) => {
    if (!name) return "Not assigned";
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  };

  const handleRowClick = (client: Client) => {
    onViewClient(client);
  };

  const handleQuickCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleQuickEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    window.location.href = `mailto:${email}`;
  };

  const handleAddAppointment = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setLocation(`/clients/${clientId}?tab=services`);
  };

  const handleEditClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setLocation(`/clients/${clientId}/edit`);
  };

  const handleAssignClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setLocation(`/clients/${clientId}?tab=team`);
  };

  const handleArchiveClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setLocation(`/clients/${clientId}?action=archive`);
  };

  const getRowPadding = () => {
    switch (density) {
      case "compact": return "py-1";
      case "expanded": return "py-4";
      default: return "py-2";
    }
  };

  const getAvatarSize = () => {
    switch (density) {
      case "compact": return "h-8 w-8";
      case "expanded": return "h-12 w-12";
      default: return "h-10 w-10";
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-md bg-white dark:bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              {columnVisibility.client && (
                <TableHead>
                  <button 
                    className="flex items-center font-medium hover:text-primary transition-colors"
                    onClick={() => handleSort("name")}
                    data-testid="sort-name"
                  >
                    Client <SortIcon field="name" />
                  </button>
                </TableHead>
              )}
              {columnVisibility.category && (
                <TableHead>
                  <button 
                    className="flex items-center font-medium hover:text-primary transition-colors"
                    onClick={() => handleSort("category")}
                    data-testid="sort-category"
                  >
                    Category <SortIcon field="category" />
                  </button>
                </TableHead>
              )}
              {columnVisibility.phone && (
                <TableHead>
                  <button 
                    className="flex items-center font-medium hover:text-primary transition-colors"
                    onClick={() => handleSort("phone")}
                    data-testid="sort-phone"
                  >
                    Phone <SortIcon field="phone" />
                  </button>
                </TableHead>
              )}
              {columnVisibility.careManager && (
                <TableHead>
                  <button 
                    className="flex items-center font-medium hover:text-primary transition-colors"
                    onClick={() => handleSort("careManager")}
                    data-testid="sort-care-manager"
                  >
                    Care Manager <SortIcon field="careManager" />
                  </button>
                </TableHead>
              )}
              {columnVisibility.compliance && (
                <TableHead>
                  <button 
                    className="flex items-center font-medium hover:text-primary transition-colors"
                    onClick={() => handleSort("compliance")}
                    data-testid="sort-compliance"
                  >
                    Compliance <SortIcon field="compliance" />
                  </button>
                </TableHead>
              )}
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.map((client) => {
              const complianceStatus = getComplianceStatus(client.clinicalDocuments?.carePlanDate);
              const clientId = getClientId(client);
              const isPinned = pinnedClients.has(client.id);
              const clientAge = calculateAge(client.dateOfBirth);
              const isNewClient = client.isOnboarded !== "yes";
              const isHovered = hoveredClientId === client.id;
              
              return (
                <TableRow 
                  key={client.id} 
                  className={`cursor-pointer transition-colors ${getRowPadding()} ${isPinned ? 'bg-amber-50 dark:bg-amber-900/10' : ''} ${isNewClient ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} hover:bg-muted/50`} 
                  data-testid={`row-client-${client.id}`}
                  onClick={() => handleRowClick(client)}
                  onMouseEnter={() => setHoveredClientId(client.id)}
                  onMouseLeave={() => setHoveredClientId(null)}
                >
                  <TableCell className="w-8 px-2">
                    <button
                      onClick={(e) => togglePin(client.id, e)}
                      className="p-1 hover:bg-muted rounded"
                      data-testid={`button-pin-${client.id}`}
                      aria-label={isPinned ? "Unpin client" : "Pin client"}
                    >
                      {isPinned ? (
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  {columnVisibility.client && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className={getAvatarSize()}>
                          <AvatarImage src={client.photo || undefined} alt={client.participantName} />
                          <AvatarFallback>{getInitials(client.participantName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {client.clientNumber && (
                              <Badge 
                                variant="secondary" 
                                className="font-mono text-xs"
                                data-testid={`badge-client-number-${client.id}`}
                              >
                                {formatClientNumber(client.clientNumber)}
                              </Badge>
                            )}
                            <p className="font-medium">{client.participantName}</p>
                            {isNewClient && (
                              <Badge 
                                variant="outline" 
                                className="gap-1 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs"
                                data-testid={`badge-new-${client.id}`}
                              >
                                <Sparkles className="w-3 h-3" />
                                New
                              </Badge>
                            )}
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
                          {density !== "compact" && (
                            <p className="text-sm text-muted-foreground">
                              {clientAge ? `${clientAge} years` : "Age N/A"}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {columnVisibility.category && (
                    <TableCell>
                      <div className="space-y-1">
                        <CategoryBadge category={client.category} abbreviated />
                        {density !== "compact" && clientId && (
                          <p className="text-xs text-muted-foreground font-mono">{clientId}</p>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {columnVisibility.phone && (
                    <TableCell>
                      {client.phoneNumber ? (
                        <span className="text-sm whitespace-nowrap">{client.phoneNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {columnVisibility.careManager && (
                    <TableCell>{formatCareManagerName(client.careTeam?.careManager)}</TableCell>
                  )}
                  {columnVisibility.compliance && (
                    <TableCell>
                      <ComplianceIndicator status={complianceStatus} />
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className={`flex items-center gap-1 transition-opacity ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        {client.phoneNumber && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => handleQuickCall(e, client.phoneNumber!)}
                            data-testid={`button-call-${client.id}`}
                            aria-label={`Call ${client.participantName}`}
                          >
                            <Phone className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {client.email && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => handleQuickEmail(e, client.email!)}
                            data-testid={`button-email-${client.id}`}
                            aria-label={`Email ${client.participantName}`}
                          >
                            <Mail className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => handleAddAppointment(e, client.id)}
                          data-testid={`button-appointment-${client.id}`}
                          aria-label={`Add appointment for ${client.participantName}`}
                        >
                          <CalendarPlus className="w-4 h-4 text-purple-600" />
                        </Button>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-menu-${client.id}`}
                            aria-label={`Actions for ${client.participantName}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); onViewClient(client); }}
                            data-testid={`menu-view-${client.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Client
                          </DropdownMenuItem>
                          {!isArchiveView && (
                            <>
                              <DropdownMenuItem 
                                onClick={(e) => handleEditClient(e, client.id)}
                                data-testid={`menu-edit-${client.id}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Client
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => handleAssignClient(e, client.id)}
                                data-testid={`menu-assign-${client.id}`}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Assign Staff
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => handleArchiveClient(e, client.id)}
                                className="text-red-600 focus:text-red-600"
                                data-testid={`menu-archive-${client.id}`}
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archive Client
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
