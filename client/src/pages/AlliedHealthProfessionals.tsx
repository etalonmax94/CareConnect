import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, MapPin, Building2, Stethoscope, ChevronRight } from "lucide-react";
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
import type { AlliedHealthProfessional } from "@shared/schema";

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
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAhp, setEditingAhp] = useState<AlliedHealthProfessional | null>(null);
  const [deleteAhp, setDeleteAhp] = useState<AlliedHealthProfessional | null>(null);
  const [selectedAhp, setSelectedAhp] = useState<AlliedHealthProfessional | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
            Allied Health Professionals
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage allied health professionals for client care teams</p>
        </div>
        <Button size="sm" className="w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-ahp">
          <Plus className="w-4 h-4 mr-2" />
          Add Professional
        </Button>
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
                    className={`cursor-pointer hover-elevate ${highlightedId === ahp.id ? "bg-primary/10 animate-pulse" : ""}`}
                    onClick={() => {
                      setSelectedAhp(ahp);
                      setIsDrawerOpen(true);
                    }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAhp(ahp);
                          }}
                          data-testid={`button-edit-ahp-${ahp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteAhp(ahp);
                          }}
                          data-testid={`button-delete-ahp-${ahp.id}`}
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
        providerType="alliedHealth"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {editingAhp && (
        <EditProviderDialog
          providerType="alliedHealth"
          provider={editingAhp}
          open={!!editingAhp}
          onOpenChange={(open) => !open && setEditingAhp(null)}
          showTrigger={false}
        />
      )}

      {deleteAhp && (
        <DeleteConfirmationDialog
          providerType="alliedHealth"
          provider={deleteAhp}
          open={!!deleteAhp}
          onOpenChange={(open) => !open && setDeleteAhp(null)}
          showTrigger={false}
        />
      )}

      <EntityDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        entityType="alliedHealth"
        entityId={selectedAhp?.id || null}
        entityData={selectedAhp}
      />
    </div>
  );
}
