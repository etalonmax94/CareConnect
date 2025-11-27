import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Phone, Mail, Building2, Users, Loader2, Eye, ChevronRight, Pencil, Trash2 } from "lucide-react";
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
import type { PlanManager, Client } from "@shared/schema";

export default function PlanManagersPage() {
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<PlanManager | null>(null);
  const [deleteManager, setDeleteManager] = useState<PlanManager | null>(null);
  const [viewingClients, setViewingClients] = useState<PlanManager | null>(null);
  const [selectedManager, setSelectedManager] = useState<PlanManager | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: managers = [], isLoading } = useQuery<PlanManager[]>({
    queryKey: ["/api/plan-managers"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, managers]);

  const { data: managerClients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/plan-managers", viewingClients?.id, "clients"],
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
            Plan Managers
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage plan managers and view their clients</p>
        </div>
        <Button 
          size="sm" 
          className="w-full sm:w-auto" 
          onClick={() => setIsAddDialogOpen(true)}
          data-testid="button-add-manager"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Plan Manager
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Plan Managers ({managers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No plan managers added yet</p>
              <p className="text-sm">Click "Add Plan Manager" to add plan managers</p>
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
                {managers.map((manager) => (
                  <TableRow 
                    key={manager.id} 
                    ref={manager.id === highlightId ? highlightRef : undefined}
                    className={`cursor-pointer hover-elevate ${highlightedId === manager.id ? "bg-primary/10 animate-pulse" : ""}`}
                    onClick={() => {
                      setSelectedManager(manager);
                      setIsDrawerOpen(true);
                    }}
                    data-testid={`row-manager-${manager.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                            {getInitials(manager.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{manager.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {manager.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {manager.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {manager.email ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          {manager.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {manager.organisation ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {manager.organisation}
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
                            setViewingClients(manager);
                          }}
                          data-testid={`button-view-clients-${manager.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingManager(manager);
                          }}
                          data-testid={`button-edit-manager-${manager.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteManager(manager);
                          }}
                          data-testid={`button-delete-manager-${manager.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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

      {/* View Clients Dialog */}
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
          ) : managerClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No clients assigned to this plan manager</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {managerClients.map((client: Client) => (
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

      {/* Add Plan Manager Dialog */}
      <AddProviderDialog
        providerType="planManager"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {/* Edit Plan Manager Dialog - Conditionally rendered when manager is selected */}
      {editingManager && (
        <EditProviderDialog
          providerType="planManager"
          provider={editingManager}
          open={!!editingManager}
          onOpenChange={(open) => !open && setEditingManager(null)}
          showTrigger={false}
        />
      )}

      {/* Delete Confirmation Dialog - Conditionally rendered when manager is selected */}
      {deleteManager && (
        <DeleteConfirmationDialog
          providerType="planManager"
          provider={deleteManager}
          open={!!deleteManager}
          onOpenChange={(open) => !open && setDeleteManager(null)}
          showTrigger={false}
        />
      )}

      {/* Plan Manager Detail Drawer */}
      <EntityDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        entityType="planManager"
        entityId={selectedManager?.id || null}
        entityData={selectedManager}
      />
    </div>
  );
}
