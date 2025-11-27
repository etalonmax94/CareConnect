import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Upload, Eye, FileText, Trash2, ExternalLink, Loader2, File, Link, Calendar, Pencil, FolderOpen, Folder, ChevronDown, ChevronRight, Plus, FolderArchive, ClipboardList, FileWarning, ScrollText, Heart, AlertTriangle, FileCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

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

const documentFolders: DocumentFolder[] = [
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

export default function DocumentTracker({ documents, clientId, zohoWorkdriveLink }: DocumentTrackerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["service-agreement", "assessment-support-plan"]));
  const [expandedSubFolders, setExpandedSubFolders] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editUploadDate, setEditUploadDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [useManualExpiry, setUseManualExpiry] = useState(false);

  const { data: uploadedDocs = [] } = useQuery<Document[]>({
    queryKey: ["/api/clients", clientId, "documents"],
    enabled: !!clientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { documentType: string; fileName: string; fileUrl: string }) => {
      return apiRequest("POST", `/api/clients/${clientId}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      resetUploadState();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { docId: string; uploadDate?: string; expiryDate?: string | null }) => {
      return apiRequest("PATCH", `/api/documents/${data.docId}`, {
        uploadDate: data.uploadDate,
        expiryDate: data.expiryDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      setEditDialogOpen(false);
      setEditingDoc(null);
      toast({
        title: "Document updated",
        description: "Document dates have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update document dates",
        variant: "destructive",
      });
    },
  });

  const resetUploadState = () => {
    setUploadDialogOpen(false);
    setFileUrl("");
    setFileName("");
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
    setUseManualExpiry(!!doc.expiryDate);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    editMutation.mutate({
      docId: editingDoc.id,
      uploadDate: editUploadDate || undefined,
      expiryDate: useManualExpiry ? (editExpiryDate || null) : null,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
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
      
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload the document. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
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
      });
    }
  };

  const getUploadedDoc = (docType: string) => {
    return uploadedDocs.find(d => d.documentType === docType);
  };

  const getDocsForFolder = (folderId: string) => {
    const folderDocTypes = getFolderDocTypes(folderId);
    return uploadedDocs.filter(d => folderDocTypes.includes(d.documentType));
  };

  const getFolderDocTypes = (folderId: string): string[] => {
    const folder = documentFolders.find(f => f.id === folderId);
    if (!folder) return [];
    
    const types: string[] = [];
    if (folder.trackedDocuments) {
      types.push(...folder.trackedDocuments.map(d => d.name));
    }
    if (folder.subFolders) {
      folder.subFolders.forEach(sf => {
        if (sf.trackedDocuments) {
          types.push(...sf.trackedDocuments.map(d => d.name));
        }
      });
    }
    if (folder.allowMultiple) {
      types.push(folder.name);
    }
    return types;
  };

  const getFrequencyForDoc = (docType: string): "annual" | "6-monthly" | "as-needed" => {
    for (const folder of documentFolders) {
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

  const getFolderStatus = (folder: DocumentFolder): "compliant" | "due-soon" | "overdue" | "none" => {
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
    
    allTracked.forEach(doc => {
      const uploadedDoc = getUploadedDoc(doc.name);
      const expiryDate = uploadedDoc?.expiryDate || undefined;
      const status = getComplianceStatus(expiryDate);
      if (status === "overdue") hasOverdue = true;
      else if (status === "due-soon") hasDueSoon = true;
      else if (status === "compliant") hasCompliant = true;
    });
    
    if (hasOverdue) return "overdue";
    if (hasDueSoon) return "due-soon";
    if (hasCompliant) return "compliant";
    return "none";
  };

  const renderTrackedDocument = (doc: TrackedDocument, parentFolderId: string) => {
    const uploadedDoc = getUploadedDoc(doc.name);
    const expiryDate = uploadedDoc?.expiryDate || undefined;
    const status = getComplianceStatus(expiryDate);

    return (
      <div 
        key={doc.key}
        className={`p-3 rounded-lg border ${
          status === "overdue" ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" :
          status === "due-soon" ? "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" :
          status === "compliant" ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" :
          "border-muted bg-muted/30"
        }`}
        data-testid={`doc-item-${doc.key}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{doc.name}</span>
              <Badge variant="outline" className="text-xs">
                {doc.frequency}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ComplianceIndicator status={status} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {uploadedDoc ? (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                  <a href={uploadedDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7"
                  onClick={() => openEditDialog(uploadedDoc)}
                  data-testid={`button-edit-doc-${doc.key}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteMutation.mutate(uploadedDoc.id)}
                  data-testid={`button-delete-doc-${doc.key}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : null}
            <Dialog open={uploadDialogOpen && selectedDocType === doc.name} onOpenChange={(open) => {
              setUploadDialogOpen(open);
              if (open) {
                setSelectedDocType(doc.name);
                setSelectedFolderId(parentFolderId);
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant={uploadedDoc ? "outline" : "default"}
                  className="h-7 text-xs"
                  onClick={() => {
                    setSelectedDocType(doc.name);
                    setSelectedFolderId(parentFolderId);
                  }}
                  data-testid={`button-upload-${doc.key}`}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {uploadedDoc ? "Replace" : "Upload"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload {doc.name}</DialogTitle>
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
                        <Label htmlFor="pdfFile">Select PDF File</Label>
                        <Input 
                          id="pdfFile"
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
                          <span className="text-sm truncate">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Auto-expiry:</strong> Expiry date will be automatically calculated based on document type 
                          ({doc.frequency === "annual" ? "12 months" : doc.frequency === "6-monthly" ? "6 months" : "no expiry"} from upload date).
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="link" className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        Enter the document details for an external link (e.g., Zoho WorkDrive).
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="fileName">File Name</Label>
                        <Input 
                          id="fileName"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="e.g., Service_Agreement_2024.pdf"
                          data-testid="input-doc-filename"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fileUrl">Document URL</Label>
                        <Input 
                          id="fileUrl"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder="https://..."
                          data-testid="input-doc-url"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
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
          </div>
        </div>
        {uploadedDoc && (
          <div className="mt-2 pt-2 border-t border-muted text-xs space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span className="truncate">{uploadedDoc.fileName}</span>
            </div>
            {uploadedDoc.uploadDate && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Uploaded: {new Date(uploadedDoc.uploadDate).toLocaleDateString()}</span>
              </div>
            )}
            {uploadedDoc.expiryDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Expires:</span>
                <span className={`font-medium ${
                  new Date(uploadedDoc.expiryDate) < new Date() ? 'text-red-600' :
                  new Date(uploadedDoc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {new Date(uploadedDoc.expiryDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMultipleDocumentsFolder = (folder: DocumentFolder) => {
    const folderDocs = uploadedDocs.filter(d => d.documentType === folder.name || d.documentType.startsWith(`${folder.name}:`));
    
    return (
      <div className="space-y-2">
        {folderDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No documents uploaded yet</p>
        ) : (
          folderDocs.map(doc => (
            <div 
              key={doc.id}
              className="p-3 rounded-lg border bg-muted/30 flex items-start justify-between gap-2"
              data-testid={`doc-item-${doc.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm truncate">{doc.fileName}</span>
                </div>
                {doc.uploadDate && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteMutation.mutate(doc.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
        <Dialog open={uploadDialogOpen && selectedFolderId === folder.id} onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (open) {
            setSelectedDocType(folder.name);
            setSelectedFolderId(folder.id);
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setSelectedDocType(folder.name);
                setSelectedFolderId(folder.id);
              }}
              data-testid={`button-add-doc-${folder.id}`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to {folder.name}</DialogTitle>
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
                    <Label htmlFor="pdfFile">Select PDF File</Label>
                    <Input 
                      id="pdfFile"
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
                      <span className="text-sm truncate">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="link" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the document details for an external link.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="fileName">File Name</Label>
                    <Input 
                      id="fileName"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="e.g., Progress_Note_Nov_2024.pdf"
                      data-testid="input-doc-filename"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fileUrl">Document URL</Label>
                    <Input 
                      id="fileUrl"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="https://..."
                      data-testid="input-doc-url"
                    />
                  </div>
                </TabsContent>
              </Tabs>
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
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {zohoWorkdriveLink && (
        <Card className="border-blue-300 dark:border-blue-800" data-testid="card-zoho-workdrive">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" />
                Zoho WorkDrive
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                External Folder
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" className="w-full" asChild>
              <a href={zohoWorkdriveLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-2" />
                Open in Zoho WorkDrive
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {documentFolders.map((folder) => {
          const FolderIcon = folder.icon;
          const isExpanded = expandedFolders.has(folder.id);
          const folderStatus = getFolderStatus(folder);
          const hasTrackedDocs = folder.trackedDocuments || folder.subFolders;
          const folderDocs = getDocsForFolder(folder.id);

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
                ""
              }`} data-testid={`folder-${folder.id}`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        {isExpanded ? (
                          <FolderOpen className={`w-5 h-5 ${folder.color}`} />
                        ) : (
                          <FolderIcon className={`w-5 h-5 ${folder.color}`} />
                        )}
                        <div>
                          <CardTitle className="text-sm font-medium">{folder.name}</CardTitle>
                          {folder.description && (
                            <p className="text-xs text-muted-foreground">{folder.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasTrackedDocs && folderStatus !== "none" && (
                          <ComplianceIndicator status={folderStatus} />
                        )}
                        {folder.allowMultiple && (
                          <Badge variant="secondary" className="text-xs">
                            {folderDocs.length} file{folderDocs.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
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
                                      {subFolder.trackedDocuments?.length || 0} document{(subFolder.trackedDocuments?.length || 0) !== 1 ? 's' : ''}
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
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document Dates</DialogTitle>
          </DialogHeader>
          {editingDoc && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{editingDoc.documentType}</p>
                <p className="text-xs text-muted-foreground truncate">{editingDoc.fileName}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editUploadDate">Upload Date</Label>
                <Input 
                  id="editUploadDate"
                  type="date"
                  value={editUploadDate}
                  onChange={(e) => setEditUploadDate(e.target.value)}
                  data-testid="input-edit-upload-date"
                />
                <p className="text-xs text-muted-foreground">
                  Change when this document was uploaded (affects auto-expiry calculation)
                </p>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="manualExpiry">Manual Expiry Date</Label>
                    <p className="text-xs text-muted-foreground">
                      Override the automatic expiry calculation
                    </p>
                  </div>
                  <Switch
                    id="manualExpiry"
                    checked={useManualExpiry}
                    onCheckedChange={setUseManualExpiry}
                    data-testid="switch-manual-expiry"
                  />
                </div>

                {useManualExpiry && (
                  <div className="space-y-2">
                    <Label htmlFor="editExpiryDate">Expiry Date</Label>
                    <Input 
                      id="editExpiryDate"
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      data-testid="input-edit-expiry-date"
                    />
                  </div>
                )}

                {!useManualExpiry && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Expiry will be automatically calculated based on document type and upload date.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveEdit}
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
