import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, Building2, Users, Loader2, Stethoscope, MapPin, FileText } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { GP } from "@shared/schema";

export default function GPsPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGP, setEditingGP] = useState<GP | null>(null);
  const [deleteGP, setDeleteGP] = useState<GP | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    practiceName: "", 
    phoneNumber: "", 
    faxNumber: "",
    email: "", 
    address: "",
    notes: ""
  });

  const { data: gps = [], isLoading } = useQuery<GP[]>({
    queryKey: ["/api/gps"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, gps]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/gps", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gps"] });
      setIsAddDialogOpen(false);
      setFormData({ name: "", practiceName: "", phoneNumber: "", faxNumber: "", email: "", address: "", notes: "" });
      toast({ title: "GP added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add GP", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & typeof formData) => 
      apiRequest("PATCH", `/api/gps/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gps"] });
      setEditingGP(null);
      setFormData({ name: "", practiceName: "", phoneNumber: "", faxNumber: "", email: "", address: "", notes: "" });
      toast({ title: "GP updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update GP", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/gps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gps"] });
      setDeleteGP(null);
      toast({ title: "GP deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete GP", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingGP) {
      updateMutation.mutate({ id: editingGP.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const isFormValid = formData.name.trim() !== "";

  const openEditDialog = (gp: GP) => {
    setEditingGP(gp);
    setFormData({
      name: gp.name,
      practiceName: gp.practiceName || "",
      phoneNumber: gp.phoneNumber || "",
      faxNumber: gp.faxNumber || "",
      email: gp.email || "",
      address: gp.address || "",
      notes: gp.notes || "",
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingGP(null);
    setFormData({ name: "", practiceName: "", phoneNumber: "", faxNumber: "", email: "", address: "", notes: "" });
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

  const GPForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-name" : "name"}>Doctor Name *</Label>
          <Input
            id={isEdit ? "edit-name" : "name"}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Dr. John Smith"
            required
            data-testid={isEdit ? "input-edit-gp-name" : "input-gp-name"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-practice" : "practice"}>Practice Name</Label>
          <Input
            id={isEdit ? "edit-practice" : "practice"}
            value={formData.practiceName}
            onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
            placeholder="Medical Centre Name"
            data-testid={isEdit ? "input-edit-gp-practice" : "input-gp-practice"}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-phone" : "phone"}>Phone Number</Label>
          <Input
            id={isEdit ? "edit-phone" : "phone"}
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="Enter phone number"
            data-testid={isEdit ? "input-edit-gp-phone" : "input-gp-phone"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-fax" : "fax"}>Fax Number</Label>
          <Input
            id={isEdit ? "edit-fax" : "fax"}
            value={formData.faxNumber}
            onChange={(e) => setFormData({ ...formData, faxNumber: e.target.value })}
            placeholder="Enter fax number"
            data-testid={isEdit ? "input-edit-gp-fax" : "input-gp-fax"}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-email" : "email"}>Email</Label>
        <Input
          id={isEdit ? "edit-email" : "email"}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email"
          data-testid={isEdit ? "input-edit-gp-email" : "input-gp-email"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-address" : "address"}>Address</Label>
        <Input
          id={isEdit ? "edit-address" : "address"}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter full address"
          data-testid={isEdit ? "input-edit-gp-address" : "input-gp-address"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-notes" : "notes"}>Notes</Label>
        <Textarea
          id={isEdit ? "edit-notes" : "notes"}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about this GP"
          rows={3}
          data-testid={isEdit ? "input-edit-gp-notes" : "input-gp-notes"}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={(isEdit ? updateMutation.isPending : createMutation.isPending) || !isFormValid} 
          data-testid={isEdit ? "button-update-gp" : "button-submit-gp"}
        >
          {(isEdit ? updateMutation.isPending : createMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Update GP" : "Add GP"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
            General Practitioners
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage GP database for client referrals</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto" data-testid="button-add-gp">
              <Plus className="w-4 h-4 mr-2" />
              Add GP
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add General Practitioner</DialogTitle>
              <DialogDescription>Add a new GP to the database for client assignments.</DialogDescription>
            </DialogHeader>
            <GPForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            General Practitioners ({gps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No GPs added yet</p>
              <p className="text-sm">Click "Add GP" to add general practitioners</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Practice</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Fax</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gps.map((gp) => (
                  <TableRow 
                    key={gp.id} 
                    ref={gp.id === highlightId ? highlightRef : undefined}
                    className={highlightedId === gp.id ? "bg-primary/10 animate-pulse" : ""}
                    data-testid={`row-gp-${gp.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-green-100 text-green-700">
                            {getInitials(gp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{gp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {gp.practiceName ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {gp.practiceName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gp.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {gp.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gp.faxNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="w-3 h-3" />
                          {gp.faxNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gp.address ? (
                        <div className="flex items-center gap-1 text-sm max-w-[200px] truncate" title={gp.address}>
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{gp.address}</span>
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
                          onClick={() => openEditDialog(gp)}
                          data-testid={`button-edit-gp-${gp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteGP(gp)}
                          data-testid={`button-delete-gp-${gp.id}`}
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
      <Dialog open={!!editingGP} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit General Practitioner</DialogTitle>
            <DialogDescription>Update GP information.</DialogDescription>
          </DialogHeader>
          <GPForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGP} onOpenChange={(open) => !open && setDeleteGP(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete GP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteGP?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGP && deleteMutation.mutate(deleteGP.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-gp"
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
