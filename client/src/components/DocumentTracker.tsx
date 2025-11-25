import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ComplianceIndicator, { getComplianceStatus } from "./ComplianceIndicator";
import { Upload, Eye, FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

  const handleUpload = () => {
    if (!selectedDocType || !fileName || !fileUrl) return;
    uploadMutation.mutate({
      documentType: selectedDocType,
      fileName,
      fileUrl,
    });
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
          const date = documents[doc.key];
          const status = getComplianceStatus(date);
          const uploadedDoc = getUploadedDoc(doc.name);
          
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
                {date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expiry Date</p>
                    <p className="text-sm font-mono">{new Date(date).toLocaleDateString()}</p>
                  </div>
                )}
                {uploadedDoc && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <p className="text-muted-foreground mb-1">Uploaded File</p>
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-32">{uploadedDoc.fileName}</span>
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
                        <p className="text-sm text-muted-foreground">
                          Enter the document details. The file should be uploaded to Zoho WorkDrive and the link provided here.
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
                          <Label htmlFor="fileUrl">Document URL (from Zoho WorkDrive)</Label>
                          <Input 
                            id="fileUrl"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="https://workdrive.zoho.com/..."
                            data-testid="input-doc-url"
                          />
                        </div>
                        <Button 
                          onClick={handleUpload} 
                          disabled={!fileName || !fileUrl || uploadMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-upload"
                        >
                          {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Upload Document
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
