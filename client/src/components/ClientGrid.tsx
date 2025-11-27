import type { Client } from "@shared/schema";
import { calculateAge, formatClientNumber } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CategoryBadge from "./CategoryBadge";
import FundingTypeBadge from "./FundingTypeBadge";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Phone, Mail, MoreVertical, Eye, Edit, UserPlus, Archive, Heart, HeartOff, Sparkles, Stethoscope, Pill, Building2, Briefcase, HeartPulse, UserCog } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";

type DensityMode = "compact" | "standard" | "expanded";

interface ClientGridProps {
  clients: Client[];
  onViewClient: (client: Client) => void;
  density?: DensityMode;
  isArchiveView?: boolean;
}

export default function ClientGrid({ clients, onViewClient, density = "standard", isArchiveView = false }: ClientGridProps) {
  const [, setLocation] = useLocation();

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

  const getGridCols = () => {
    switch (density) {
      case "compact": return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
      case "expanded": return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      default: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  const getCardPadding = () => {
    switch (density) {
      case "compact": return "p-3";
      case "expanded": return "p-5";
      default: return "p-4";
    }
  };

  const getAvatarSize = () => {
    switch (density) {
      case "compact": return "h-10 w-10";
      case "expanded": return "h-16 w-16";
      default: return "h-12 w-12";
    }
  };

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${getGridCols()}`}>
        {clients.map((client) => {
          const complianceStatus = getComplianceStatus(client.clinicalDocuments?.carePlanDate);
          const clientAge = calculateAge(client.dateOfBirth);
          const isNewClient = client.isOnboarded !== "yes";
          const fundingType = client.category === "NDIS" ? client.ndisDetails?.ndisFundingType : null;

          return (
            <Card 
              key={client.id}
              className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-card"
              onClick={() => onViewClient(client)}
              data-testid={`card-client-${client.id}`}
            >
              <CardContent className={getCardPadding()}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className={getAvatarSize()}>
                      <AvatarImage src={client.photo || undefined} alt={client.participantName} />
                      <AvatarFallback className="text-sm">{getInitials(client.participantName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {client.clientNumber && (
                          <Badge 
                            variant="secondary" 
                            className="font-mono text-xs shrink-0"
                          >
                            {formatClientNumber(client.clientNumber)}
                          </Badge>
                        )}
                        <p className="font-medium truncate">{client.participantName}</p>
                        {isNewClient && (
                          <Badge 
                            variant="outline" 
                            className="gap-1 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs shrink-0"
                          >
                            <Sparkles className="w-3 h-3" />
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {clientAge ? `${clientAge} years` : "Age N/A"}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-menu-${client.id}`}
                        aria-label={`Actions for ${client.participantName}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewClient(client); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Client
                      </DropdownMenuItem>
                      {!isArchiveView && (
                        <>
                          <DropdownMenuItem onClick={(e) => handleEditClient(e, client.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleAssignClient(e, client.id)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign Staff
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleArchiveClient(e, client.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive Client
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {/* Client Status Badge */}
                  {client.isArchived === "yes" ? (
                    <Badge className="text-xs text-white border-0 bg-slate-500">
                      Archived
                    </Badge>
                  ) : (
                    <Badge 
                      className={`text-xs text-white border-0 ${
                        client.status === "Hospital" ? "bg-orange-500" :
                        client.status === "Paused" ? "bg-amber-500" :
                        client.status === "Discharged" ? "bg-red-500" :
                        "bg-emerald-500"
                      }`}
                    >
                      {client.status || "Active"}
                    </Badge>
                  )}
                  <CategoryBadge category={client.category} abbreviated />
                  {fundingType && <FundingTypeBadge fundingType={fundingType} />}
                  {client.advancedCareDirective === "NFR" && (
                    <Badge variant="outline" className="gap-1 bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs">
                      <HeartOff className="w-3 h-3" />
                      NFR
                    </Badge>
                  )}
                  {client.advancedCareDirective === "For Resus" && (
                    <Badge variant="outline" className="gap-1 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-xs">
                      <Heart className="w-3 h-3" />
                      Resus
                    </Badge>
                  )}
                </div>

                {density !== "compact" && (
                  <div className="mt-3 space-y-1 text-sm">
                    {client.phoneNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{client.phoneNumber}</span>
                      </div>
                    )}
                    {client.email && density === "expanded" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatCareManagerName(client.careTeam?.careManager)}
                    </span>
                    {/* Care Team Icons */}
                    <div className="flex items-center gap-0.5 ml-2">
                      {(client.generalPractitionerId || client.careTeam?.generalPractitioner) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-0.5 rounded bg-rose-100 dark:bg-rose-900/30">
                              <Stethoscope className="w-3 h-3 text-rose-600" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">GP Assigned</TooltipContent>
                        </Tooltip>
                      )}
                      {(client.pharmacyId || client.careTeam?.pharmacy) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-0.5 rounded bg-teal-100 dark:bg-teal-900/30">
                              <Pill className="w-3 h-3 text-teal-600" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Pharmacy Assigned</TooltipContent>
                        </Tooltip>
                      )}
                      {client.careTeam?.supportCoordinatorId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Support Coordinator</TooltipContent>
                        </Tooltip>
                      )}
                      {client.careTeam?.planManagerId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-0.5 rounded bg-pink-100 dark:bg-pink-900/30">
                              <Briefcase className="w-3 h-3 text-pink-600" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Plan Manager</TooltipContent>
                        </Tooltip>
                      )}
                      {client.careTeam?.alliedHealthProfessionalId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-0.5 rounded bg-violet-100 dark:bg-violet-900/30">
                              <HeartPulse className="w-3 h-3 text-violet-600" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Allied Health</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <ComplianceIndicator status={complianceStatus} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Showing {clients.length} clients</p>
      </div>
    </div>
  );
}
