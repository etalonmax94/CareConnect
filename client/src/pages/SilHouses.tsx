import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Pencil, Trash2, Home, Building2, Users, MapPin, 
  AlertTriangle, CheckCircle, XCircle, Download, Loader2, 
  ChevronRight, Shield, Calendar, DollarSign, FileText,
  HelpCircle, Clock
} from "lucide-react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SilHouse, InsertSilHouse } from "@shared/schema";

interface SilHouseStats {
  totalHouses: number;
  activeHouses: number;
  totalResidents: number;
  totalCapacity: number;
  occupancyRate: number;
  availableBeds: number;
  propertyTypes: number;
  complianceRate: number;
}

const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
const PROPERTY_TYPES = ["Apartment", "House", "Unit", "Villa", "Other"];
const STATUS_OPTIONS = ["Active", "Inactive", "Under Maintenance"];
const RENT_FREQUENCIES = ["Weekly", "Fortnightly", "Monthly"];
const NDIS_CATEGORIES = ["Core Supports", "Capital Supports"];

const WIZARD_STEPS = [
  { id: 1, title: "Basic Info", icon: Home, description: "House name and address" },
  { id: 2, title: "Details", icon: Building2, description: "Property features and capacity" },
  { id: 3, title: "Financial", icon: DollarSign, description: "Lease and rent information" },
  { id: 4, title: "Compliance", icon: Shield, description: "Safety certificates and NDIS" },
  { id: 5, title: "Review", icon: FileText, description: "Confirm and submit" },
];

const emptyFormData: Partial<InsertSilHouse> = {
  houseName: "",
  streetAddress: "",
  suburb: "",
  postcode: "",
  state: "NSW",
  propertyType: "House",
  status: "Active",
  maxResidents: 1,
  currentResidents: 0,
  bedrooms: undefined,
  bathrooms: undefined,
  wheelchairAccessible: "no",
  houseManagerName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
  silProviderNumber: "",
  ndisFundingCategory: undefined,
  leaseStartDate: "",
  leaseEndDate: "",
  rentAmount: undefined,
  rentFrequency: "Weekly",
  safetyCertificateExpiry: "",
  fireSafetyCheckDate: "",
  buildingInspectionDate: "",
  privacyConsentObtained: "no",
};

function FieldTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ComplianceBadge({ date, label }: { date: string | null | undefined; label: string }) {
  if (!date) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="gap-1" data-testid={`badge-compliance-missing-${label}`}>
            <XCircle className="w-3 h-3" />
            Missing
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label} has not been recorded</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  const today = new Date();
  const expiryDate = new Date(date);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="gap-1" data-testid={`badge-compliance-expired-${label}`}>
            <XCircle className="w-3 h-3" />
            Expired
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label} expired {Math.abs(daysUntilExpiry)} days ago</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (daysUntilExpiry <= 30) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600" data-testid={`badge-compliance-warning-${label}`}>
            <AlertTriangle className="w-3 h-3" />
            {daysUntilExpiry}d
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label} expires in {daysUntilExpiry} days</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-600" data-testid={`badge-compliance-valid-${label}`}>
          <CheckCircle className="w-3 h-3" />
          Valid
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label} valid until {new Date(date).toLocaleDateString("en-AU")}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Active":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600" data-testid="badge-status-active">Active</Badge>;
    case "Inactive":
      return <Badge variant="secondary" data-testid="badge-status-inactive">Inactive</Badge>;
    case "Under Maintenance":
      return <Badge className="bg-amber-500 hover:bg-amber-600" data-testid="badge-status-maintenance">Maintenance</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

export default function SilHousesPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const highlightId = new URLSearchParams(searchString).get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLTableRowElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingHouse, setEditingHouse] = useState<SilHouse | null>(null);
  const [deleteHouse, setDeleteHouse] = useState<SilHouse | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [formData, setFormData] = useState<Partial<InsertSilHouse>>(emptyFormData);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPropertyType, setFilterPropertyType] = useState("All");

  const { data: houses = [], isLoading } = useQuery<SilHouse[]>({
    queryKey: ["/api/sil-houses", searchTerm, filterStatus, filterPropertyType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterStatus !== "All") params.append("status", filterStatus);
      if (filterPropertyType !== "All") params.append("propertyType", filterPropertyType);
      const url = `/api/sil-houses${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch houses");
      return res.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<SilHouseStats>({
    queryKey: ["/api/sil-houses/stats"],
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, houses]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertSilHouse>) => apiRequest("POST", "/api/sil-houses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sil-houses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sil-houses/stats"] });
      resetDialog();
      toast({ title: "SIL House created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create SIL House", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<InsertSilHouse>) => 
      apiRequest("PATCH", `/api/sil-houses/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sil-houses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sil-houses/stats"] });
      resetDialog();
      toast({ title: "SIL House updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update SIL House", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiRequest("DELETE", `/api/sil-houses/${id}`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sil-houses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sil-houses/stats"] });
      setDeleteHouse(null);
      setDeleteReason("");
      toast({ title: "SIL House deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete SIL House", description: error.message, variant: "destructive" });
    },
  });

  const resetDialog = () => {
    setIsDialogOpen(false);
    setWizardStep(1);
    setEditingHouse(null);
    setFormData(emptyFormData);
  };

  const openEditDialog = (house: SilHouse) => {
    setEditingHouse(house);
    setFormData({
      houseName: house.houseName,
      streetAddress: house.streetAddress,
      suburb: house.suburb,
      postcode: house.postcode,
      state: house.state as "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT",
      propertyType: house.propertyType,
      status: house.status,
      maxResidents: house.maxResidents,
      currentResidents: house.currentResidents,
      bedrooms: house.bedrooms ?? undefined,
      bathrooms: house.bathrooms ?? undefined,
      wheelchairAccessible: house.wheelchairAccessible ?? "no",
      houseManagerName: house.houseManagerName || "",
      contactName: house.contactName || "",
      contactPhone: house.contactPhone || "",
      contactEmail: house.contactEmail || "",
      notes: house.notes || "",
      silProviderNumber: house.silProviderNumber || "",
      ndisFundingCategory: house.ndisFundingCategory ?? undefined,
      leaseStartDate: house.leaseStartDate || "",
      leaseEndDate: house.leaseEndDate || "",
      rentAmount: house.rentAmount ?? undefined,
      rentFrequency: house.rentFrequency ?? "Weekly",
      safetyCertificateExpiry: house.safetyCertificateExpiry || "",
      fireSafetyCheckDate: house.fireSafetyCheckDate || "",
      buildingInspectionDate: house.buildingInspectionDate || "",
      privacyConsentObtained: house.privacyConsentObtained ?? "no",
    });
    setWizardStep(1);
    setIsDialogOpen(true);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.houseName?.trim()) {
          toast({ title: "House name is required", variant: "destructive" });
          return false;
        }
        if (!formData.streetAddress?.trim()) {
          toast({ title: "Street address is required", variant: "destructive" });
          return false;
        }
        if (!formData.suburb?.trim()) {
          toast({ title: "Suburb is required", variant: "destructive" });
          return false;
        }
        if (!formData.postcode || !/^\d{4}$/.test(formData.postcode)) {
          toast({ title: "Valid 4-digit postcode is required", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.maxResidents || formData.maxResidents < 1) {
          toast({ title: "Maximum residents must be at least 1", variant: "destructive" });
          return false;
        }
        if ((formData.currentResidents || 0) > formData.maxResidents) {
          toast({ title: "Current residents cannot exceed maximum", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
          toast({ title: "Please enter a valid email address", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(wizardStep)) {
      setWizardStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setWizardStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep(wizardStep)) return;
    
    const submitData = {
      ...formData,
      bedrooms: formData.bedrooms || null,
      bathrooms: formData.bathrooms || null,
      rentAmount: formData.rentAmount || null,
      leaseStartDate: formData.leaseStartDate || null,
      leaseEndDate: formData.leaseEndDate || null,
      safetyCertificateExpiry: formData.safetyCertificateExpiry || null,
      fireSafetyCheckDate: formData.fireSafetyCheckDate || null,
      buildingInspectionDate: formData.buildingInspectionDate || null,
      ndisFundingCategory: formData.ndisFundingCategory || null,
    };

    if (editingHouse) {
      updateMutation.mutate({ id: editingHouse.id, ...submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/sil-houses/export/data", { credentials: "include" });
      const data = await res.json();
      
      const headers = [
        "House Name", "Address", "Suburb", "Postcode", "State", "Property Type", "Status",
        "Max Residents", "Current Residents", "Bedrooms", "Bathrooms", "Wheelchair Accessible",
        "Manager Name", "Contact Name", "Contact Phone", "Contact Email",
        "SIL Provider Number", "NDIS Category", "Lease Start", "Lease End", 
        "Rent Amount", "Rent Frequency", "Safety Certificate Expiry",
        "Fire Safety Check", "Building Inspection", "Privacy Consent"
      ];
      
      const rows = data.map((h: SilHouse) => [
        h.houseName, h.streetAddress, h.suburb, h.postcode, h.state, h.propertyType, h.status,
        h.maxResidents, h.currentResidents, h.bedrooms || "", h.bathrooms || "", h.wheelchairAccessible,
        h.houseManagerName || "", h.contactName || "", h.contactPhone || "", h.contactEmail || "",
        h.silProviderNumber || "", h.ndisFundingCategory || "", h.leaseStartDate || "", h.leaseEndDate || "",
        h.rentAmount || "", h.rentFrequency || "", h.safetyCertificateExpiry || "",
        h.fireSafetyCheckDate || "", h.buildingInspectionDate || "", h.privacyConsentObtained
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sil-houses-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Export successful", description: `${data.length} houses exported to CSV` });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const renderStepContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="houseName">House Name *</Label>
                <FieldTooltip content="A unique, identifiable name for this property (e.g., 'Sunrise House', 'Unit 4 Main St')" />
              </div>
              <Input
                id="houseName"
                value={formData.houseName}
                onChange={(e) => setFormData({ ...formData, houseName: e.target.value })}
                placeholder="e.g., Sunrise House"
                data-testid="input-house-name"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <FieldTooltip content="Full street address including unit/lot number if applicable" />
              </div>
              <Input
                id="streetAddress"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="e.g., 123 Main Street"
                data-testid="input-street-address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb *</Label>
                <Input
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  placeholder="e.g., Sydney"
                  data-testid="input-suburb"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  placeholder="e.g., 2000"
                  maxLength={4}
                  data-testid="input-postcode"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.state || "NSW"}
                  onValueChange={(value) => setFormData({ ...formData, state: value as "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT" })}
                >
                  <SelectTrigger data-testid="select-state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type *</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData({ ...formData, propertyType: value as any })}
                >
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="maxResidents">Maximum Residents *</Label>
                  <FieldTooltip content="The maximum number of NDIS participants this property can accommodate" />
                </div>
                <Input
                  id="maxResidents"
                  type="number"
                  min={1}
                  value={formData.maxResidents || ""}
                  onChange={(e) => setFormData({ ...formData, maxResidents: parseInt(e.target.value) || 1 })}
                  data-testid="input-max-residents"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="currentResidents">Current Residents</Label>
                  <FieldTooltip content="Current number of participants living in this property" />
                </div>
                <Input
                  id="currentResidents"
                  type="number"
                  min={0}
                  value={formData.currentResidents || ""}
                  onChange={(e) => setFormData({ ...formData, currentResidents: parseInt(e.target.value) || 0 })}
                  data-testid="input-current-residents"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min={0}
                  value={formData.bedrooms || ""}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || undefined })}
                  data-testid="input-bedrooms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min={0}
                  value={formData.bathrooms || ""}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || undefined })}
                  data-testid="input-bathrooms"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Wheelchair Accessible</Label>
                <FieldTooltip content="Does this property have wheelchair access, including ramps and accessible bathrooms?" />
              </div>
              <Select
                value={formData.wheelchairAccessible || "no"}
                onValueChange={(value) => setFormData({ ...formData, wheelchairAccessible: value as "yes" | "no" })}
              >
                <SelectTrigger data-testid="select-wheelchair">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="houseManagerName">House Manager</Label>
              <Input
                id="houseManagerName"
                value={formData.houseManagerName || ""}
                onChange={(e) => setFormData({ ...formData, houseManagerName: e.target.value })}
                placeholder="Staff member responsible for this property"
                data-testid="input-house-manager"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this property..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={formData.contactName || ""}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Property manager or landlord name"
                data-testid="input-contact-name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone || ""}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="e.g., 0412 345 678"
                  data-testid="input-contact-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail || ""}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="e.g., manager@example.com"
                  data-testid="input-contact-email"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">Lease Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaseStartDate">Lease Start Date</Label>
                  <Input
                    id="leaseStartDate"
                    type="date"
                    value={formData.leaseStartDate || ""}
                    onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                    data-testid="input-lease-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseEndDate">Lease End Date</Label>
                  <Input
                    id="leaseEndDate"
                    type="date"
                    value={formData.leaseEndDate || ""}
                    onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                    data-testid="input-lease-end"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="rentAmount">Rent Amount ($)</Label>
                    <FieldTooltip content="Rent amount in Australian dollars" />
                  </div>
                  <Input
                    id="rentAmount"
                    type="number"
                    min={0}
                    value={formData.rentAmount || ""}
                    onChange={(e) => setFormData({ ...formData, rentAmount: parseInt(e.target.value) || undefined })}
                    placeholder="e.g., 400"
                    data-testid="input-rent-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentFrequency">Rent Frequency</Label>
                  <Select
                    value={formData.rentFrequency || "Weekly"}
                    onValueChange={(value) => setFormData({ ...formData, rentFrequency: value as any })}
                  >
                    <SelectTrigger data-testid="select-rent-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RENT_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">NDIS Compliance Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    These fields are essential for NDIS audits and reporting. Ensure all certificates are current.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="silProviderNumber">SIL Provider Number</Label>
                  <FieldTooltip content="Your registered SIL provider number from the NDIS Quality and Safeguards Commission" />
                </div>
                <Input
                  id="silProviderNumber"
                  value={formData.silProviderNumber || ""}
                  onChange={(e) => setFormData({ ...formData, silProviderNumber: e.target.value })}
                  placeholder="e.g., 4-XXXX-XXXX"
                  data-testid="input-sil-provider"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="ndisFundingCategory">NDIS Funding Category</Label>
                  <FieldTooltip content="The NDIS support category this property's services fall under" />
                </div>
                <Select
                  value={formData.ndisFundingCategory || ""}
                  onValueChange={(value) => setFormData({ ...formData, ndisFundingCategory: value as any })}
                >
                  <SelectTrigger data-testid="select-ndis-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {NDIS_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Safety & Inspection Dates
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="safetyCertificateExpiry">Safety Certificate Expiry *</Label>
                    <FieldTooltip content="Annual safety certificate expiry date - required for NDIS compliance" />
                  </div>
                  <Input
                    id="safetyCertificateExpiry"
                    type="date"
                    value={formData.safetyCertificateExpiry || ""}
                    onChange={(e) => setFormData({ ...formData, safetyCertificateExpiry: e.target.value })}
                    data-testid="input-safety-expiry"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="fireSafetyCheckDate">Last Fire Safety Check</Label>
                    <FieldTooltip content="Date of last fire safety equipment check (smoke detectors, extinguishers, evacuation plans)" />
                  </div>
                  <Input
                    id="fireSafetyCheckDate"
                    type="date"
                    value={formData.fireSafetyCheckDate || ""}
                    onChange={(e) => setFormData({ ...formData, fireSafetyCheckDate: e.target.value })}
                    data-testid="input-fire-check"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="buildingInspectionDate">Last Building Inspection</Label>
                    <FieldTooltip content="Date of last comprehensive building inspection" />
                  </div>
                  <Input
                    id="buildingInspectionDate"
                    type="date"
                    value={formData.buildingInspectionDate || ""}
                    onChange={(e) => setFormData({ ...formData, buildingInspectionDate: e.target.value })}
                    data-testid="input-building-inspection"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>Privacy Consent Obtained</Label>
                  <FieldTooltip content="Have all residents provided privacy consent as required by Australian Privacy Principles?" />
                </div>
                <Select
                  value={formData.privacyConsentObtained || "no"}
                  onValueChange={(value) => setFormData({ ...formData, privacyConsentObtained: value as "yes" | "no" })}
                >
                  <SelectTrigger data-testid="select-privacy-consent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes - All consents obtained</SelectItem>
                    <SelectItem value="no">No - Consent pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Review Your Information</h4>
              <p className="text-sm text-muted-foreground">
                Please review all details before {editingHouse ? "updating" : "creating"} this SIL House.
              </p>
            </div>
            
            <div className="grid gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">House Name:</dt>
                    <dd className="font-medium">{formData.houseName}</dd>
                    <dt className="text-muted-foreground">Address:</dt>
                    <dd>{formData.streetAddress}, {formData.suburb} {formData.state} {formData.postcode}</dd>
                    <dt className="text-muted-foreground">Property Type:</dt>
                    <dd>{formData.propertyType}</dd>
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd><StatusBadge status={formData.status || "Active"} /></dd>
                  </dl>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Capacity:</dt>
                    <dd>{formData.currentResidents || 0} / {formData.maxResidents} residents</dd>
                    <dt className="text-muted-foreground">Bedrooms/Bathrooms:</dt>
                    <dd>{formData.bedrooms || "-"} bed / {formData.bathrooms || "-"} bath</dd>
                    <dt className="text-muted-foreground">Wheelchair Access:</dt>
                    <dd>{formData.wheelchairAccessible === "yes" ? "Yes" : "No"}</dd>
                  </dl>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">SIL Provider #:</dt>
                    <dd>{formData.silProviderNumber || "-"}</dd>
                    <dt className="text-muted-foreground">Safety Certificate:</dt>
                    <dd>
                      <ComplianceBadge 
                        date={formData.safetyCertificateExpiry} 
                        label="Safety Certificate" 
                      />
                    </dd>
                    <dt className="text-muted-foreground">Privacy Consent:</dt>
                    <dd>{formData.privacyConsentObtained === "yes" ? "Obtained" : "Pending"}</dd>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  if (isLoading || statsLoading) {
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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">SIL Houses</h1>
          <p className="text-muted-foreground">
            Manage Supported Independent Living properties for NDIS participants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setFormData(emptyFormData);
              setEditingHouse(null);
              setWizardStep(1);
              setIsDialogOpen(true);
            }}
            data-testid="button-add-house"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add House
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Houses</CardTitle>
            <Home className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHouses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeHouses || 0} active
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-stat-occupancy">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalResidents || 0} / {stats?.totalCapacity || 0}</div>
            <Progress value={stats?.occupancyRate || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.occupancyRate?.toFixed(1) || 0}% occupied • {stats?.availableBeds || 0} available
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-stat-types">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Property Types</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.propertyTypes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Different property categories
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-stat-compliance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.complianceRate?.toFixed(0) || 0}%</div>
            <Progress 
              value={stats?.complianceRate || 0} 
              className={`mt-2 ${(stats?.complianceRate || 0) < 80 ? "[&>div]:bg-amber-500" : ""}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Properties with valid certificates
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search houses by name, address, or suburb..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
                <SelectTrigger className="w-[140px]" data-testid="filter-property-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {houses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No SIL Houses found</p>
              <p className="text-sm">
                {searchTerm || filterStatus !== "All" || filterPropertyType !== "All"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first property"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>House</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houses.map((house) => (
                    <TableRow
                      key={house.id}
                      ref={house.id === highlightedId ? highlightRef : undefined}
                      className={house.id === highlightedId ? "bg-primary/5 animate-pulse" : ""}
                      data-testid={`row-house-${house.id}`}
                    >
                      <TableCell>
                        <div className="font-medium">{house.houseName}</div>
                        {house.silProviderNumber && (
                          <div className="text-xs text-muted-foreground">
                            SIL: {house.silProviderNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                          <div>
                            <div className="text-sm">{house.suburb}, {house.state}</div>
                            <div className="text-xs text-muted-foreground">{house.postcode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{house.propertyType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{house.currentResidents} / {house.maxResidents}</span>
                        </div>
                        {house.wheelchairAccessible === "yes" && (
                          <div className="text-xs text-muted-foreground mt-1">♿ Accessible</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={house.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ComplianceBadge date={house.safetyCertificateExpiry} label="Safety" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(house)}
                            data-testid={`button-edit-${house.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteHouse(house)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${house.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingHouse ? "Edit SIL House" : "Add New SIL House"}
            </DialogTitle>
            <DialogDescription>
              Step {wizardStep} of 5: {WIZARD_STEPS[wizardStep - 1].description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between mb-6 px-2">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = wizardStep === step.id;
              const isCompleted = wizardStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                      ${isActive ? "border-primary bg-primary text-primary-foreground" : ""}
                      ${isCompleted ? "border-primary bg-primary/10 text-primary" : ""}
                      ${!isActive && !isCompleted ? "border-muted-foreground/30 text-muted-foreground" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {renderStepContent()}
          
          <DialogFooter className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={wizardStep === 1}
              data-testid="button-wizard-back"
            >
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={resetDialog}
                data-testid="button-wizard-cancel"
              >
                Cancel
              </Button>
              {wizardStep < 5 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  data-testid="button-wizard-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-wizard-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingHouse ? "Update House" : "Create House"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteHouse} onOpenChange={(open) => !open && setDeleteHouse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SIL House</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteHouse?.houseName}"? This action cannot be undone.
              For NDIS compliance, please provide a reason for deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deleteReason">Reason for Deletion *</Label>
            <Textarea
              id="deleteReason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g., Property lease ended, Merged with another location..."
              className="mt-2"
              rows={3}
              data-testid="input-delete-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteHouse && deleteReason.trim()) {
                  deleteMutation.mutate({ id: deleteHouse.id, reason: deleteReason });
                } else {
                  toast({ 
                    title: "Reason required", 
                    description: "Please provide a reason for deletion",
                    variant: "destructive" 
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!deleteReason.trim() || deleteMutation.isPending}
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete House
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
