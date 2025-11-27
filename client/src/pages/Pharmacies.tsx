import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Loader2, MapPin, FileText, Truck, Building2, ChevronRight } from "lucide-react";
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
import type { Pharmacy } from "@shared/schema";

export default function PharmaciesPage() {
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [deletePharmacy, setDeletePharmacy] = useState<Pharmacy | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
            Pharmacies
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage pharmacy database for client medication needs</p>
        </div>
        <Button size="sm" className="w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-pharmacy">
          <Plus className="w-4 h-4 mr-2" />
          Add Pharmacy
        </Button>
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
                    className={`cursor-pointer hover-elevate ${highlightedId === pharmacy.id ? "bg-primary/10 animate-pulse" : ""}`}
                    onClick={() => {
                      setSelectedPharmacy(pharmacy);
                      setIsDrawerOpen(true);
                    }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPharmacy(pharmacy);
                          }}
                          data-testid={`button-edit-pharmacy-${pharmacy.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePharmacy(pharmacy);
                          }}
                          data-testid={`button-delete-pharmacy-${pharmacy.id}`}
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
        providerType="pharmacy"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        showTrigger={false}
      />

      {editingPharmacy && (
        <EditProviderDialog
          providerType="pharmacy"
          provider={editingPharmacy}
          open={!!editingPharmacy}
          onOpenChange={(open) => !open && setEditingPharmacy(null)}
          showTrigger={false}
        />
      )}

      {deletePharmacy && (
        <DeleteConfirmationDialog
          providerType="pharmacy"
          provider={deletePharmacy}
          open={!!deletePharmacy}
          onOpenChange={(open) => !open && setDeletePharmacy(null)}
          showTrigger={false}
        />
      )}

      <EntityDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        entityType="pharmacy"
        entityId={selectedPharmacy?.id || null}
        entityData={selectedPharmacy}
      />
    </div>
  );
}
