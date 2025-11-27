import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { 
  Upload, Eye, FileText, Trash2, Loader2, File, Link, Calendar, Pencil, 
  FolderOpen, Folder, ChevronDown, ChevronRight, Plus, FolderArchive, 
  ClipboardList, FileWarning, ScrollText, AlertTriangle, FileCheck, 
  MoreVertical, Archive, RotateCcw, X, Check, Settings2, EyeOff
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Document, ClientDocumentCompliance, ClientDocumentFolder } from "@shared/schema";

type ClinicalDocuments = {
  serviceAgreementDate?: string;
  consentFormDate?: string;
  riskAssessmentDate?: string;
  selfAssessmentMedxDate?: string;
  medicationConsentDate?: string;
  personalEmergencyPlanDate?: string;
  carePlanDate?: string;
  healthSummaryDate?: string;
  woundCarePlanDate?: string;
};

interface TrackedDocument {
  name: string;
  frequency: "annual" | "6-monthly" | "as-needed";
  key: keyof ClinicalDocuments;
}

interface DocumentFolder {
  id: string;
  name: string;
  icon: typeof Folder;
  color: string;
  description?: string;
  trackedDocuments?: TrackedDocument[];
  subFolders?: {
    id: string;
    name: string;
    trackedDocuments?: TrackedDocument[];
  }[];
  allowMultiple?: boolean;
}

const defaultDocumentFolders: DocumentFolder[] = [
  {
    id: "service-agreement",
    name: "Service Agreement",
    icon: FileCheck,
    color: "text-blue-600",
    trackedDocuments: [
      { name: "Service Agreement", key: "serviceAgreementDate", frequency: "annual" }
    ]
  },
  {
    id: "assessment-support-plan",
    name: "Participant Assessment and Support Plan",
    icon: ClipboardList,
    color: "text-purple-600",
    description: "Contains care plans, health summaries, and consent forms",
    subFolders: [
      {
        id: "care-plans",
        name: "Care Plans",
        trackedDocuments: [
          { name: "Care Plan", key: "carePlanDate", frequency: "6-monthly" },
          { name: "Wound Care Plan", key: "woundCarePlanDate", frequency: "as-needed" },
          { name: "Personal Emergency Plan", key: "personalEmergencyPlanDate", frequency: "annual" }
        ]
      },
      {
        id: "health-summary",
        name: "Health Summary",
        trackedDocuments: [
          { name: "Health Summary", key: "healthSummaryDate", frequency: "6-monthly" },
          { name: "Self Assessment (Medx Tool)", key: "selfAssessmentMedxDate", frequency: "annual" }
        ]
      },
      {
        id: "medication-consent",
        name: "Medication Consent",
        trackedDocuments: [
          { name: "Medication Consent", key: "medicationConsentDate", frequency: "annual" }
        ]
      }
    ]
  },
  {
    id: "consent-form",
    name: "Participant Consent Form",
    icon: FileText,
    color: "text-green-600",
    trackedDocuments: [
      { name: "Consent Form", key: "consentFormDate", frequency: "annual" }
    ]
  },
  {
    id: "service-delivery",
    name: "Service Delivery Register",
    icon: ScrollText,
    color: "text-cyan-600",
    allowMultiple: true
  },
  {
    id: "risk-assessments",
    name: "Risk Assessments",
    icon: AlertTriangle,
    color: "text-amber-600",
    trackedDocuments: [
      { name: "Risk Assessment", key: "riskAssessmentDate", frequency: "annual" }
    ],
    allowMultiple: true
  },
  {
    id: "progress-notes",
    name: "Progress Notes",
    icon: FileText,
    color: "text-indigo-600",
    allowMultiple: true
  },
  {
    id: "progress-reports",
    name: "Progress Reports",
    icon: ClipboardList,
    color: "text-teal-600",
    allowMultiple: true
  },
  {
    id: "complaints-incidents",
    name: "Complaints/Incidents",
    icon: FileWarning,
    color: "text-red-600",
    allowMultiple: true
  },
  {
    id: "archive",
    name: "Archive",
    icon: FolderArchive,
    color: "text-slate-500",
    allowMultiple: true,
    description: "Archived documents"
  },
  {
    id: "bluefolder",
    name: "BlueFolder",
    icon: Folder,
    color: "text-blue-500",
    allowMultiple: true,
    description: "External document storage"
  }
];

interface DocumentTrackerProps {
  documents: ClinicalDocuments;
  clientId: string;
  zohoWorkdriveLink?: string | null;
}

export default function DocumentTracker({ documents, clientId }: DocumentTrackerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["service-agreement", "assessment-support-plan"]));
  const [expandedSubFolders, setExpandedSubFolders] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editUploadDate, setEditUploadDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editCustomTitle, setEditCustomTitle] = useState("");
  const [useManualExpiry, setUseManualExpiry] = useState(false);

  const [notRequiredDialogOpen, setNotRequiredDialogOpen] = useState(false);
  const [selectedDocForNotRequired, setSelectedDocForNotRequired] = useState<TrackedDocument | null>(null);
  const [notRequiredReason, setNotRequiredReason] = useState("");

  const [folderSettingsDialogOpen, setFolderSettingsDialogOpen] = useState(false);
  const [selectedFolderForSettings, setSelectedFolderForSettings] = useState<DocumentFolder | null>(null);
  const [folderCustomName, setFolderCustomName] = useState("");
  const [folderIsHidden, setFolderIsHidden] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const { data: uploadedDocs = [] } = useQuery<Document[]>({
    queryKey: ["/api/clients", clientId, "documents"],
    enabled: !!clientId,
  });

  const { data: complianceOverrides = [] } = useQuery<ClientDocumentCompliance[]>({
    queryKey: ["/api/clients", clientId, "document-compliance"],
    enabled: !!clientId,
  });

  const { data: folderOverrides = [] } = useQuery<ClientDocumentFolder[]>({
    queryKey: ["/api/clients", clientId, "document-folders"],
    enabled: !!clientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { documentType: string; fileName: string; fileUrl: string; folderId?: string; customTitle?: string }) => {
      return apiRequest("POST", `/api/clients/${clientId}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      resetUploadState();
      toast({ title: "Document added", description: "The document link has been saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save document", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      setDeleteConfirmOpen(false);
      setDocToDelete(null);
      toast({ title: "Document deleted", description: "The document has been permanently deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("POST", `/api/documents/${docId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      toast({ title: "Document archived", description: "The document has been moved to Archive" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to archive document", variant: "destructive" });
    }
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("POST", `/api/documents/${docId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      toast({ title: "Document restored", description: "The document has been restored from archive" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore document", variant: "destructive" });
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: { docId: string; uploadDate?: string; expiryDate?: string | null; customTitle?: string }) => {
      return apiRequest("PUT", `/api/documents/${data.docId}`, {
        uploadDate: data.uploadDate,
        expiryDate: data.expiryDate,
        customTitle: data.customTitle,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      setEditDialogOpen(false);
      setEditingDoc(null);
      toast({ title: "Document updated", description: "Document details have been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update document", variant: "destructive" });
    }
  });

  const complianceMutation = useMutation({
    mutationFn: async (data: { documentType: string; isNotRequired: string; notRequiredReason?: string }) => {
      return apiRequest("POST", `/api/clients/${clientId}/document-compliance`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "document-compliance"] });
      setNotRequiredDialogOpen(false);
      setSelectedDocForNotRequired(null);
      setNotRequiredReason("");
      toast({ title: "Compliance updated", description: "Document requirement status has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update compliance", variant: "destructive" });
    }
  });

  const folderSettingsMutation = useMutation({
    mutationFn: async (data: { folderId: string; customName?: string; isHidden?: string }) => {
      return apiRequest("POST", `/api/clients/${clientId}/document-folders`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "document-folders"] });
      setFolderSettingsDialogOpen(false);
      setSelectedFolderForSettings(null);
      toast({ title: "Folder settings saved", description: "Folder customization has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save folder settings", variant: "destructive" });
    }
  });

  const resetUploadState = () => {
    setUploadDialogOpen(false);
    setFileUrl("");
    setFileName("");
    setCustomTitle("");
    setSelectedDocType("");
    setSelectedFolderId("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const toggleSubFolder = (subFolderId: string) => {
    setExpandedSubFolders(prev => {
      const next = new Set(prev);
      if (next.has(subFolderId)) {
        next.delete(subFolderId);
      } else {
        next.add(subFolderId);
      }
      return next;
    });
  };

  const openEditDialog = (doc: Document) => {
    setEditingDoc(doc);
    setEditUploadDate(doc.uploadDate ? new Date(doc.uploadDate).toISOString().split('T')[0] : "");
    setEditExpiryDate(doc.expiryDate || "");
    setEditCustomTitle(doc.customTitle || "");
    setUseManualExpiry(!!doc.expiryDate);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    editMutation.mutate({
      docId: editingDoc.id,
      uploadDate: editUploadDate || undefined,
      expiryDate: useManualExpiry ? (editExpiryDate || null) : null,
      customTitle: editCustomTitle || undefined,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: "Please select a PDF file", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select a file smaller than 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedDocType || !selectedFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentType", selectedDocType);
      formData.append("fileName", fileName || selectedFile.name);
      if (selectedFolderId) formData.append("folderId", selectedFolderId);
      if (customTitle) formData.append("customTitle", customTitle);

      const response = await fetch(`/api/clients/${clientId}/documents/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      resetUploadState();
      toast({ title: "Document uploaded", description: "The document has been uploaded successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload the document";
      toast({ title: "Upload failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = () => {
    if (uploadMode === "file") {
      handleUploadFile();
    } else {
      if (!selectedDocType || !fileName || !fileUrl) return;
      uploadMutation.mutate({
        documentType: selectedDocType,
        fileName,
        fileUrl,
        folderId: selectedFolderId || undefined,
        customTitle: customTitle || undefined,
      });
    }
  };

  const getUploadedDoc = (docType: string) => {
    return uploadedDocs.find(d => d.documentType === docType && d.isArchived !== "yes");
  };

  const isDocNotRequired = (docType: string) => {
    const override = complianceOverrides.find(c => c.documentType === docType);
    return override?.isNotRequired === "yes";
  };

  const getNotRequiredReason = (docType: string) => {
    const override = complianceOverrides.find(c => c.documentType === docType);
    return override?.notRequiredReason || "";
  };

  const getFolderOverride = (folderId: string) => {
    return folderOverrides.find(f => f.folderId === folderId);
  };

  const getFolderName = (folder: DocumentFolder) => {
    const override = getFolderOverride(folder.id);
    return override?.customName || folder.name;
  };

  const isFolderHidden = (folderId: string) => {
    const override = getFolderOverride(folderId);
    return override?.isHidden === "yes";
  };

  const getDocsForFolder = (folderId: string) => {
    return uploadedDocs.filter(d => {
      if (folderId === "archive") {
        return d.isArchived === "yes";
      }
      return d.folderId === folderId || d.documentType === getFolderNameById(folderId);
    });
  };

  const getFolderNameById = (folderId: string): string => {
    const folder = defaultDocumentFolders.find(f => f.id === folderId);
    return folder?.name || folderId;
  };

  const getFrequencyForDoc = (docType: string): "annual" | "6-monthly" | "as-needed" => {
    for (const folder of defaultDocumentFolders) {
      if (folder.trackedDocuments) {
        const found = folder.trackedDocuments.find(d => d.name === docType);
        if (found) return found.frequency;
      }
      if (folder.subFolders) {
        for (const sf of folder.subFolders) {
          if (sf.trackedDocuments) {
            const found = sf.trackedDocuments.find(d => d.name === docType);
            if (found) return found.frequency;
          }
        }
      }
    }
    return "as-needed";
  };

  const getFolderStatus = (folder: DocumentFolder): "compliant" | "due-soon" | "overdue" | "not-required" | "none" => {
    const allTracked: TrackedDocument[] = [];
    if (folder.trackedDocuments) allTracked.push(...folder.trackedDocuments);
    if (folder.subFolders) {
      folder.subFolders.forEach(sf => {
        if (sf.trackedDocuments) allTracked.push(...sf.trackedDocuments);
      });
    }
    
    if (allTracked.length === 0) return "none";
    
    let hasOverdue = false;
    let hasDueSoon = false;
    let hasCompliant = false;
    let allNotRequired = true;
    
    allTracked.forEach(doc => {
      if (isDocNotRequired(doc.name)) {
        return;
      }
      allNotRequired = false;
      
      const uploadedDoc = getUploadedDoc(doc.name);
      if (!uploadedDoc) {
        hasOverdue = true;
        return;
      }
      const expiryDate = uploadedDoc?.expiryDate || undefined;
      const status = getComplianceStatus(expiryDate);
      if (status === "overdue") hasOverdue = true;
      else if (status === "due-soon") hasDueSoon = true;
      else if (status === "compliant") hasCompliant = true;
    });
    
    if (allNotRequired && allTracked.length > 0) return "not-required";
    if (hasOverdue) return "overdue";
    if (hasDueSoon) return "due-soon";
    if (hasCompliant) return "compliant";
    return "none";
  };

  const openFolderSettings = (folder: DocumentFolder) => {
    const override = getFolderOverride(folder.id);
    setSelectedFolderForSettings(folder);
    setFolderCustomName(override?.customName || "");
    setFolderIsHidden(override?.isHidden === "yes");
    setFolderSettingsDialogOpen(true);
  };

  const handleSaveFolderSettings = () => {
    if (!selectedFolderForSettings) return;
    folderSettingsMutation.mutate({
      folderId: selectedFolderForSettings.id,
      customName: folderCustomName || undefined,
      isHidden: folderIsHidden ? "yes" : "no",
    });
  };

  const openNotRequiredDialog = (doc: TrackedDocument) => {
    setSelectedDocForNotRequired(doc);
    setNotRequiredReason(getNotRequiredReason(doc.name));
    setNotRequiredDialogOpen(true);
  };

  const handleSetNotRequired = (isNotRequired: boolean) => {
    if (!selectedDocForNotRequired) return;
    complianceMutation.mutate({
      documentType: selectedDocForNotRequired.name,
      isNotRequired: isNotRequired ? "yes" : "no",
      notRequiredReason: isNotRequired ? notRequiredReason : undefined,
    });
  };

  const confirmDelete = (doc: Document) => {
    setDocToDelete(doc);
    setDeleteConfirmOpen(true);
  };

  const renderDocumentActions = (doc: Document, isArchived: boolean = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`button-doc-actions-${doc.id}`}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Document
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEditDialog(doc)} className="flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Edit Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isArchived ? (
          <DropdownMenuItem 
            onClick={() => unarchiveMutation.mutate(doc.id)}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restore from Archive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem 
            onClick={() => archiveMutation.mutate(doc.id)}
            className="flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            Move to Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => confirmDelete(doc)}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Delete Permanently
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderTrackedDocument = (doc: TrackedDocument, parentFolderId: string) => {
    const uploadedDoc = getUploadedDoc(doc.name);
    const isNotRequired = isDocNotRequired(doc.name);
    const notRequiredReasonText = getNotRequiredReason(doc.name);
    const expiryDate = uploadedDoc?.expiryDate || undefined;
    const status = isNotRequired ? "not-required" : (uploadedDoc ? getComplianceStatus(expiryDate) : "overdue");

    return (
      <div 
        key={doc.key}
        className={`p-3 rounded-lg border flex items-center gap-3 ${
          isNotRequired ? "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20" :
          status === "overdue" ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" :
          status === "due-soon" ? "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" :
          status === "compliant" ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" :
          "border-muted bg-muted/30"
        }`}
        data-testid={`doc-item-${doc.key}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${isNotRequired ? "text-muted-foreground line-through" : ""}`}>
              {doc.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {doc.frequency}
            </Badge>
            {isNotRequired && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <EyeOff className="w-3 h-3" />
                    Not Required
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{notRequiredReasonText || "Marked as not required for this client"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {!isNotRequired && (
            <div className="flex items-center gap-2 mt-1">
              {uploadedDoc ? (
                <ComplianceIndicator status={status as any} />
              ) : (
                <Badge variant="destructive" className="text-xs">Missing - Non-Compliant</Badge>
              )}
            </div>
          )}
          {uploadedDoc && (
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {uploadedDoc.customTitle || uploadedDoc.fileName}
              </span>
              {uploadedDoc.expiryDate && (
                <span className={`flex items-center gap-1 ${
                  new Date(uploadedDoc.expiryDate) < new Date() ? 'text-red-600' :
                  new Date(uploadedDoc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(uploadedDoc.expiryDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {uploadedDoc && (
                <>
                  <DropdownMenuItem asChild>
                    <a href={uploadedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Document
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditDialog(uploadedDoc)} className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => archiveMutation.mutate(uploadedDoc.id)} className="flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedDocType(doc.name);
                  setSelectedFolderId(parentFolderId);
                  setUploadDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploadedDoc ? "Replace Document" : "Upload Document"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => openNotRequiredDialog(doc)}
                className="flex items-center gap-2"
              >
                {isNotRequired ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {isNotRequired ? "Mark as Required" : "Mark as Not Required"}
              </DropdownMenuItem>
              {uploadedDoc && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => confirmDelete(uploadedDoc)}
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderMultipleDocumentsFolder = (folder: DocumentFolder) => {
    const folderDocs = folder.id === "archive" 
      ? uploadedDocs.filter(d => d.isArchived === "yes")
      : uploadedDocs.filter(d => 
          d.isArchived !== "yes" && 
          (d.folderId === folder.id || d.documentType === folder.name || d.documentType.startsWith(`${folder.name}:`))
        );
    
    return (
      <div className="space-y-2">
        {folderDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">No documents</p>
        ) : (
          folderDocs.map(doc => (
            <div 
              key={doc.id}
              className="p-3 rounded-lg border bg-muted/30 flex items-center gap-3"
              data-testid={`doc-item-${doc.id}`}
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.customTitle || doc.fileName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  {doc.uploadDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </span>
                  )}
                  {doc.originalFolderId && folder.id === "archive" && (
                    <span>from: {doc.originalFolderId}</span>
                  )}
                </p>
              </div>
              {renderDocumentActions(doc, folder.id === "archive")}
            </div>
          ))
        )}
        {folder.id !== "archive" && (
          <Button 
            size="sm" 
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              setSelectedDocType(folder.name);
              setSelectedFolderId(folder.id);
              setUploadDialogOpen(true);
            }}
            data-testid={`button-add-doc-${folder.id}`}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Document
          </Button>
        )}
      </div>
    );
  };

  const visibleFolders = defaultDocumentFolders.filter(f => !isFolderHidden(f.id));

  return (
    <div className="space-y-3">
      {visibleFolders.map((folder) => {
        const FolderIcon = folder.icon;
        const isExpanded = expandedFolders.has(folder.id);
        const folderStatus = getFolderStatus(folder);
        const hasTrackedDocs = folder.trackedDocuments || folder.subFolders;
        const folderDocs = folder.id === "archive" 
          ? uploadedDocs.filter(d => d.isArchived === "yes")
          : getDocsForFolder(folder.id);

        return (
          <Collapsible 
            key={folder.id} 
            open={isExpanded} 
            onOpenChange={() => toggleFolder(folder.id)}
          >
            <Card className={`${
              folderStatus === "overdue" ? "border-red-300 dark:border-red-800" :
              folderStatus === "due-soon" ? "border-amber-300 dark:border-amber-800" :
              folderStatus === "compliant" ? "border-emerald-300 dark:border-emerald-800" :
              folderStatus === "not-required" ? "border-slate-300 dark:border-slate-700" :
              ""
            }`} data-testid={`folder-${folder.id}`}>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className={`w-5 h-5 ${folder.color} flex-shrink-0`} />
                      ) : (
                        <FolderIcon className={`w-5 h-5 ${folder.color} flex-shrink-0`} />
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-medium truncate">{getFolderName(folder)}</CardTitle>
                        {folder.description && (
                          <p className="text-xs text-muted-foreground truncate">{folder.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasTrackedDocs && folderStatus !== "none" && folderStatus !== "not-required" && (
                        <ComplianceIndicator status={folderStatus as any} />
                      )}
                      {folderStatus === "not-required" && (
                        <Badge variant="secondary" className="text-xs">N/A</Badge>
                      )}
                      {folder.allowMultiple && (
                        <Badge variant="outline" className="text-xs">
                          {folderDocs.length}
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFolderSettings(folder);
                        }}
                        data-testid={`button-folder-settings-${folder.id}`}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {folder.subFolders ? (
                    <div className="space-y-2">
                      {folder.subFolders.map(subFolder => {
                        const isSubExpanded = expandedSubFolders.has(subFolder.id);
                        return (
                          <Collapsible 
                            key={subFolder.id}
                            open={isSubExpanded}
                            onOpenChange={() => toggleSubFolder(subFolder.id)}
                          >
                            <div className="border rounded-lg">
                              <CollapsibleTrigger asChild>
                                <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                  {isSubExpanded ? (
                                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <Folder className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className="font-medium text-sm">{subFolder.name}</span>
                                  <Badge variant="outline" className="text-xs ml-auto">
                                    {subFolder.trackedDocuments?.length || 0}
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="p-3 pt-0 space-y-2">
                                  {subFolder.trackedDocuments?.map(doc => 
                                    renderTrackedDocument(doc, folder.id)
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  ) : folder.trackedDocuments ? (
                    <div className="space-y-2">
                      {folder.trackedDocuments.map(doc => 
                        renderTrackedDocument(doc, folder.id)
                      )}
                      {folder.allowMultiple && renderMultipleDocumentsFolder(folder)}
                    </div>
                  ) : folder.allowMultiple ? (
                    renderMultipleDocumentsFolder(folder)
                  ) : null}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              {selectedDocType ? `Upload or link a ${selectedDocType} document` : "Add a new document"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "link")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="gap-2">
                  <File className="w-4 h-4" />
                  Upload PDF
                </TabsTrigger>
                <TabsTrigger value="link" className="gap-2">
                  <Link className="w-4 h-4" />
                  External Link
                </TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select PDF File</Label>
                  <Input 
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="cursor-pointer"
                    data-testid="input-doc-file"
                  />
                  <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
                </div>
                {selectedFile && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="link" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>File Name</Label>
                  <Input 
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g., Service_Agreement_2024.pdf"
                    data-testid="input-doc-filename"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Document URL</Label>
                  <Input 
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://..."
                    data-testid="input-doc-url"
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-2">
              <Label>Custom Title (Optional)</Label>
              <Input 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Optional display name for this document"
                data-testid="input-doc-custom-title"
              />
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={
                uploadMode === "file" 
                  ? !selectedFile || isUploading
                  : !fileName || !fileUrl || uploadMutation.isPending
              }
              className="w-full"
              data-testid="button-submit-upload"
            >
              {(isUploading || uploadMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploadMode === "file" ? "Upload PDF" : "Save Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
          </DialogHeader>
          {editingDoc && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{editingDoc.documentType}</p>
                <p className="text-xs text-muted-foreground truncate">{editingDoc.fileName}</p>
              </div>

              <div className="space-y-2">
                <Label>Custom Title</Label>
                <Input 
                  value={editCustomTitle}
                  onChange={(e) => setEditCustomTitle(e.target.value)}
                  placeholder="Display name for this document"
                  data-testid="input-edit-custom-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Date</Label>
                <Input 
                  type="date"
                  value={editUploadDate}
                  onChange={(e) => setEditUploadDate(e.target.value)}
                  data-testid="input-edit-upload-date"
                />
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Manual Expiry Date</Label>
                    <p className="text-xs text-muted-foreground">Override automatic calculation</p>
                  </div>
                  <Switch
                    checked={useManualExpiry}
                    onCheckedChange={setUseManualExpiry}
                    data-testid="switch-manual-expiry"
                  />
                </div>
                {useManualExpiry && (
                  <Input 
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    data-testid="input-edit-expiry-date"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveEdit} disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Not Required Dialog */}
      <Dialog open={notRequiredDialogOpen} onOpenChange={setNotRequiredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDocNotRequired(selectedDocForNotRequired?.name || "") 
                ? "Restore Document Requirement" 
                : "Mark Document as Not Required"}
            </DialogTitle>
            <DialogDescription>
              {selectedDocForNotRequired?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isDocNotRequired(selectedDocForNotRequired?.name || "") && (
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea 
                  value={notRequiredReason}
                  onChange={(e) => setNotRequiredReason(e.target.value)}
                  placeholder="Why is this document not required for this client?"
                  data-testid="input-not-required-reason"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setNotRequiredDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => handleSetNotRequired(!isDocNotRequired(selectedDocForNotRequired?.name || ""))}
                disabled={complianceMutation.isPending}
              >
                {complianceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isDocNotRequired(selectedDocForNotRequired?.name || "") ? "Restore Requirement" : "Mark as Not Required"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Settings Dialog */}
      <Dialog open={folderSettingsDialogOpen} onOpenChange={setFolderSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder Settings</DialogTitle>
            <DialogDescription>
              Customize how this folder appears for this client
            </DialogDescription>
          </DialogHeader>
          {selectedFolderForSettings && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Custom Folder Name</Label>
                <Input 
                  value={folderCustomName}
                  onChange={(e) => setFolderCustomName(e.target.value)}
                  placeholder={selectedFolderForSettings.name}
                  data-testid="input-folder-custom-name"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default name
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Hide Folder</Label>
                  <p className="text-xs text-muted-foreground">
                    Hide this folder for this client
                  </p>
                </div>
                <Switch
                  checked={folderIsHidden}
                  onCheckedChange={setFolderIsHidden}
                  data-testid="switch-folder-hidden"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setFolderSettingsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSaveFolderSettings}
                  disabled={folderSettingsMutation.isPending}
                >
                  {folderSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The document will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {docToDelete && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-medium text-sm">{docToDelete.customTitle || docToDelete.fileName}</p>
                <p className="text-xs text-muted-foreground">{docToDelete.documentType}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1" 
                  onClick={() => deleteMutation.mutate(docToDelete.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete Permanently
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
