import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stethoscope, Pill, HeartPulse, Briefcase, Building2, Users, ChevronRight, Plus, Loader2, Phone, Mail, UserCog, FileCheck, AlertCircle, AlertTriangle, CheckCircle, XCircle, Eye, Clock, User, Calendar, ExternalLink, Award } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GP, Pharmacy, AlliedHealthProfessional, PlanManager, SupportCoordinator, Staff, Client, StaffDocument, StaffDocumentType } from "@shared/schema";

interface StaffDocumentWithStaff extends StaffDocument {
  staffName?: string;
  staffEmail?: string;
}

interface StaffQualification {
  id: string;
  staffId: string;
  staffName?: string;
  qualificationType: string;
  qualificationName: string;
  issuingOrganization?: string;
  certificationNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: "current" | "expired" | "pending_renewal" | "suspended";
  createdAt: string;
}

interface QualificationsSummary {
  total: number;
  current: number;
  expiringSoon: number;
  expired: number;
  pendingRenewal: number;
  recentExpiring: StaffQualification[];
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

interface ProviderTileProps {
  title: string;
  description: string;
  icon: typeof Stethoscope;
  iconColor: string;
  bgColor: string;
  count: number;
  href: string;
  recentItems: Array<{ id: string; name: string; subtitle?: string }>;
  isLoading: boolean;
}

function ProviderTile({ title, description, icon: Icon, iconColor, bgColor, count, href, recentItems, isLoading }: ProviderTileProps) {
  return (
    <Card className="hover-elevate transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${bgColor}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg font-semibold px-3">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentItems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</p>
            <div className="space-y-2">
              {recentItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-muted">
                      {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1">{item.name}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">No records yet</p>
        )}
        
        <div className="flex gap-2 pt-2">
          <Link href={href} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CareTeam() {
  const { toast } = useToast();
  const [documentReviewTab, setDocumentReviewTab] = useState<"pending" | "expired">("pending");
  const [selectedDocument, setSelectedDocument] = useState<StaffDocumentWithStaff | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: gps = [], isLoading: isLoadingGPs } = useQuery<GP[]>({
    queryKey: ["/api/gps"],
  });

  const { data: pharmacies = [], isLoading: isLoadingPharmacies } = useQuery<Pharmacy[]>({
    queryKey: ["/api/pharmacies"],
  });

  const { data: alliedHealth = [], isLoading: isLoadingAlliedHealth } = useQuery<AlliedHealthProfessional[]>({
    queryKey: ["/api/allied-health-professionals"],
  });

  const { data: planManagers = [], isLoading: isLoadingPlanManagers } = useQuery<PlanManager[]>({
    queryKey: ["/api/plan-managers"],
  });

  const { data: supportCoordinators = [], isLoading: isLoadingSupportCoordinators } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
  });

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  // Fetch pending documents for review
  const { data: pendingDocuments = [], isLoading: loadingPending } = useQuery<StaffDocumentWithStaff[]>({
    queryKey: ["/api/staff/documents/pending"],
  });

  // Fetch expired documents
  const { data: expiredDocuments = [], isLoading: loadingExpired } = useQuery<StaffDocumentWithStaff[]>({
    queryKey: ["/api/staff/documents/expired"],
  });

  // Fetch qualifications summary
  const { data: qualificationsSummary, isLoading: loadingQualifications } = useQuery<QualificationsSummary>({
    queryKey: ["/api/staff/qualifications/summary"],
    queryFn: async () => {
      const res = await fetch("/api/staff/qualifications/summary", { credentials: "include" });
      if (!res.ok) {
        // Return default values if endpoint doesn't exist yet
        return { total: 0, current: 0, expiringSoon: 0, expired: 0, pendingRenewal: 0, recentExpiring: [] };
      }
      return res.json();
    },
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

  const totalProviders = gps.length + pharmacies.length + alliedHealth.length + planManagers.length + supportCoordinators.length;

  const clientsWithCareTeam = clients.filter(c => 
    c.careTeam?.generalPractitioner || 
    c.careTeam?.careManagerId || 
    c.careTeam?.supportCoordinatorId || 
    c.careTeam?.planManagerId ||
    c.careTeam?.alliedHealthProfessionalId ||
    c.generalPractitionerId ||
    c.pharmacyId
  ).length;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">Care Team Directory</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage all healthcare providers and external services</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Users className="w-4 h-4 mr-1" />
            {totalProviders} Providers
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            {clientsWithCareTeam} Clients Linked
          </Badge>
        </div>
      </div>

      {/* Staff Document Review Section */}
      {(pendingDocuments.length > 0 || expiredDocuments.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <FileCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Staff Document Review</CardTitle>
                  <CardDescription>Documents requiring attention across all staff</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingDocuments.length > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {pendingDocuments.length} Pending
                  </Badge>
                )}
                {expiredDocuments.length > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {expiredDocuments.length} Expired
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs value={documentReviewTab} onValueChange={(v) => setDocumentReviewTab(v as "pending" | "expired")}>
              <TabsList className="mb-3">
                <TabsTrigger value="pending" className="gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pending Review ({pendingDocuments.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Expired ({expiredDocuments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-2 mt-0">
                {loadingPending ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingDocuments.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">All documents are reviewed</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {pendingDocuments.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {doc.staffName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "ST"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/staff/${doc.staffId}`}>
                                <span className="font-medium text-sm hover:underline cursor-pointer">
                                  {doc.staffName || "Unknown Staff"}
                                </span>
                              </Link>
                              <Badge variant="secondary" className="text-xs">
                                {formatDocumentType(doc.documentType as StaffDocumentType)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
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
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button size="sm" onClick={() => handleReviewDocument(doc)}>
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingDocuments.length > 5 && (
                      <Link href="/staff-document-review">
                        <Button variant="ghost" className="w-full text-sm text-primary hover:text-primary/80">
                          View all {pendingDocuments.length} pending documents
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="expired" className="space-y-2 mt-0">
                {loadingExpired ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : expiredDocuments.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">No expired documents</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {expiredDocuments.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {doc.staffName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "ST"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/staff/${doc.staffId}`}>
                                <span className="font-medium text-sm hover:underline cursor-pointer">
                                  {doc.staffName || "Unknown Staff"}
                                </span>
                              </Link>
                              <Badge variant="destructive" className="text-xs">
                                {formatDocumentType(doc.documentType as StaffDocumentType)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-red-600 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Expired: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("en-AU") : "N/A"}
                            </div>
                          </div>
                        </div>
                        <Link href={`/staff/${doc.staffId}`}>
                          <Button size="sm" variant="outline">
                            <User className="w-4 h-4 mr-1" /> View Staff
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {expiredDocuments.length > 5 && (
                      <Link href="/staff-document-review">
                        <Button variant="ghost" className="w-full text-sm text-red-600 hover:text-red-700">
                          View all {expiredDocuments.length} expired documents
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Staff Qualifications Overview */}
      {qualificationsSummary && (qualificationsSummary.expiringSoon > 0 || qualificationsSummary.expired > 0) && (
        <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Staff Qualifications</CardTitle>
                  <CardDescription>Certifications and training status overview</CardDescription>
                </div>
              </div>
              <Link href="/staff-qualifications">
                <Button variant="outline" size="sm">
                  Manage All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-background rounded-lg border text-center">
                <div className="text-2xl font-bold text-green-600">{qualificationsSummary.current}</div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <div className="text-2xl font-bold text-yellow-600">{qualificationsSummary.expiringSoon}</div>
                <div className="text-xs text-muted-foreground">Expiring Soon</div>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <div className="text-2xl font-bold text-red-600">{qualificationsSummary.expired}</div>
                <div className="text-xs text-muted-foreground">Expired</div>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <div className="text-2xl font-bold text-orange-600">{qualificationsSummary.pendingRenewal}</div>
                <div className="text-xs text-muted-foreground">Pending Renewal</div>
              </div>
            </div>

            {qualificationsSummary.recentExpiring.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expiring Soon</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {qualificationsSummary.recentExpiring.slice(0, 5).map((qual) => {
                    const daysUntilExpiry = qual.expiryDate
                      ? Math.floor((new Date(qual.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    return (
                      <div key={qual.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {qual.staffName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "ST"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{qual.staffName || "Unknown Staff"}</span>
                              <Badge variant="outline" className="text-xs">{qual.qualificationName}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {qual.expiryDate && (
                                <span className={`flex items-center gap-1 ${daysUntilExpiry !== null && daysUntilExpiry <= 14 ? "text-red-600" : "text-yellow-600"}`}>
                                  <Clock className="w-3 h-3" />
                                  {daysUntilExpiry !== null && daysUntilExpiry > 0
                                    ? `${daysUntilExpiry} days left`
                                    : daysUntilExpiry === 0
                                    ? "Expires today"
                                    : "Expired"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link href={`/staff/${qual.staffId}`}>
                          <Button size="sm" variant="outline">
                            <User className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProviderTile
          title="Staff"
          description="Internal care workers"
          icon={UserCog}
          iconColor="text-cyan-600"
          bgColor="bg-cyan-100 dark:bg-cyan-900/30"
          count={staff.length}
          href="/staff"
          isLoading={isLoadingStaff}
          recentItems={staff.slice(-3).reverse().map(s => ({
            id: s.id,
            name: s.name,
            subtitle: s.role || undefined
          }))}
        />

        <ProviderTile
          title="Support Coordinators"
          description="NDIS support coordination"
          icon={Building2}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-100 dark:bg-indigo-900/30"
          count={supportCoordinators.length}
          href="/support-coordinators"
          isLoading={isLoadingSupportCoordinators}
          recentItems={supportCoordinators.slice(-3).reverse().map(sc => ({
            id: sc.id,
            name: sc.name,
            subtitle: sc.organisation || undefined
          }))}
        />

        <ProviderTile
          title="Plan Managers"
          description="NDIS plan management"
          icon={Briefcase}
          iconColor="text-pink-600"
          bgColor="bg-pink-100 dark:bg-pink-900/30"
          count={planManagers.length}
          href="/plan-managers"
          isLoading={isLoadingPlanManagers}
          recentItems={planManagers.slice(-3).reverse().map(pm => ({
            id: pm.id,
            name: pm.name,
            subtitle: pm.organisation || undefined
          }))}
        />

        <ProviderTile
          title="Allied Health"
          description="Therapists and specialists"
          icon={HeartPulse}
          iconColor="text-violet-600"
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          count={alliedHealth.length}
          href="/allied-health-professionals"
          isLoading={isLoadingAlliedHealth}
          recentItems={alliedHealth.slice(-3).reverse().map(ah => ({
            id: ah.id,
            name: ah.name,
            subtitle: ah.specialty
          }))}
        />

        <ProviderTile
          title="General Practitioners"
          description="Doctors and medical practices"
          icon={Stethoscope}
          iconColor="text-rose-600"
          bgColor="bg-rose-100 dark:bg-rose-900/30"
          count={gps.length}
          href="/gps"
          isLoading={isLoadingGPs}
          recentItems={gps.slice(-3).reverse().map(gp => ({
            id: gp.id,
            name: gp.name,
            subtitle: gp.practiceName || undefined
          }))}
        />

        <ProviderTile
          title="Pharmacies"
          description="Medication dispensaries"
          icon={Pill}
          iconColor="text-teal-600"
          bgColor="bg-teal-100 dark:bg-teal-900/30"
          count={pharmacies.length}
          href="/pharmacies"
          isLoading={isLoadingPharmacies}
          recentItems={pharmacies.slice(-3).reverse().map(p => ({
            id: p.id,
            name: p.name,
            subtitle: p.deliveryAvailable === "yes" ? "Delivery Available" : undefined
          }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/gps">
              <Button variant="outline" size="sm" data-testid="button-quick-gps">
                <Plus className="w-4 h-4 mr-1" />
                Add GP
              </Button>
            </Link>
            <Link href="/pharmacies">
              <Button variant="outline" size="sm" data-testid="button-quick-pharmacies">
                <Plus className="w-4 h-4 mr-1" />
                Add Pharmacy
              </Button>
            </Link>
            <Link href="/allied-health-professionals">
              <Button variant="outline" size="sm" data-testid="button-quick-allied-health">
                <Plus className="w-4 h-4 mr-1" />
                Add Allied Health
              </Button>
            </Link>
            <Link href="/plan-managers">
              <Button variant="outline" size="sm" data-testid="button-quick-plan-managers">
                <Plus className="w-4 h-4 mr-1" />
                Add Plan Manager
              </Button>
            </Link>
            <Link href="/support-coordinators">
              <Button variant="outline" size="sm" data-testid="button-quick-support-coordinators">
                <Plus className="w-4 h-4 mr-1" />
                Add Support Coordinator
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Document Review Dialog */}
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
