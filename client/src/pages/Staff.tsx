import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Phone, User, Loader2, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EntityDetailDrawer } from "@/components/EntityDetailDrawer";
import { AddProviderDialog } from "@/components/AddProviderDialog";
import { EditProviderDialog } from "@/components/EditProviderDialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import type { Staff } from "@shared/schema";

export default function StaffPage() {
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, staffList]);

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
            Staff
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage team members and their assignments</p>
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
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No staff members added yet</p>
              <p className="text-sm">Click "Add Staff Member" to add team members</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((staff) => (
                  <TableRow 
                    key={staff.id} 
                    ref={staff.id === highlightId ? highlightRef : undefined}
                    className={`cursor-pointer hover-elevate ${highlightedId === staff.id ? "bg-primary/10 animate-pulse" : ""}`}
                    onClick={() => {
                      setSelectedStaff(staff);
                      setIsDrawerOpen(true);
                    }}
                    data-testid={`row-staff-${staff.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{staff.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {staff.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {staff.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.email || <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell>
                      {staff.role ? (
                        <Badge variant="secondary">
                          {staff.role === 'support_worker' ? 'Support Worker' :
                           staff.role === 'nurse' ? 'Nurse' :
                           staff.role === 'care_manager' ? 'Care Manager' :
                           staff.role === 'admin' ? 'Admin' : staff.role}
                        </Badge>
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
        providerType="staff"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {editingStaff && (
        <EditProviderDialog
          providerType="staff"
          provider={editingStaff}
          open={!!editingStaff}
          onOpenChange={(open) => !open && setEditingStaff(null)}
          showTrigger={false}
        />
      )}

      {deleteStaff && (
        <DeleteConfirmationDialog
          providerType="staff"
          provider={deleteStaff}
          open={!!deleteStaff}
          onOpenChange={(open) => !open && setDeleteStaff(null)}
          showTrigger={false}
        />
      )}

      <EntityDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        entityType="staff"
        entityId={selectedStaff?.id || null}
        entityData={selectedStaff}
      />
    </div>
  );
}
