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
import type { SupportCoordinator, Client } from "@shared/schema";

export default function SupportCoordinatorsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<SupportCoordinator | null>(null);
  const [deleteCoordinator, setDeleteCoordinator] = useState<SupportCoordinator | null>(null);
  const [viewingClients, setViewingClients] = useState<SupportCoordinator | null>(null);
  const [formData, setFormData] = useState({ name: "", phoneNumber: "", email: "", organisation: "" });

  const { data: coordinators = [], isLoading } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
  });

  const { data: coordinatorClients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/support-coordinators", viewingClients?.id, "clients"],
    enabled: !!viewingClients,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/support-coordinators", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-coordinators"] });
      setIsAddDialogOpen(false);
      setFormData({ name: "", phoneNumber: "", email: "", organisation: "" });
      toast({ title: "Support coordinator added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add support coordinator", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & typeof formData) => 
      apiRequest("PATCH", `/api/support-coordinators/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-coordinators"] });
      setEditingCoordinator(null);
      setFormData({ name: "", phoneNumber: "", email: "", organisation: "" });
      toast({ title: "Support coordinator updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update support coordinator", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/support-coordinators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-coordinators"] });
      setDeleteCoordinator(null);
      toast({ title: "Support coordinator deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete support coordinator", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingCoordinator) {
      updateMutation.mutate({ id: editingCoordinator.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const isFormValid = formData.name.trim() !== "";

  const openEditDialog = (coordinator: SupportCoordinator) => {
    setEditingCoordinator(coordinator);
    setFormData({
      name: coordinator.name,
      phoneNumber: coordinator.phoneNumber || "",
      email: coordinator.email || "",
      organisation: coordinator.organisation || "",
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCoordinator(null);
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
            Support Coordinators
          </h1>
          <p className="text-muted-foreground">Manage support coordinators and view their clients</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-coordinator">
              <Plus className="w-4 h-4 mr-2" />
              Add Coordinator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Support Coordinator</DialogTitle>
              <DialogDescription>Add a new support coordinator to the system.</DialogDescription>
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
                  data-testid="input-coordinator-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                  data-testid="input-coordinator-phone"
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
                  data-testid="input-coordinator-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation</Label>
                <Input
                  id="organisation"
                  value={formData.organisation}
                  onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                  placeholder="Enter organisation name"
                  data-testid="input-coordinator-organisation"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !isFormValid} data-testid="button-submit-coordinator">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Coordinator
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
                  <TableRow key={coordinator.id} data-testid={`row-coordinator-${coordinator.id}`}>
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
                          onClick={() => setViewingClients(coordinator)}
                          data-testid={`button-view-clients-${coordinator.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(coordinator)}
                          data-testid={`button-edit-coordinator-${coordinator.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteCoordinator(coordinator)}
                          data-testid={`button-delete-coordinator-${coordinator.id}`}
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
      <Dialog open={!!editingCoordinator} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Support Coordinator</DialogTitle>
            <DialogDescription>Update support coordinator information.</DialogDescription>
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
                data-testid="input-edit-coordinator-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
                data-testid="input-edit-coordinator-phone"
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
                data-testid="input-edit-coordinator-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organisation">Organisation</Label>
              <Input
                id="edit-organisation"
                value={formData.organisation}
                onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                placeholder="Enter organisation name"
                data-testid="input-edit-coordinator-organisation"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !isFormValid} data-testid="button-update-coordinator">
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Coordinator
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCoordinator} onOpenChange={(open) => !open && setDeleteCoordinator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Support Coordinator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteCoordinator?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCoordinator && deleteMutation.mutate(deleteCoordinator.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-coordinator"
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
