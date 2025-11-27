import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Upload, Eye, FileText, Trash2, ExternalLink, Loader2, File, Link } from "lucide-react";
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

interface DocumentDefinition {
  name: string;
  date?: string;
  frequency: "annual" | "6-monthly" | "as-needed";
  key: keyof ClinicalDocuments;
}

const documentList: DocumentDefinition[] = [
  { name: "Service Agreement", key: "serviceAgreementDate", frequency: "annual" },
  { name: "Consent Form", key: "consentFormDate", frequency: "annual" },
  { name: "Risk Assessment", key: "riskAssessmentDate", frequency: "annual" },
  { name: "Self Assessment (Medx Tool)", key: "selfAssessmentMedxDate", frequency: "annual" },
  { name: "Medication Consent", key: "medicationConsentDate", frequency: "annual" },
  { name: "Personal Emergency Plan", key: "personalEmergencyPlanDate", frequency: "annual" },
  { name: "Care Plan", key: "carePlanDate", frequency: "6-monthly" },
  { name: "Health Summary", key: "healthSummaryDate", frequency: "6-monthly" },
  { name: "Wound Care Plan", key: "woundCarePlanDate", frequency: "as-needed" },
];

interface DocumentTrackerProps {
  documents: ClinicalDocuments;
  clientId: string;
  zohoWorkdriveLink?: string | null;
}

export default function DocumentTracker({ documents, clientId, zohoWorkdriveLink }: DocumentTrackerProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      setUploadDialogOpen(false);
      setFileUrl("");
      setFileName("");
      setSelectedDocType("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      setUploadDialogOpen(false);
      setFileUrl("");
      setFileName("");
      setSelectedDocType("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
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

  return (
    <div className="space-y-6">
      {zohoWorkdriveLink && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Zoho WorkDrive Folder</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={zohoWorkdriveLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in WorkDrive
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentList.map((doc) => {
          const uploadedDoc = getUploadedDoc(doc.name);
          // Use uploaded document's auto-calculated expiry date for status
          const expiryDate = uploadedDoc?.expiryDate || undefined;
          const status = getComplianceStatus(expiryDate);
          
          return (
            <Card 
              key={doc.key} 
              className={`${
                status === "overdue" ? "border-red-300 dark:border-red-800" :
                status === "due-soon" ? "border-amber-300 dark:border-amber-800" :
                status === "compliant" ? "border-emerald-300 dark:border-emerald-800" :
                ""
              }`}
              data-testid={`card-document-${doc.key}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{doc.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {doc.frequency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <ComplianceIndicator status={status} />
                </div>
                {uploadedDoc && (
                  <div className="p-2 bg-muted rounded text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-32 font-medium">{uploadedDoc.fileName}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                          <a href={uploadedDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-3 h-3" />
                          </a>
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteMutation.mutate(uploadedDoc.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {uploadedDoc.uploadDate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Uploaded:</span>
                        <span>{new Date(uploadedDoc.uploadDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {uploadedDoc.expiryDate ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Auto-expires:</span>
                        <span className={`font-medium ${
                          new Date(uploadedDoc.expiryDate) < new Date() ? 'text-red-600' :
                          new Date(uploadedDoc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {new Date(uploadedDoc.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <span>No expiry (as-needed)</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Dialog open={uploadDialogOpen && selectedDocType === doc.name} onOpenChange={(open) => {
                    setUploadDialogOpen(open);
                    if (open) setSelectedDocType(doc.name);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1" 
                        data-testid={`button-upload-${doc.key}`}
                        onClick={() => setSelectedDocType(doc.name)}
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
                  {uploadedDoc && (
                    <Button size="sm" variant="ghost" asChild data-testid={`button-view-${doc.key}`}>
                      <a href={uploadedDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
