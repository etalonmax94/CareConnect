import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StaffQualification {
  id: string;
  staffId: string;
  qualificationType: string;
  qualificationName: string;
  issuingOrganization?: string;
  certificationNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: "current" | "expired" | "pending_renewal" | "suspended";
  createdAt: string;
}

export default function StaffQualifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQualification, setEditingQualification] = useState<StaffQualification | null>(null);
  const [formData, setFormData] = useState({
    qualificationType: "",
    qualificationName: "",
    issuingOrganization: "",
    certificationNumber: "",
    issuedDate: "",
    expiryDate: "",
    status: "current" as const,
  });

  // Fetch qualifications for selected staff
  const { data: qualifications = [], isLoading } = useQuery<StaffQualification[]>({
    queryKey: [`/api/staff/${selectedStaffId}/qualifications`],
    enabled: !!selectedStaffId,
  });

  // Create qualification mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/staff/${selectedStaffId}/qualifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${selectedStaffId}/qualifications`] });
      toast({
        title: "Qualification Added",
        description: "Staff qualification has been added successfully.",
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update qualification mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/staff/qualifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${selectedStaffId}/qualifications`] });
      toast({
        title: "Qualification Updated",
        description: "Staff qualification has been updated successfully.",
      });
      setEditingQualification(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete qualification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/qualifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${selectedStaffId}/qualifications`] });
      toast({
        title: "Qualification Deleted",
        description: "Staff qualification has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      qualificationType: "",
      qualificationName: "",
      issuingOrganization: "",
      certificationNumber: "",
      issuedDate: "",
      expiryDate: "",
      status: "current",
    });
  };

  const handleEdit = (qual: StaffQualification) => {
    setEditingQualification(qual);
    setFormData({
      qualificationType: qual.qualificationType,
      qualificationName: qual.qualificationName,
      issuingOrganization: qual.issuingOrganization || "",
      certificationNumber: qual.certificationNumber || "",
      issuedDate: qual.issuedDate || "",
      expiryDate: qual.expiryDate || "",
      status: qual.status,
    });
  };

  const handleSave = () => {
    if (editingQualification) {
      updateMutation.mutate({ id: editingQualification.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string, expiryDate?: string) => {
    if (expiryDate) {
      const daysUntilExpiry = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) {
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expired</Badge>;
      } else if (daysUntilExpiry <= 30) {
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Expiring Soon</Badge>;
      }
    }

    switch (status) {
      case "current":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Current</Badge>;
      case "expired":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expired</Badge>;
      case "pending_renewal":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Renewal</Badge>;
      case "suspended":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Staff Qualifications</h1>
        <p className="text-muted-foreground">Manage staff certifications and training</p>
      </div>

      {/* Staff selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Staff Member</CardTitle>
          <CardDescription>Choose a staff member to view and manage their qualifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter Staff ID..."
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="max-w-md"
            />
            {selectedStaffId && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Qualification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Qualifications table */}
      {selectedStaffId && (
        <Card>
          <CardHeader>
            <CardTitle>Qualifications for {selectedStaffId}</CardTitle>
            <CardDescription>View and manage certifications, licenses, and training</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading qualifications...</div>
            ) : qualifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No qualifications found for this staff member
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issuing Organization</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualifications.map((qual) => {
                    const daysUntilExpiry = qual.expiryDate
                      ? Math.floor((new Date(qual.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <TableRow key={qual.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-500" />
                            {qual.qualificationName}
                          </div>
                        </TableCell>
                        <TableCell>{qual.qualificationType}</TableCell>
                        <TableCell>{qual.issuingOrganization || "N/A"}</TableCell>
                        <TableCell>{formatDate(qual.issuedDate)}</TableCell>
                        <TableCell>
                          <div>
                            {formatDate(qual.expiryDate)}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                              <div className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3" />
                                {daysUntilExpiry} days left
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(qual.status, qual.expiryDate)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(qual)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this qualification?")) {
                                  deleteMutation.mutate(qual.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog
        open={showAddDialog || !!editingQualification}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingQualification(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQualification ? "Edit Qualification" : "Add New Qualification"}
            </DialogTitle>
            <DialogDescription>
              {editingQualification ? "Update qualification details" : "Add a new qualification for this staff member"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Qualification Type</Label>
              <Select
                value={formData.qualificationType}
                onValueChange={(value) => setFormData({ ...formData, qualificationType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nursing">Nursing</SelectItem>
                  <SelectItem value="first_aid">First Aid</SelectItem>
                  <SelectItem value="manual_handling">Manual Handling</SelectItem>
                  <SelectItem value="medication_admin">Medication Administration</SelectItem>
                  <SelectItem value="behavioral_support">Behavioral Support</SelectItem>
                  <SelectItem value="complex_care">Complex Care</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Qualification Name</Label>
              <Input
                id="name"
                value={formData.qualificationName}
                onChange={(e) => setFormData({ ...formData, qualificationName: e.target.value })}
                placeholder="e.g., Registered Nurse"
              />
            </div>

            <div>
              <Label htmlFor="org">Issuing Organization</Label>
              <Input
                id="org"
                value={formData.issuingOrganization}
                onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })}
                placeholder="e.g., AHPRA"
              />
            </div>

            <div>
              <Label htmlFor="cert">Certification Number</Label>
              <Input
                id="cert"
                value={formData.certificationNumber}
                onChange={(e) => setFormData({ ...formData, certificationNumber: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label htmlFor="issued">Issued Date</Label>
              <Input
                id="issued"
                type="date"
                value={formData.issuedDate}
                onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingQualification(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.qualificationType ||
                !formData.qualificationName ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingQualification ? "Update" : "Add"} Qualification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
