import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Building2, ExternalLink, User, Loader2, ChevronRight } from "lucide-react";
import type { Client, Staff, GP, Pharmacy, SupportCoordinator, PlanManager, AlliedHealthProfessional } from "@shared/schema";

type EntityType = "staff" | "gp" | "pharmacy" | "supportCoordinator" | "planManager" | "alliedHealth";

interface EntityDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string | null;
  entityData?: Staff | GP | Pharmacy | SupportCoordinator | PlanManager | AlliedHealthProfessional | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatClientId(id: number): string {
  return `C-${id}`;
}

export function EntityDetailDrawer({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityData,
}: EntityDetailDrawerProps) {
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open && !!entityId,
  });

  const getAssignedClients = (): Client[] => {
    if (!entityId || !entityData) return [];
    
    const entityName = "name" in entityData ? entityData.name : "";
    
    switch (entityType) {
      case "staff":
        return clients.filter((client) => {
          const careTeam = client.careTeam as { 
            careManager?: string; 
            careManagerId?: string;
            preferredWorkers?: string[];
            preferredWorkerIds?: string[];
          } | null;
          return careTeam?.preferredWorkers?.includes(entityName) || 
                 careTeam?.preferredWorkerIds?.includes(entityId) ||
                 careTeam?.careManager === entityName ||
                 careTeam?.careManagerId === entityId;
        });
      case "gp":
        return clients.filter((client) => {
          const careTeam = client.careTeam as { generalPractitioner?: string } | null;
          return client.generalPractitionerId === entityId || 
                 careTeam?.generalPractitioner === entityName;
        });
      case "pharmacy":
        return clients.filter((client) => {
          const careTeam = client.careTeam as { pharmacy?: string } | null;
          return client.pharmacyId === entityId || 
                 careTeam?.pharmacy === entityName;
        });
      case "supportCoordinator":
        return clients.filter((client) => {
          const careTeam = client.careTeam as { supportCoordinator?: string; supportCoordinatorId?: string } | null;
          return careTeam?.supportCoordinatorId === entityId || 
                 careTeam?.supportCoordinator === entityName;
        });
      case "planManager":
        return clients.filter((client) => {
          const careTeam = client.careTeam as { planManager?: string; planManagerId?: string } | null;
          return careTeam?.planManagerId === entityId || 
                 careTeam?.planManager === entityName;
        });
      case "alliedHealth":
        return clients.filter((client) => {
          const careTeam = client.careTeam as { alliedHealthProfessionalId?: string } | null;
          return careTeam?.alliedHealthProfessionalId === entityId;
        });
      default:
        return [];
    }
  };

  const assignedClients = getAssignedClients();

  const getEntityTitle = (): string => {
    switch (entityType) {
      case "staff":
        return "Staff Member";
      case "gp":
        return "General Practitioner";
      case "pharmacy":
        return "Pharmacy";
      case "supportCoordinator":
        return "Support Coordinator";
      case "planManager":
        return "Plan Manager";
      case "alliedHealth":
        return "Allied Health Professional";
      default:
        return "Details";
    }
  };

  const renderEntityDetails = () => {
    if (!entityData) return null;

    const commonFields: JSX.Element[] = [];
    
    if ("name" in entityData && entityData.name) {
      const name = entityData.name;
      const photo = "photo" in entityData ? entityData.photo as string | null : null;
      const role = "role" in entityData ? entityData.role as string | null : null;
      const specialty = "specialty" in entityData ? entityData.specialty as string | null : null;
      const company = "company" in entityData ? entityData.company as string | null : null;
      
      commonFields.push(
        <div key="name" className="flex items-center gap-3 mb-4">
          <Avatar className="h-16 w-16">
            {photo ? (
              <AvatarImage src={photo} alt={name} />
            ) : null}
            <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            {role && (
              <Badge variant="secondary">{formatRole(role)}</Badge>
            )}
            {specialty && (
              <Badge variant="secondary">{specialty}</Badge>
            )}
            {company && (
              <p className="text-sm text-muted-foreground">{company}</p>
            )}
          </div>
        </div>
      );
    }

    const contactFields: JSX.Element[] = [];
    
    if ("phoneNumber" in entityData && entityData.phoneNumber) {
      contactFields.push(
        <div key="phone" className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${entityData.phoneNumber}`} className="hover:underline">
            {entityData.phoneNumber}
          </a>
        </div>
      );
    }
    
    if ("phone" in entityData && entityData.phone) {
      const phone = entityData.phone as string;
      contactFields.push(
        <div key="phone2" className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${phone}`} className="hover:underline">
            {phone}
          </a>
        </div>
      );
    }
    
    if ("fax" in entityData && entityData.fax) {
      const fax = entityData.fax as string;
      contactFields.push(
        <div key="fax" className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>Fax: {fax}</span>
        </div>
      );
    }
    
    if ("email" in entityData && entityData.email) {
      contactFields.push(
        <div key="email" className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a href={`mailto:${entityData.email}`} className="hover:underline truncate">
            {entityData.email}
          </a>
        </div>
      );
    }
    
    if ("address" in entityData && entityData.address) {
      contactFields.push(
        <div key="address" className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <span>{entityData.address}</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {commonFields}
        {contactFields.length > 0 && (
          <div className="space-y-2">
            {contactFields}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{getEntityTitle()}</SheetTitle>
          <SheetDescription>
            View details and assigned clients
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {!entityData ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {renderEntityDetails()}
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned Clients ({assignedClients.length})
                </h4>
                
                {clientsLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : assignedClients.length === 0 ? (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground text-center">
                        No clients currently assigned
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {assignedClients.map((client) => (
                      <Link key={client.id} href={`/clients/${client.id}`}>
                        <Card 
                          className="hover-elevate cursor-pointer"
                          onClick={() => onOpenChange(false)}
                          data-testid={`link-client-${client.id}`}
                        >
                          <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {client.photo ? (
                                  <AvatarImage src={client.photo} alt={client.participantName || ""} />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {getInitials(client.participantName || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {client.participantName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatClientId(client.clientNumber || 0)} • {client.category}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
