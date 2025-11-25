import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, Building2, Users, Loader2, Eye } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CategoryBadge from "@/components/CategoryBadge";
import type { PlanManager, Client } from "@shared/schema";

export default function PlanManagersPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<PlanManager | null>(null);
  const [deleteManager, setDeleteManager] = useState<PlanManager | null>(null);
  const [viewingClients, setViewingClients] = useState<PlanManager | null>(null);
  const [formData, setFormData] = useState({ name: "", phoneNumber: "", email: "", organisation: "" });

  const { data: managers = [], isLoading } = useQuery<PlanManager[]>({
    queryKey: ["/api/plan-managers"],
  });

  const { data: managerClients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/plan-managers", viewingClients?.id, "clients"],
    enabled: !!viewingClients,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/plan-managers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-managers"] });
      setIsAddDialogOpen(false);
      setFormData({ name: "", phoneNumber: "", email: "", organisation: "" });
      toast({ title: "Plan manager added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add plan manager", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & typeof formData) => 
      apiRequest("PATCH", `/api/plan-managers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-managers"] });
      setEditingManager(null);
      setFormData({ name: "", phoneNumber: "", email: "", organisation: "" });
      toast({ title: "Plan manager updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update plan manager", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/plan-managers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan-managers"] });
      setDeleteManager(null);
      toast({ title: "Plan manager deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete plan manager", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingManager) {
      updateMutation.mutate({ id: editingManager.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const isFormValid = formData.name.trim() !== "";

  const openEditDialog = (manager: PlanManager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      phoneNumber: manager.phoneNumber || "",
      email: manager.email || "",
      organisation: manager.organisation || "",
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingManager(null);
    setFormData({ name: "", phoneNumber: "", email: "", organisation: "" });
  };

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Plan Managers
          </h1>
          <p className="text-muted-foreground">Manage plan managers and view their clients</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-manager">
              <Plus className="w-4 h-4 mr-2" />
              Add Plan Manager
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Plan Manager</DialogTitle>
              <DialogDescription>Add a new plan manager to the system.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                  data-testid="input-manager-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                  data-testid="input-manager-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  data-testid="input-manager-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation</Label>
                <Input
                  id="organisation"
                  value={formData.organisation}
                  onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                  placeholder="Enter organisation name"
                  data-testid="input-manager-organisation"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !isFormValid} data-testid="button-submit-manager">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Manager
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                  <TableRow key={manager.id} data-testid={`row-manager-${manager.id}`}>
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
                          onClick={() => setViewingClients(manager)}
                          data-testid={`button-view-clients-${manager.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(manager)}
                          data-testid={`button-edit-manager-${manager.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteManager(manager)}
                          data-testid={`button-delete-manager-${manager.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingManager} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plan Manager</DialogTitle>
            <DialogDescription>Update plan manager information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
                data-testid="input-edit-manager-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
                data-testid="input-edit-manager-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                data-testid="input-edit-manager-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organisation">Organisation</Label>
              <Input
                id="edit-organisation"
                value={formData.organisation}
                onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                placeholder="Enter organisation name"
                data-testid="input-edit-manager-organisation"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !isFormValid} data-testid="button-update-manager">
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Manager
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteManager} onOpenChange={(open) => !open && setDeleteManager(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan Manager</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteManager?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteManager && deleteMutation.mutate(deleteManager.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-manager"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
