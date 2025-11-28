import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Phone, Mail, Building2, Users, Loader2, Eye, ChevronRight } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CategoryBadge from "@/components/CategoryBadge";
import { EntityDetailDrawer } from "@/components/EntityDetailDrawer";
import { AddProviderDialog } from "@/components/AddProviderDialog";
import { EditProviderDialog } from "@/components/EditProviderDialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import type { SupportCoordinator, Client } from "@shared/schema";

export default function SupportCoordinatorsPage() {
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<SupportCoordinator | null>(null);
  const [deleteCoordinator, setDeleteCoordinator] = useState<SupportCoordinator | null>(null);
  const [viewingClients, setViewingClients] = useState<SupportCoordinator | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState<SupportCoordinator | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: coordinators = [], isLoading } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, coordinators]);

  const { data: coordinatorClients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/support-coordinators", viewingClients?.id, "clients"],
    enabled: !!viewingClients,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Support Coordinators
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage support coordinators and view their clients</p>
        </div>
        <Button 
          size="sm" 
          className="w-full sm:w-auto" 
          data-testid="button-add-coordinator"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Coordinator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Coordinators ({coordinators.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coordinators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No support coordinators added yet</p>
              <p className="text-sm">Click "Add Coordinator" to add support coordinators</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coordinators.map((coordinator) => (
                  <TableRow 
                    key={coordinator.id} 
                    ref={coordinator.id === highlightId ? highlightRef : undefined}
                    className={`cursor-pointer hover-elevate ${highlightedId === coordinator.id ? "bg-primary/10 animate-pulse" : ""}`}
                    onClick={() => {
                      setSelectedCoordinator(coordinator);
                      setIsDrawerOpen(true);
                    }}
                    data-testid={`row-coordinator-${coordinator.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                            {getInitials(coordinator.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{coordinator.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {coordinator.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {coordinator.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {coordinator.email ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          {coordinator.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {coordinator.organisation ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {coordinator.organisation}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingClients(coordinator);
                          }}
                          data-testid={`button-view-clients-${coordinator.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <EditProviderDialog
                          providerType="supportCoordinator"
                          provider={coordinator}
                          showTrigger={true}
                          triggerVariant="ghost"
                          triggerSize="icon"
                        />
                        <DeleteConfirmationDialog
                          providerType="supportCoordinator"
                          provider={coordinator}
                          showTrigger={true}
                          triggerVariant="ghost"
                          triggerSize="icon"
                        />
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddProviderDialog
        providerType="supportCoordinator"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {editingCoordinator && (
        <EditProviderDialog
          providerType="supportCoordinator"
          provider={editingCoordinator}
          open={!!editingCoordinator}
          onOpenChange={(open) => !open && setEditingCoordinator(null)}
          showTrigger={false}
        />
      )}

      {deleteCoordinator && (
        <DeleteConfirmationDialog
          providerType="supportCoordinator"
          provider={deleteCoordinator}
          open={!!deleteCoordinator}
          onOpenChange={(open) => !open && setDeleteCoordinator(null)}
          showTrigger={false}
        />
      )}

      <Dialog open={!!viewingClients} onOpenChange={(open) => !open && setViewingClients(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clients for {viewingClients?.name}</DialogTitle>
            <DialogDescription>
              {viewingClients?.organisation && `Organisation: ${viewingClients.organisation}`}
            </DialogDescription>
          </DialogHeader>
          {isLoadingClients ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : coordinatorClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No clients assigned to this coordinator</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {coordinatorClients.map((client: Client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center justify-between p-3 hover-elevate rounded-lg border cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {client.participantName?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.participantName}</p>
                        <p className="text-xs text-muted-foreground">{client.phoneNumber}</p>
                      </div>
                    </div>
                    <CategoryBadge category={client.category} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntityDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        entityType="supportCoordinator"
        entityId={selectedCoordinator?.id || null}
        entityData={selectedCoordinator}
      />
    </div>
  );
}
