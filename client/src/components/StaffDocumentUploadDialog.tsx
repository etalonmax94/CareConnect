import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, FileText, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StaffDocumentType } from "@shared/schema";

interface StaffDocumentUploadDialogProps {
  staffId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedType?: StaffDocumentType;
  onSuccess?: () => void;
}

const DOCUMENT_TYPE_OPTIONS: { value: StaffDocumentType; label: string; category: string }[] = [
  // Identification
  { value: "id_document_1", label: "ID Document 1", category: "Identification" },
  { value: "id_document_2", label: "ID Document 2", category: "Identification" },
  { value: "right_to_work", label: "Right to Work in Australia", category: "Identification" },

  // Compliance & Screening
  { value: "police_check", label: "Police Check", category: "Compliance & Screening" },
  { value: "yellow_card", label: "Yellow Card | NDIS Worker Screening", category: "Compliance & Screening" },
  { value: "blue_card", label: "Blue Card | Work With Children Check", category: "Compliance & Screening" },

  // Qualifications
  { value: "nursing_registration", label: "Nursing Registration", category: "Qualifications" },
  { value: "qualification_award", label: "Qualification Award", category: "Qualifications" },
  { value: "cpr", label: "CPR", category: "Qualifications" },
  { value: "first_aid", label: "First Aid", category: "Qualifications" },
  { value: "vaccination_record", label: "Vaccination Record", category: "Qualifications" },
  { value: "vehicle_insurance", label: "Vehicle Comprehensive Insurance", category: "Qualifications" },

  // NDIS Training
  { value: "ndis_orientation", label: "NDIS Worker Orientation Module", category: "NDIS Training" },
  { value: "ndis_communication", label: "NDIS Supporting Effective Communication", category: "NDIS Training" },
  { value: "ndis_safe_meals", label: "NDIS Supporting Safe and Enjoyable Meals", category: "NDIS Training" },

  // Health & Safety
  { value: "hand_hygiene", label: "Hand Hygiene Training Certificate", category: "Health & Safety" },
  { value: "infection_control", label: "Infection Control Certificate", category: "Health & Safety" },

  // Employment Documents
  { value: "employment_agreement", label: "Employment Agreement", category: "Employment" },
  { value: "resume_cv", label: "Resume and CV", category: "Employment" },
  { value: "position_description", label: "Position Description", category: "Employment" },
  { value: "commitment_declaration", label: "Staff Commitment Declaration Form", category: "Employment" },
  { value: "induction_checklist", label: "Staff Induction Checklist", category: "Employment" },
];

export function StaffDocumentUploadDialog({
  staffId,
  open,
  onOpenChange,
  preselectedType,
  onSuccess,
}: StaffDocumentUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [documentType, setDocumentType] = useState<StaffDocumentType | "">(preselectedType || "");
  const [documentName, setDocumentName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setDocumentType(preselectedType || "");
    setDocumentName("");
    setFileUrl("");
    setIssueDate("");
    setExpiryDate("");
    setDocumentNumber("");
    setIssuingAuthority("");
    setNotes("");
  };

  const uploadMutation = useMutation({
    mutationFn: (data: {
      documentType: StaffDocumentType;
      documentName: string;
      fileUrl: string;
      issueDate?: string;
      expiryDate?: string;
      documentNumber?: string;
      issuingAuthority?: string;
      notes?: string;
    }) => apiRequest("POST", `/api/staff/${staffId}/documents`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff", staffId, "full-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff", staffId, "documents"] });
      toast({ title: "Document uploaded successfully", description: "The document is pending admin review." });
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload document", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentType) {
      toast({ title: "Document type is required", variant: "destructive" });
      return;
    }

    if (!documentName.trim()) {
      toast({ title: "Document name is required", variant: "destructive" });
      return;
    }

    if (!fileUrl.trim()) {
      toast({ title: "File URL is required", variant: "destructive" });
      return;
    }

    uploadMutation.mutate({
      documentType,
      documentName: documentName.trim(),
      fileUrl: fileUrl.trim(),
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      documentNumber: documentNumber.trim() || undefined,
      issuingAuthority: issuingAuthority.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Group options by category
  const groupedOptions = DOCUMENT_TYPE_OPTIONS.reduce((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = [];
    acc[opt.category].push(opt);
    return acc;
  }, {} as Record<string, typeof DOCUMENT_TYPE_OPTIONS>);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Staff Document
          </DialogTitle>
          <DialogDescription>
            Upload a document for staff records. All documents require admin approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type *</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as StaffDocumentType)}
              disabled={!!preselectedType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedOptions).map(([category, options]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      {category}
                    </div>
                    {options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="documentName">Document Name *</Label>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., Police Check Certificate 2024"
                className="flex-1"
              />
            </div>
          </div>

          {/* File URL */}
          <div className="space-y-2">
            <Label htmlFor="fileUrl">File URL *</Label>
            <Input
              id="fileUrl"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/file/..."
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Enter a link to the document file (Google Drive, Dropbox, OneDrive, etc.)
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Document Number & Issuing Authority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g., CRN123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuingAuthority">Issuing Authority</Label>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="issuingAuthority"
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                  placeholder="e.g., AHPRA"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this document..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Document
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
