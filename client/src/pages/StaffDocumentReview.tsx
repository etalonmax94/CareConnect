import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, FileText, Calendar, CheckCircle, XCircle,
  AlertCircle, Download, User, Building2, Clock, Eye, ExternalLink,
  AlertTriangle, FileCheck
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StaffDocument, StaffDocumentType } from "@shared/schema";

interface StaffDocumentWithStaff extends StaffDocument {
  staffName?: string;
  staffEmail?: string;
}

const DOCUMENT_TYPE_LABELS: Record<StaffDocumentType, string> = {
  id_document_1: "ID Document 1",
  id_document_2: "ID Document 2",
  right_to_work: "Right to Work in Australia",
  police_check: "Police Check",
  yellow_card: "Yellow Card | NDIS Worker Screening",
  blue_card: "Blue Card | Work With Children Check",
  nursing_registration: "Nursing Registration",
  qualification_award: "Qualification Award",
  cpr: "CPR",
  first_aid: "First Aid",
  vaccination_record: "Vaccination Record",
  vehicle_insurance: "Vehicle Comprehensive Insurance",
  ndis_orientation: "NDIS Worker Orientation Module",
  ndis_communication: "NDIS Supporting Effective Communication",
  ndis_safe_meals: "NDIS Supporting Safe and Enjoyable Meals",
  hand_hygiene: "Hand Hygiene Training Certificate",
  infection_control: "Infection Control Certificate",
  employment_agreement: "Employment Agreement",
  resume_cv: "Resume and CV",
  position_description: "Position Description",
  commitment_declaration: "Staff Commitment Declaration Form",
  induction_checklist: "Staff Induction Checklist",
};

function formatDocumentType(type: StaffDocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}

export default function StaffDocumentReview() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "expired">("pending");
  const [selectedDocument, setSelectedDocument] = useState<StaffDocumentWithStaff | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch pending documents
  const { data: pendingDocuments = [], isLoading: loadingPending } = useQuery<StaffDocumentWithStaff[]>({
    queryKey: ["/api/staff/documents/pending"],
  });

  // Fetch expired documents
  const { data: expiredDocuments = [], isLoading: loadingExpired } = useQuery<StaffDocumentWithStaff[]>({
    queryKey: ["/api/staff/documents/expired"],
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (documentId: string) => apiRequest("PATCH", `/api/staff/documents/${documentId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/documents/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/documents/expired"] });
      toast({ title: "Document approved successfully" });
      setReviewDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve document", description: error.message, variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      apiRequest("PATCH", `/api/staff/documents/${documentId}/reject`, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/documents/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/documents/expired"] });
      toast({ title: "Document rejected" });
      setReviewDialogOpen(false);
      setSelectedDocument(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject document", description: error.message, variant: "destructive" });
    },
  });

  const handleReviewDocument = (doc: StaffDocumentWithStaff) => {
    setSelectedDocument(doc);
    setRejectionReason("");
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedDocument) {
      approveMutation.mutate(selectedDocument.id);
    }
  };

  const handleReject = () => {
    if (selectedDocument && rejectionReason.trim()) {
      rejectMutation.mutate({ documentId: selectedDocument.id, reason: rejectionReason.trim() });
    }
  };

  const isLoading = loadingPending || loadingExpired;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/staff">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Staff
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCheck className="w-6 h-6" />
              Staff Document Review
            </h1>
            <p className="text-muted-foreground">Review and approve staff compliance documents</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">{pendingDocuments.length} Pending</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">{expiredDocuments.length} Expired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "expired")}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Pending Review ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Expired Documents ({expiredDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Documents */}
        <TabsContent value="pending">
          {pendingDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold text-lg">All caught up!</h3>
                <p className="text-muted-foreground">There are no documents waiting for review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingDocuments.map((doc) => (
                <Card key={doc.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {doc.staffName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/staff/${doc.staffId}`}>
                              <span className="font-semibold hover:underline cursor-pointer">
                                {doc.staffName || "Unknown Staff"}
                              </span>
                            </Link>
                            <Badge variant="secondary">{formatDocumentType(doc.documentType as StaffDocumentType)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{doc.documentName}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            {doc.uploadedByName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Uploaded by {doc.uploadedByName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.createdAt).toLocaleDateString("en-AU")}
                            </span>
                            {doc.expiryDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Expires: {new Date(doc.expiryDate).toLocaleDateString("en-AU")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-1" /> View
                            </a>
                          </Button>
                        )}
                        <Button size="sm" onClick={() => handleReviewDocument(doc)}>
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expired Documents */}
        <TabsContent value="expired">
          {expiredDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold text-lg">No expired documents</h3>
                <p className="text-muted-foreground">All staff documents are up to date.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {expiredDocuments.map((doc) => (
                <Card key={doc.id} className="border-red-200 bg-red-50/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {doc.staffName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/staff/${doc.staffId}`}>
                              <span className="font-semibold hover:underline cursor-pointer">
                                {doc.staffName || "Unknown Staff"}
                              </span>
                            </Link>
                            <Badge variant="destructive">{formatDocumentType(doc.documentType as StaffDocumentType)}</Badge>
                            <Badge variant="outline" className="text-red-600 border-red-300">Expired</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{doc.documentName}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            {doc.expiryDate && (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                                Expired: {new Date(doc.expiryDate).toLocaleDateString("en-AU")}
                              </span>
                            )}
                            {doc.issuingAuthority && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {doc.issuingAuthority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-1" /> View
                            </a>
                          </Button>
                        )}
                        <Link href={`/staff/${doc.staffId}`}>
                          <Button size="sm" variant="outline">
                            <User className="w-4 h-4 mr-1" /> View Staff
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Review and approve or reject this document submission.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Document Type</span>
                  <Badge>{formatDocumentType(selectedDocument.documentType as StaffDocumentType)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Document Name</span>
                  <span className="font-medium">{selectedDocument.documentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Staff Member</span>
                  <span className="font-medium">{selectedDocument.staffName || "Unknown"}</span>
                </div>
                {selectedDocument.documentNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Document Number</span>
                    <span className="font-medium">{selectedDocument.documentNumber}</span>
                  </div>
                )}
                {selectedDocument.issuingAuthority && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Issuing Authority</span>
                    <span className="font-medium">{selectedDocument.issuingAuthority}</span>
                  </div>
                )}
                {selectedDocument.issueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Issue Date</span>
                    <span className="font-medium">{new Date(selectedDocument.issueDate).toLocaleDateString("en-AU")}</span>
                  </div>
                )}
                {selectedDocument.expiryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                    <span className={`font-medium ${new Date(selectedDocument.expiryDate) < new Date() ? "text-red-600" : ""}`}>
                      {new Date(selectedDocument.expiryDate).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                )}
                {selectedDocument.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Notes</span>
                    <p className="text-sm mt-1">{selectedDocument.notes}</p>
                  </div>
                )}
              </div>

              {/* View Document Button */}
              {selectedDocument.fileUrl && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Open Document in New Tab
                  </a>
                </Button>
              )}

              {/* Rejection Reason */}
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason if you are rejecting this document..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <CheckCircle className="w-4 h-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
