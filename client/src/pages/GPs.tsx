import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Building2, Loader2, Stethoscope, MapPin, FileText, ChevronRight } from "lucide-react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { GP } from "@shared/schema";

export default function GPsPage() {
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGP, setEditingGP] = useState<GP | null>(null);
  const [deleteGP, setDeleteGP] = useState<GP | null>(null);
  const [selectedGP, setSelectedGP] = useState<GP | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">
            General Practitioners
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage GP database for client referrals</p>
        </div>
        <Button size="sm" className="w-full sm:w-auto" data-testid="button-add-gp" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add GP
        </Button>
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
                    className={`cursor-pointer hover-elevate ${highlightedId === gp.id ? "bg-primary/10 animate-pulse" : ""}`}
                    onClick={() => {
                      setSelectedGP(gp);
                      setIsDrawerOpen(true);
                    }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGP(gp);
                          }}
                          data-testid={`button-edit-gp-${gp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteGP(gp);
                          }}
                          data-testid={`button-delete-gp-${gp.id}`}
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
        providerType="gp"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {editingGP && (
        <EditProviderDialog
          providerType="gp"
          provider={editingGP}
          open={!!editingGP}
          onOpenChange={(open) => !open && setEditingGP(null)}
          showTrigger={false}
        />
      )}

      {deleteGP && (
        <DeleteConfirmationDialog
          providerType="gp"
          provider={deleteGP}
          open={!!deleteGP}
          onOpenChange={(open) => !open && setDeleteGP(null)}
          showTrigger={false}
        />
      )}

      <EntityDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        entityType="gp"
        entityId={selectedGP?.id || null}
        entityData={selectedGP}
      />
    </div>
  );
}
