import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone, Mail, User, Loader2, ChevronDown, ChevronRight, Pencil, Trash2, Award, AlertCircle, Edit, X, ExternalLink } from "lucide-react";
import { useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddProviderDialog } from "@/components/AddProviderDialog";
import { EditProviderDialog } from "@/components/EditProviderDialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import type { Staff } from "@shared/schema";

interface StaffQualification {
  id: string;
  staffId: string;
  qualificationType: string;
  qualificationName: string;
  issuingOrganisation?: string;
  certificationNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: "current" | "expired" | "pending_renewal" | "suspended";
  createdAt: string;
}

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Qualification management state
  const [showQualDialog, setShowQualDialog] = useState(false);
  const [selectedStaffForQual, setSelectedStaffForQual] = useState<Staff | null>(null);
  const [editingQualification, setEditingQualification] = useState<StaffQualification | null>(null);
  const [qualForm, setQualForm] = useState({
    qualificationType: "",
    qualificationName: "",
    issuingOrganisation: "",
    certificationNumber: "",
    issuedDate: "",
    expiryDate: "",
    status: "current" as const,
  });

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch qualifications for expanded staff
  const { data: qualifications = [] } = useQuery<StaffQualification[]>({
    queryKey: [`/api/staff/${expandedStaffId}/qualifications`],
    enabled: !!expandedStaffId,
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, staffList]);

  // Create qualification mutation
  const createQualMutation = useMutation({
    mutationFn: async (data: typeof qualForm) => {
      if (!selectedStaffForQual) throw new Error("No staff selected");
      const res = await fetch(`/api/staff/${selectedStaffForQual.id}/qualifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${selectedStaffForQual?.id}/qualifications`] });
      toast({
        title: "Qualification Added",
        description: "Staff qualification has been added successfully.",
      });
      setShowQualDialog(false);
      resetQualForm();
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
  const updateQualMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof qualForm> }) => {
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
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${selectedStaffForQual?.id}/qualifications`] });
      toast({
        title: "Qualification Updated",
        description: "Staff qualification has been updated successfully.",
      });
      setEditingQualification(null);
      resetQualForm();
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
  const deleteQualMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/qualifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${selectedStaffForQual?.id}/qualifications`] });
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

  const resetQualForm = () => {
    setQualForm({
      qualificationType: "",
      qualificationName: "",
      issuingOrganisation: "",
      certificationNumber: "",
      issuedDate: "",
      expiryDate: "",
      status: "current",
    });
  };

  const handleAddQualification = (staff: Staff) => {
    setSelectedStaffForQual(staff);
    setEditingQualification(null);
    resetQualForm();
    setShowQualDialog(true);
  };

  const handleEditQualification = (qual: StaffQualification, staff: Staff) => {
    setSelectedStaffForQual(staff);
    setEditingQualification(qual);
    setQualForm({
      qualificationType: qual.qualificationType,
      qualificationName: qual.qualificationName,
      issuingOrganisation: qual.issuingOrganisation || "",
      certificationNumber: qual.certificationNumber || "",
      issuedDate: qual.issuedDate || "",
      expiryDate: qual.expiryDate || "",
      status: qual.status,
    });
    setShowQualDialog(true);
  };

  const handleSaveQualification = () => {
    if (editingQualification) {
      updateQualMutation.mutate({ id: editingQualification.id, data: qualForm });
    } else {
      createQualMutation.mutate(qualForm);
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getQualificationCounts = (staffId: string) => {
    // This would need to fetch qualifications for each staff member
    // For now, return 0
    return 0;
  };

  const getExpiringQualifications = (staffId: string) => {
    // This would need to fetch and check qualifications
    return 0;
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
            Staff Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage team members, qualifications, and credentials</p>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto"
          data-testid="button-add-staff"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Staff List ({staffList.length})
          </CardTitle>
          <CardDescription>
            Click on a staff member to view and manage their qualifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No staff members added yet</p>
              <p className="text-sm">Click "Add Staff Member" to add team members</p>
            </div>
          ) : (
            <div className="space-y-2">
              {staffList.map((staff) => {
                const isExpanded = expandedStaffId === staff.id;
                const staffQualifications = isExpanded ? qualifications : [];
                const expiringQuals = staffQualifications.filter(q => {
                  if (!q.expiryDate) return false;
                  const daysUntilExpiry = Math.floor((new Date(q.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
                });
                const expiredQuals = staffQualifications.filter(q => {
                  if (!q.expiryDate) return false;
                  const daysUntilExpiry = Math.floor((new Date(q.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return daysUntilExpiry < 0;
                });

                return (
                  <div key={staff.id} className="border rounded-lg">
                    {/* Staff row */}
                    <div
                      ref={staff.id === highlightId ? highlightRef : undefined}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        highlightedId === staff.id ? "bg-primary/10 animate-pulse" : ""
                      }`}
                      onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Avatar and name */}
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={staff.profileImageUrl || undefined} />
                            <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                              {getInitials(staff.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/staff/${staff.id}`} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-semibold truncate hover:text-primary hover:underline cursor-pointer">{staff.name}</h3>
                              </Link>
                              {staff.role && (
                                <Badge variant="secondary" className="text-xs">
                                  {staff.role === 'support_worker' ? 'Support Worker' :
                                   staff.role === 'nurse' ? 'Nurse' :
                                   staff.role === 'care_manager' ? 'Care Manager' :
                                   staff.role === 'admin' ? 'Admin' : staff.role}
                                </Badge>
                              )}
                              {staff.isActive === "yes" ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">Inactive</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              {staff.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5" />
                                  <span className="truncate">{staff.email}</span>
                                </div>
                              )}
                              {staff.phoneNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{staff.phoneNumber}</span>
                                </div>
                              )}
                            </div>

                            {/* Qualification summary */}
                            {isExpanded && staffQualifications.length > 0 && (
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Award className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="text-muted-foreground">{staffQualifications.length} qualifications</span>
                                </div>
                                {expiredQuals.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{expiredQuals.length} expired</span>
                                  </div>
                                )}
                                {expiringQuals.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{expiringQuals.length} expiring soon</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link href={`/staff/${staff.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View Profile</span>
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStaff(staff);
                            }}
                            data-testid={`button-edit-staff-${staff.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteStaff(staff);
                            }}
                            data-testid={`button-delete-staff-${staff.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded qualifications section */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            Qualifications & Certifications
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddQualification(staff);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add Qualification
                          </Button>
                        </div>

                        {staffQualifications.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground bg-background rounded-lg border-2 border-dashed">
                            <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No qualifications recorded</p>
                            <p className="text-xs mt-1">Click "Add Qualification" to add certifications and training</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {staffQualifications.map((qual) => {
                              const daysUntilExpiry = qual.expiryDate
                                ? Math.floor((new Date(qual.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                : null;

                              return (
                                <div key={qual.id} className="bg-background rounded-lg border p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <h5 className="font-medium">{qual.qualificationName}</h5>
                                        {getStatusBadge(qual.status, qual.expiryDate)}
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                        <div>
                                          <span className="font-medium">Type:</span> {qual.qualificationType}
                                        </div>
                                        {qual.issuingOrganisation && (
                                          <div>
                                            <span className="font-medium">Issuing Organisation:</span> {qual.issuingOrganisation}
                                          </div>
                                        )}
                                        {qual.certificationNumber && (
                                          <div>
                                            <span className="font-medium">Cert. Number:</span> {qual.certificationNumber}
                                          </div>
                                        )}
                                        {qual.issuedDate && (
                                          <div>
                                            <span className="font-medium">Issued:</span> {formatDate(qual.issuedDate)}
                                          </div>
                                        )}
                                        {qual.expiryDate && (
                                          <div className="col-span-full">
                                            <span className="font-medium">Expiry:</span> {formatDate(qual.expiryDate)}
                                            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                                              <span className="ml-2 text-yellow-600 font-medium">
                                                ({daysUntilExpiry} days remaining)
                                              </span>
                                            )}
                                            {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                                              <span className="ml-2 text-red-600 font-medium">
                                                (Expired {Math.abs(daysUntilExpiry)} days ago)
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEditQualification(qual, staff)}
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this qualification?")) {
                                            deleteQualMutation.mutate(qual.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <AddProviderDialog
        providerType="staff"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {/* Edit Staff Dialog */}
      {editingStaff && (
        <EditProviderDialog
          providerType="staff"
          provider={editingStaff}
          open={!!editingStaff}
          onOpenChange={(open) => !open && setEditingStaff(null)}
        />
      )}

      {/* Delete Staff Dialog */}
      {deleteStaff && (
        <DeleteConfirmationDialog
          open={!!deleteStaff}
          onOpenChange={(open) => !open && setDeleteStaff(null)}
          onConfirm={async () => {
            await fetch(`/api/staff/${deleteStaff.id}`, {
              method: "DELETE",
              credentials: "include",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
            setDeleteStaff(null);
            toast({
              title: "Staff Deleted",
              description: "Staff member has been deleted.",
            });
          }}
          title="Delete Staff Member"
          description={`Are you sure you want to delete ${deleteStaff.name}? This action cannot be undone.`}
        />
      )}

      {/* Qualification Dialog */}
      <Dialog
        open={showQualDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowQualDialog(false);
            setEditingQualification(null);
            resetQualForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQualification ? "Edit Qualification" : "Add New Qualification"}
            </DialogTitle>
            <DialogDescription>
              {editingQualification
                ? `Update qualification details for ${selectedStaffForQual?.name}`
                : `Add a new qualification for ${selectedStaffForQual?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Qualification Type</Label>
              <Select
                value={qualForm.qualificationType}
                onValueChange={(value) => setQualForm({ ...qualForm, qualificationType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nursing">Nursing</SelectItem>
                  <SelectItem value="first_aid">First Aid</SelectItem>
                  <SelectItem value="manual_handling">Manual Handling</SelectItem>
                  <SelectItem value="medication_admin">Medication Administration</SelectItem>
                  <SelectItem value="behavioral_support">Behavioural Support</SelectItem>
                  <SelectItem value="complex_care">Complex Care</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="license">Licence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Qualification Name</Label>
              <Input
                id="name"
                value={qualForm.qualificationName}
                onChange={(e) => setQualForm({ ...qualForm, qualificationName: e.target.value })}
                placeholder="e.g., Registered Nurse"
              />
            </div>

            <div>
              <Label htmlFor="org">Issuing Organisation</Label>
              <Input
                id="org"
                value={qualForm.issuingOrganisation}
                onChange={(e) => setQualForm({ ...qualForm, issuingOrganisation: e.target.value })}
                placeholder="e.g., AHPRA"
              />
            </div>

            <div>
              <Label htmlFor="cert">Certification Number</Label>
              <Input
                id="cert"
                value={qualForm.certificationNumber}
                onChange={(e) => setQualForm({ ...qualForm, certificationNumber: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label htmlFor="issued">Issued Date</Label>
              <Input
                id="issued"
                type="date"
                value={qualForm.issuedDate}
                onChange={(e) => setQualForm({ ...qualForm, issuedDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={qualForm.expiryDate}
                onChange={(e) => setQualForm({ ...qualForm, expiryDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={qualForm.status}
                onValueChange={(value: any) => setQualForm({ ...qualForm, status: value })}
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
                setShowQualDialog(false);
                setEditingQualification(null);
                resetQualForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQualification}
              disabled={
                !qualForm.qualificationType ||
                !qualForm.qualificationName ||
                createQualMutation.isPending ||
                updateQualMutation.isPending
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
