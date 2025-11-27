import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, MapPin, Building2, Stethoscope } from "lucide-react";
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
import type { AlliedHealthProfessional } from "@shared/schema";

type Specialty = 
  | "Physiotherapist" 
  | "Occupational Therapist" 
  | "Speech Pathologist"
  | "Psychologist" 
  | "Dietitian" 
  | "Podiatrist" 
  | "Exercise Physiologist"
  | "Social Worker" 
  | "Counsellor" 
  | "Behaviour Support Practitioner" 
  | "Other";

const SPECIALTIES: Specialty[] = [
  "Physiotherapist",
  "Occupational Therapist",
  "Speech Pathologist",
  "Psychologist",
  "Dietitian",
  "Podiatrist",
  "Exercise Physiologist",
  "Social Worker",
  "Counsellor",
  "Behaviour Support Practitioner",
  "Other"
];

const getSpecialtyColor = (specialty: string) => {
  const colors: Record<string, string> = {
    "Physiotherapist": "bg-blue-100 text-blue-700",
    "Occupational Therapist": "bg-green-100 text-green-700",
    "Speech Pathologist": "bg-purple-100 text-purple-700",
    "Psychologist": "bg-pink-100 text-pink-700",
    "Dietitian": "bg-orange-100 text-orange-700",
    "Podiatrist": "bg-yellow-100 text-yellow-700",
    "Exercise Physiologist": "bg-cyan-100 text-cyan-700",
    "Social Worker": "bg-indigo-100 text-indigo-700",
    "Counsellor": "bg-rose-100 text-rose-700",
    "Behaviour Support Practitioner": "bg-teal-100 text-teal-700",
    "Other": "bg-gray-100 text-gray-700"
  };
  return colors[specialty] || colors["Other"];
};

export default function AlliedHealthProfessionalsPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAhp, setEditingAhp] = useState<AlliedHealthProfessional | null>(null);
  const [deleteAhp, setDeleteAhp] = useState<AlliedHealthProfessional | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    specialty: "" as Specialty | "",
    practiceName: "",
    phoneNumber: "", 
    email: "", 
    address: "",
    notes: ""
  });

  const { data: alliedHealthProfessionals = [], isLoading } = useQuery<AlliedHealthProfessional[]>({
    queryKey: ["/api/allied-health-professionals"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, alliedHealthProfessionals]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/allied-health-professionals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allied-health-professionals"] });
      setIsAddDialogOpen(false);
      setFormData({ name: "", specialty: "", practiceName: "", phoneNumber: "", email: "", address: "", notes: "" });
      toast({ title: "Allied health professional added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add allied health professional", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & typeof formData) => 
      apiRequest("PATCH", `/api/allied-health-professionals/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allied-health-professionals"] });
      setEditingAhp(null);
      setFormData({ name: "", specialty: "", practiceName: "", phoneNumber: "", email: "", address: "", notes: "" });
      toast({ title: "Allied health professional updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update allied health professional", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/allied-health-professionals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allied-health-professionals"] });
      setDeleteAhp(null);
      toast({ title: "Allied health professional deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete allied health professional", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.specialty) {
      toast({ title: "Specialty is required", variant: "destructive" });
      return;
    }
    if (editingAhp) {
      updateMutation.mutate({ id: editingAhp.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const isFormValid = formData.name.trim() !== "" && formData.specialty !== "";

  const openEditDialog = (ahp: AlliedHealthProfessional) => {
    setEditingAhp(ahp);
    setFormData({
      name: ahp.name,
      specialty: ahp.specialty as Specialty,
      practiceName: ahp.practiceName || "",
      phoneNumber: ahp.phoneNumber || "",
      email: ahp.email || "",
      address: ahp.address || "",
      notes: ahp.notes || "",
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingAhp(null);
    setFormData({ name: "", specialty: "", practiceName: "", phoneNumber: "", email: "", address: "", notes: "" });
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

  const AhpForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-name" : "name"}>Name *</Label>
        <Input
          id={isEdit ? "edit-name" : "name"}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Full name"
          required
          data-testid={isEdit ? "input-edit-ahp-name" : "input-ahp-name"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-specialty" : "specialty"}>Specialty *</Label>
        <Select
          value={formData.specialty}
          onValueChange={(value: Specialty) => setFormData({ ...formData, specialty: value })}
        >
          <SelectTrigger data-testid={isEdit ? "select-edit-ahp-specialty" : "select-ahp-specialty"}>
            <SelectValue placeholder="Select specialty" />
          </SelectTrigger>
          <SelectContent>
            {SPECIALTIES.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>
                {specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-practice" : "practice"}>Practice Name</Label>
        <Input
          id={isEdit ? "edit-practice" : "practice"}
          value={formData.practiceName}
          onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
          placeholder="Practice or clinic name"
          data-testid={isEdit ? "input-edit-ahp-practice" : "input-ahp-practice"}
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
            data-testid={isEdit ? "input-edit-ahp-phone" : "input-ahp-phone"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-email" : "email"}>Email</Label>
          <Input
            id={isEdit ? "edit-email" : "email"}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email"
            data-testid={isEdit ? "input-edit-ahp-email" : "input-ahp-email"}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-address" : "address"}>Address</Label>
        <Input
          id={isEdit ? "edit-address" : "address"}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter full address"
          data-testid={isEdit ? "input-edit-ahp-address" : "input-ahp-address"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-notes" : "notes"}>Notes</Label>
        <Textarea
          id={isEdit ? "edit-notes" : "notes"}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          rows={3}
          data-testid={isEdit ? "input-edit-ahp-notes" : "input-ahp-notes"}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={(isEdit ? updateMutation.isPending : createMutation.isPending) || !isFormValid} 
          data-testid={isEdit ? "button-update-ahp" : "button-submit-ahp"}
        >
          {(isEdit ? updateMutation.isPending : createMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Update" : "Add Professional"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
            Allied Health Professionals
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage allied health professionals for client care teams</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto" data-testid="button-add-ahp">
              <Plus className="w-4 h-4 mr-2" />
              Add Professional
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Allied Health Professional</DialogTitle>
              <DialogDescription>Add a new allied health professional to the database for client care teams.</DialogDescription>
            </DialogHeader>
            <AhpForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Allied Health Professionals ({alliedHealthProfessionals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alliedHealthProfessionals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No allied health professionals added yet</p>
              <p className="text-sm">Click "Add Professional" to add allied health professionals</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Practice</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alliedHealthProfessionals.map((ahp) => (
                  <TableRow 
                    key={ahp.id} 
                    ref={ahp.id === highlightId ? highlightRef : undefined}
                    className={highlightedId === ahp.id ? "bg-primary/10 animate-pulse" : ""}
                    data-testid={`row-ahp-${ahp.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                            {getInitials(ahp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{ahp.name}</span>
                          {ahp.address && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{ahp.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSpecialtyColor(ahp.specialty)}>
                        {ahp.specialty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ahp.practiceName ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="w-3 h-3" />
                          {ahp.practiceName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ahp.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {ahp.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ahp.email ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{ahp.email}</span>
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
                          onClick={() => openEditDialog(ahp)}
                          data-testid={`button-edit-ahp-${ahp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAhp(ahp)}
                          data-testid={`button-delete-ahp-${ahp.id}`}
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
      <Dialog open={!!editingAhp} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Allied Health Professional</DialogTitle>
            <DialogDescription>Update allied health professional information.</DialogDescription>
          </DialogHeader>
          <AhpForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAhp} onOpenChange={(open) => !open && setDeleteAhp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allied Health Professional</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteAhp?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAhp && deleteMutation.mutate(deleteAhp.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-ahp"
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
