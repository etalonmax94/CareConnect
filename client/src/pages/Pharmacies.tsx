import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, MapPin, FileText, Truck, Building2 } from "lucide-react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Pharmacy } from "@shared/schema";

export default function PharmaciesPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [deletePharmacy, setDeletePharmacy] = useState<Pharmacy | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    phoneNumber: "", 
    faxNumber: "",
    email: "", 
    address: "",
    deliveryAvailable: "no" as "yes" | "no",
    notes: ""
  });

  const { data: pharmacies = [], isLoading } = useQuery<Pharmacy[]>({
    queryKey: ["/api/pharmacies"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, pharmacies]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/pharmacies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
      setIsAddDialogOpen(false);
      setFormData({ name: "", phoneNumber: "", faxNumber: "", email: "", address: "", deliveryAvailable: "no", notes: "" });
      toast({ title: "Pharmacy added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add pharmacy", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & typeof formData) => 
      apiRequest("PATCH", `/api/pharmacies/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
      setEditingPharmacy(null);
      setFormData({ name: "", phoneNumber: "", faxNumber: "", email: "", address: "", deliveryAvailable: "no", notes: "" });
      toast({ title: "Pharmacy updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update pharmacy", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/pharmacies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies"] });
      setDeletePharmacy(null);
      toast({ title: "Pharmacy deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete pharmacy", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingPharmacy) {
      updateMutation.mutate({ id: editingPharmacy.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const isFormValid = formData.name.trim() !== "";

  const openEditDialog = (pharmacy: Pharmacy) => {
    setEditingPharmacy(pharmacy);
    setFormData({
      name: pharmacy.name,
      phoneNumber: pharmacy.phoneNumber || "",
      faxNumber: pharmacy.faxNumber || "",
      email: pharmacy.email || "",
      address: pharmacy.address || "",
      deliveryAvailable: (pharmacy.deliveryAvailable as "yes" | "no") || "no",
      notes: pharmacy.notes || "",
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingPharmacy(null);
    setFormData({ name: "", phoneNumber: "", faxNumber: "", email: "", address: "", deliveryAvailable: "no", notes: "" });
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

  const PharmacyForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-name" : "name"}>Pharmacy Name *</Label>
        <Input
          id={isEdit ? "edit-name" : "name"}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Pharmacy Name"
          required
          data-testid={isEdit ? "input-edit-pharmacy-name" : "input-pharmacy-name"}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-phone" : "phone"}>Phone Number</Label>
          <Input
            id={isEdit ? "edit-phone" : "phone"}
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="Enter phone number"
            data-testid={isEdit ? "input-edit-pharmacy-phone" : "input-pharmacy-phone"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-fax" : "fax"}>Fax Number</Label>
          <Input
            id={isEdit ? "edit-fax" : "fax"}
            value={formData.faxNumber}
            onChange={(e) => setFormData({ ...formData, faxNumber: e.target.value })}
            placeholder="Enter fax number"
            data-testid={isEdit ? "input-edit-pharmacy-fax" : "input-pharmacy-fax"}
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
          data-testid={isEdit ? "input-edit-pharmacy-email" : "input-pharmacy-email"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-address" : "address"}>Address</Label>
        <Input
          id={isEdit ? "edit-address" : "address"}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter full address"
          data-testid={isEdit ? "input-edit-pharmacy-address" : "input-pharmacy-address"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-delivery" : "delivery"}>Delivery Available</Label>
        <Select
          value={formData.deliveryAvailable}
          onValueChange={(value: "yes" | "no") => setFormData({ ...formData, deliveryAvailable: value })}
        >
          <SelectTrigger data-testid={isEdit ? "select-edit-pharmacy-delivery" : "select-pharmacy-delivery"}>
            <SelectValue placeholder="Delivery available?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes - Delivery Available</SelectItem>
            <SelectItem value="no">No - Collection Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-notes" : "notes"}>Notes</Label>
        <Textarea
          id={isEdit ? "edit-notes" : "notes"}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about this pharmacy"
          rows={3}
          data-testid={isEdit ? "input-edit-pharmacy-notes" : "input-pharmacy-notes"}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={(isEdit ? updateMutation.isPending : createMutation.isPending) || !isFormValid} 
          data-testid={isEdit ? "button-update-pharmacy" : "button-submit-pharmacy"}
        >
          {(isEdit ? updateMutation.isPending : createMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Update Pharmacy" : "Add Pharmacy"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
            Pharmacies
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage pharmacy database for client medication needs</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto" data-testid="button-add-pharmacy">
              <Plus className="w-4 h-4 mr-2" />
              Add Pharmacy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Pharmacy</DialogTitle>
              <DialogDescription>Add a new pharmacy to the database for client assignments.</DialogDescription>
            </DialogHeader>
            <PharmacyForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Pharmacies ({pharmacies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pharmacies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pharmacies added yet</p>
              <p className="text-sm">Click "Add Pharmacy" to add pharmacies</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Fax</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pharmacies.map((pharmacy) => (
                  <TableRow 
                    key={pharmacy.id} 
                    ref={pharmacy.id === highlightId ? highlightRef : undefined}
                    className={highlightedId === pharmacy.id ? "bg-primary/10 animate-pulse" : ""}
                    data-testid={`row-pharmacy-${pharmacy.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                            {getInitials(pharmacy.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{pharmacy.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pharmacy.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {pharmacy.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pharmacy.faxNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="w-3 h-3" />
                          {pharmacy.faxNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pharmacy.address ? (
                        <div className="flex items-center gap-1 text-sm max-w-[200px] truncate" title={pharmacy.address}>
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{pharmacy.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pharmacy.deliveryAvailable === "yes" ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                          <Truck className="w-3 h-3 mr-1" />
                          Delivers
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Collection Only
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(pharmacy)}
                          data-testid={`button-edit-pharmacy-${pharmacy.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletePharmacy(pharmacy)}
                          data-testid={`button-delete-pharmacy-${pharmacy.id}`}
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
      <Dialog open={!!editingPharmacy} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Pharmacy</DialogTitle>
            <DialogDescription>Update pharmacy information.</DialogDescription>
          </DialogHeader>
          <PharmacyForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePharmacy} onOpenChange={(open) => !open && setDeletePharmacy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pharmacy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletePharmacy?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePharmacy && deleteMutation.mutate(deletePharmacy.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-pharmacy"
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
