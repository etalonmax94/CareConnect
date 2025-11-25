import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CategoryBadge from "@/components/CategoryBadge";
import DocumentTracker from "@/components/DocumentTracker";
import { ArchiveClientModal } from "@/components/ArchiveClientModal";
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Loader2, FileText, ExternalLink, DollarSign, Clock, Bell, MessageSquare, PhoneCall, Archive, RotateCcw, AlertTriangle, Heart, HeartOff, Plus, UserCircle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Budget, ProgressNote, Staff, ClientStaffAssignment, IncidentReport } from "@shared/schema";
import { calculateAge } from "@shared/schema";

function NotificationBadge({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    SMS: <MessageSquare className="w-3 h-3" />,
    Call: <PhoneCall className="w-3 h-3" />,
    Email: <Mail className="w-3 h-3" />,
    "N/A": <Bell className="w-3 h-3 opacity-50" />,
  };
  
  return (
    <Badge variant="outline" className="gap-1">
      {icons[type] || <Bell className="w-3 h-3" />}
      {type}
    </Badge>
  );
}

interface NotificationPreferencesType {
  smsArrival?: boolean;
  smsSchedule?: boolean;
  callArrival?: boolean;
  callSchedule?: boolean;
  none?: boolean;
}

function NotificationPreferencesBadges({ preferences }: { preferences?: NotificationPreferencesType }) {
  if (!preferences || Object.keys(preferences).length === 0) {
    return <Badge variant="outline" className="gap-1 text-muted-foreground"><Bell className="w-3 h-3 opacity-50" />Not set</Badge>;
  }
  
  if (preferences.none) {
    return <Badge variant="outline" className="gap-1 text-muted-foreground"><Bell className="w-3 h-3 opacity-50" />N/A</Badge>;
  }
  
  const badges = [];
  
  if (preferences.smsSchedule) {
    badges.push(
      <Badge key="sms-schedule" variant="outline" className="gap-1">
        <MessageSquare className="w-3 h-3" />
        SMS Schedule
      </Badge>
    );
  }
  
  if (preferences.smsArrival) {
    badges.push(
      <Badge key="sms-arrival" variant="outline" className="gap-1">
        <MessageSquare className="w-3 h-3" />
        SMS Arrival
      </Badge>
    );
  }
  
  if (preferences.callSchedule) {
    badges.push(
      <Badge key="call-schedule" variant="outline" className="gap-1">
        <PhoneCall className="w-3 h-3" />
        Call Schedule
      </Badge>
    );
  }
  
  if (preferences.callArrival) {
    badges.push(
      <Badge key="call-arrival" variant="outline" className="gap-1">
        <PhoneCall className="w-3 h-3" />
        Call Arrival
      </Badge>
    );
  }
  
  if (badges.length === 0) {
    return <Badge variant="outline" className="gap-1 text-muted-foreground"><Bell className="w-3 h-3 opacity-50" />Not set</Badge>;
  }
  
  return <div className="flex flex-wrap gap-1">{badges}</div>;
}

interface DistanceData {
  clientId: string;
  address: string | null;
  distanceKm: number | null;
  officeAddress: string;
}

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", params?.id],
    enabled: !!params?.id,
  });

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ["/api/budgets", params?.id],
    enabled: !!params?.id,
  });

  const { data: distanceData } = useQuery<DistanceData>({
    queryKey: [`/api/clients/${params?.id}/distance`],
    enabled: !!params?.id,
  });

  const { data: progressNotes = [] } = useQuery<ProgressNote[]>({
    queryKey: ["/api/clients", params?.id, "notes"],
    enabled: !!params?.id,
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: staffAssignments = [] } = useQuery<ClientStaffAssignment[]>({
    queryKey: ["/api/clients", params?.id, "assignments"],
    enabled: !!params?.id,
  });

  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false);
  const [assignmentStaffId, setAssignmentStaffId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"primary_support" | "secondary_support" | "care_manager" | "clinical_nurse">("primary_support");

  const addAssignmentMutation = useMutation({
    mutationFn: async (data: { staffId: string; assignmentType: string }) => {
      return apiRequest("POST", `/api/clients/${params?.id}/assignments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "assignments"] });
      setAddAssignmentOpen(false);
      setAssignmentStaffId("");
      setAssignmentType("primary_support");
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return apiRequest("DELETE", `/api/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "assignments"] });
    },
  });

  const { data: incidentReports = [] } = useQuery<IncidentReport[]>({
    queryKey: [`/api/incidents/client/${params?.id}`],
    enabled: !!params?.id,
  });

  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<"progress" | "clinical" | "incident" | "complaint" | "feedback">("progress");
  const [noteAuthorId, setNoteAuthorId] = useState("");

  const [addIncidentOpen, setAddIncidentOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<"fall" | "medication" | "behavioral" | "injury" | "other">("fall");
  const [incidentSeverity, setIncidentSeverity] = useState<"low" | "medium" | "high" | "critical">("low");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentActionTaken, setIncidentActionTaken] = useState("");
  const [incidentReporterId, setIncidentReporterId] = useState("");

  const addIncidentMutation = useMutation({
    mutationFn: async (data: { 
      clientId: string;
      incidentDate: string; 
      incidentType: string; 
      severity: string;
      description: string;
      actionTaken?: string;
      reportedBy: string;
      reportedById?: string;
    }) => {
      return apiRequest("POST", "/api/incidents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/client/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      setAddIncidentOpen(false);
      setIncidentType("fall");
      setIncidentSeverity("low");
      setIncidentDescription("");
      setIncidentActionTaken("");
      setIncidentReporterId("");
    },
  });

  const handleAddIncident = () => {
    if (!incidentDescription.trim() || !incidentReporterId) return;
    const reporter = staffList.find(s => s.id === incidentReporterId);
    addIncidentMutation.mutate({
      clientId: params?.id || "",
      incidentDate: new Date().toISOString(),
      incidentType,
      severity: incidentSeverity,
      description: incidentDescription,
      actionTaken: incidentActionTaken || undefined,
      reportedBy: reporter ? reporter.name : "Unknown",
      reportedById: incidentReporterId,
    });
  };

  const addNoteMutation = useMutation({
    mutationFn: async (data: { note: string; type: string; author: string; authorId?: string }) => {
      return apiRequest("POST", `/api/clients/${params?.id}/notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "notes"] });
      setAddNoteOpen(false);
      setNoteContent("");
      setNoteType("progress");
      setNoteAuthorId("");
    },
  });

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    const author = staffList.find(s => s.id === noteAuthorId);
    addNoteMutation.mutate({
      note: noteContent,
      type: noteType,
      author: author ? author.name : "Unknown Staff",
      authorId: noteAuthorId || undefined,
    });
  };

  const restoreMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/clients/${params?.id}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id] });
      toast({
        title: "Client restored",
        description: "Client has been restored from archive successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore client",
        variant: "destructive",
      });
    },
  });

  const isArchived = client?.isArchived === "yes";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">Client not found</p>
          <Link href="/clients">
            <Button variant="ghost" className="mt-2">Back to Clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const clientAge = calculateAge(client.dateOfBirth);
  
  const totalBudget = budgets?.reduce((sum, b) => sum + parseFloat(b.totalAllocated || "0"), 0) || 0;
  const usedBudget = budgets?.reduce((sum, b) => sum + parseFloat(b.used || "0"), 0) || 0;
  const remainingBudget = totalBudget - usedBudget;
  const budgetPercentage = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Client Profile</h1>
          {isArchived && (
            <Badge variant="secondary" className="mt-1 gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <Archive className="w-3 h-3" />
              Archived
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isArchived ? (
            <Button 
              onClick={() => restoreMutation.mutate()}
              disabled={restoreMutation.isPending}
              data-testid="button-restore-client"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {restoreMutation.isPending ? "Restoring..." : "Restore Client"}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={() => setArchiveModalOpen(true)}
                data-testid="button-archive-client"
                className="gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Button>
              <Link href={`/clients/${params?.id}/edit`}>
                <Button data-testid="button-edit-client">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This client record is archived and read-only. Archived on: {client.archivedAt ? new Date(client.archivedAt).toLocaleDateString() : 'Unknown'}. 
            Reason: {client.archiveReason || 'Not specified'}. 
            Records retained until: {client.retentionUntil || 'N/A'}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={client.photo || undefined} alt={client.participantName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(client.participantName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{client.participantName}</h2>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={client.category} />
                      {clientAge && (
                        <Badge variant="secondary" className="gap-1">
                          <Calendar className="w-3 h-3" />
                          {clientAge} years old
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">ID:</span> {client.ndisDetails?.ndisNumber || client.supportAtHomeDetails?.hcpNumber || client.medicareNumber || "N/A"}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 p-4 bg-muted/50 rounded-lg">
                  {client.phoneNumber && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <a href={`tel:${client.phoneNumber}`} className="text-sm font-medium hover:text-primary">
                          {client.phoneNumber}
                        </a>
                      </div>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a 
                          href={`mailto:${client.email}`} 
                          className="text-sm font-medium hover:text-primary block truncate"
                          title={client.email}
                          data-testid="text-client-email"
                        >
                          {client.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {client.homeAddress && (
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">{client.homeAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {client.zohoWorkdriveLink && (
                  <a 
                    href={client.zohoWorkdriveLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    data-testid="link-zoho-workdrive"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Open Document Folder</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">${remainingBudget.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Available Balance</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">${usedBudget.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${budgetPercentage > 80 ? 'bg-red-500' : budgetPercentage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Allocated</span>
                <span className="font-medium">${totalBudget.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequency of Services</p>
                <p className="text-sm font-medium">{client.frequencyOfServices || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Preferred Hours</p>
                <p className="text-sm font-medium">{client.summaryOfServices?.includes("Morning") ? "Morning" : client.summaryOfServices?.includes("Afternoon") ? "Afternoon" : "Flexible"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Notification Preferences</p>
                <div className="mt-1" data-testid="notification-preferences">
                  <NotificationPreferencesBadges preferences={client.notificationPreferences as NotificationPreferencesType} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {client.homeAddress && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted rounded-lg overflow-hidden relative">
              <iframe
                title="Client Location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(client.homeAddress)}`}
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-muted-foreground">{client.homeAddress}</p>
              {distanceData?.distanceKm !== null && distanceData?.distanceKm !== undefined && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 flex-shrink-0"
                  data-testid="badge-distance"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {distanceData.distanceKm} km from office
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="details" data-testid="tab-details">Personal Details</TabsTrigger>
          <TabsTrigger value="program" data-testid="tab-program">Program Info</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Care Team</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="clinical" data-testid="tab-clinical">Clinical Notes</TabsTrigger>
          <TabsTrigger value="budget" data-testid="tab-budget">Budget Details</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-sm mt-1">{client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('en-AU') : "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Age</p>
                    <p className="text-sm mt-1">{clientAge ? `${clientAge} years` : "Not provided"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medicare Number</p>
                  <p className="text-sm mt-1 font-mono">{client.medicareNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next of Kin / EPOA</p>
                  <p className="text-sm mt-1">{client.nokEpoa || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Frequency of Services</p>
                  <p className="text-sm mt-1">{client.frequencyOfServices || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notification Preferences</p>
                  <div className="mt-1">
                    <NotificationPreferencesBadges preferences={client.notificationPreferences as NotificationPreferencesType} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Communication Needs</p>
                  <p className="text-sm mt-1">{client.communicationNeeds || "No special needs"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clinical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Main Diagnosis</p>
                  <p className="text-sm mt-1">{client.mainDiagnosis || "Not provided"}</p>
                </div>
                {client.allergies && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      ALLERGIES
                    </p>
                    <p className="text-sm mt-1 font-bold text-red-600 dark:text-red-300" data-testid="text-allergies">
                      {client.allergies}
                    </p>
                  </div>
                )}

                {/* Advanced Care Directive - Critical Clinical Safety */}
                <div className={`p-3 rounded-lg border ${
                  client.advancedCareDirective === "NFR" 
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                    : client.advancedCareDirective === "For Resus"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-muted/50 border-border"
                }`}>
                  <p className={`text-sm font-bold flex items-center gap-2 ${
                    client.advancedCareDirective === "NFR"
                      ? "text-purple-700 dark:text-purple-400"
                      : client.advancedCareDirective === "For Resus"
                      ? "text-green-700 dark:text-green-400"
                      : "text-muted-foreground"
                  }`}>
                    {client.advancedCareDirective === "NFR" ? (
                      <HeartOff className="w-4 h-4" />
                    ) : client.advancedCareDirective === "For Resus" ? (
                      <Heart className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    ADVANCED CARE DIRECTIVE
                  </p>
                  <p className={`text-sm mt-1 font-bold ${
                    client.advancedCareDirective === "NFR"
                      ? "text-purple-600 dark:text-purple-300"
                      : client.advancedCareDirective === "For Resus"
                      ? "text-green-600 dark:text-green-300"
                      : "text-muted-foreground"
                  }`} data-testid="text-acd">
                    {client.advancedCareDirective === "NFR" 
                      ? "NFR - Not For Resuscitation"
                      : client.advancedCareDirective === "For Resus"
                      ? "For Resus - For Resuscitation"
                      : "Not Specified"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary of Services</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{client.summaryOfServices || "No summary provided"}</p>
              </CardContent>
            </Card>

            {client.highIntensitySupports && client.highIntensitySupports.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">High Intensity Supports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.highIntensitySupports.map((support, index) => (
                      <Badge key={index} variant="secondary">{support}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="program" className="space-y-6">
          {client.category === "NDIS" && client.ndisDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">NDIS Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">NDIS Number</p>
                  <p className="text-sm mt-1 font-mono">{client.ndisDetails.ndisNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Funding Type</p>
                  <p className="text-sm mt-1">{client.ndisDetails.ndisFundingType || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan Start Date</p>
                  <p className="text-sm mt-1">{client.ndisDetails.ndisPlanStartDate ? new Date(client.ndisDetails.ndisPlanStartDate).toLocaleDateString('en-AU') : "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan End Date</p>
                  <p className="text-sm mt-1">{client.ndisDetails.ndisPlanEndDate ? new Date(client.ndisDetails.ndisPlanEndDate).toLocaleDateString('en-AU') : "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Schedule of Supports / Budget</p>
                  <p className="text-sm mt-1">{client.ndisDetails.scheduleOfSupports || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {client.category === "Support at Home" && client.supportAtHomeDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support at Home (HCP) Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">HCP Number</p>
                  <p className="text-sm mt-1 font-mono">{client.supportAtHomeDetails.hcpNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">HCP Funding Level</p>
                  <p className="text-sm mt-1">{client.supportAtHomeDetails.hcpFundingLevel || "Not specified"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Schedule of Supports</p>
                  <p className="text-sm mt-1">{client.supportAtHomeDetails.scheduleOfSupports || "Not specified"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {client.category === "Private" && client.privateClientDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Private Client Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="text-sm mt-1">{client.privateClientDetails.paymentMethod || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Rates</p>
                  <p className="text-sm mt-1">{client.privateClientDetails.serviceRates || "Not specified"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Billing Preferences</p>
                  <p className="text-sm mt-1">{client.privateClientDetails.billingPreferences || "Not specified"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!client.ndisDetails && !client.supportAtHomeDetails && !client.privateClientDetails && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No program information available for this client.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Primary Care Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.careTeam?.careManager && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{client.careTeam.careManager.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.careTeam.careManager}</p>
                      <p className="text-xs text-muted-foreground">Care Manager</p>
                    </div>
                  </div>
                )}
                {client.careTeam?.leadership && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{client.careTeam.leadership.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.careTeam.leadership}</p>
                      <p className="text-xs text-muted-foreground">Leadership</p>
                    </div>
                  </div>
                )}
                {client.careTeam?.generalPractitioner && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{client.careTeam.generalPractitioner.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.careTeam.generalPractitioner}</p>
                      <p className="text-xs text-muted-foreground">General Practitioner</p>
                    </div>
                  </div>
                )}
                {!client.careTeam?.careManager && !client.careTeam?.leadership && !client.careTeam?.generalPractitioner && (
                  <p className="text-sm text-muted-foreground text-center py-4">No primary care team assigned</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support Coordination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.careTeam?.supportCoordinator && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{client.careTeam.supportCoordinator.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.careTeam.supportCoordinator}</p>
                      <p className="text-xs text-muted-foreground">Support Coordinator</p>
                    </div>
                  </div>
                )}
                {client.careTeam?.planManager && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{client.careTeam.planManager.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.careTeam.planManager}</p>
                      <p className="text-xs text-muted-foreground">Plan Manager</p>
                    </div>
                  </div>
                )}
                {!client.careTeam?.supportCoordinator && !client.careTeam?.planManager && (
                  <p className="text-sm text-muted-foreground text-center py-4">No support coordination assigned</p>
                )}
              </CardContent>
            </Card>

            {client.careTeam?.otherHealthProfessionals && client.careTeam.otherHealthProfessionals.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Allied Health Professionals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {client.careTeam.otherHealthProfessionals.map((professional, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{professional.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{professional}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Staff Assignments
                  </CardTitle>
                  {!isArchived && (
                    <Dialog open={addAssignmentOpen} onOpenChange={setAddAssignmentOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-assignment">
                          <Plus className="w-4 h-4 mr-1" />
                          Assign Staff
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Staff Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Staff Member</Label>
                            <Select value={assignmentStaffId} onValueChange={setAssignmentStaffId}>
                              <SelectTrigger data-testid="select-assignment-staff">
                                <SelectValue placeholder="Select staff member..." />
                              </SelectTrigger>
                              <SelectContent>
                                {staffList.filter(s => !staffAssignments.some(a => a.staffId === s.id && !a.endDate)).map(staff => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name} ({staff.role.replace("_", " ")})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Assignment Type</Label>
                            <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as typeof assignmentType)}>
                              <SelectTrigger data-testid="select-assignment-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="primary_support">Primary Support Worker</SelectItem>
                                <SelectItem value="secondary_support">Secondary Support Worker</SelectItem>
                                <SelectItem value="care_manager">Care Manager</SelectItem>
                                <SelectItem value="clinical_nurse">Clinical Nurse</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={() => addAssignmentMutation.mutate({ staffId: assignmentStaffId, assignmentType })}
                            disabled={!assignmentStaffId || addAssignmentMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-assignment"
                          >
                            {addAssignmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Assign Staff
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {staffAssignments.filter(a => !a.endDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No staff currently assigned</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {staffAssignments.filter(a => !a.endDate).map(assignment => {
                      const staff = staffList.find(s => s.id === assignment.staffId);
                      const typeLabels: Record<string, string> = {
                        primary_support: "Primary Support Worker",
                        secondary_support: "Secondary Support Worker",
                        care_manager: "Care Manager",
                        clinical_nurse: "Clinical Nurse",
                      };
                      return (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`assignment-${assignment.id}`}>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>{staff?.name?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link href={`/staff/${assignment.staffId}`}>
                                <p className="text-sm font-medium hover:underline cursor-pointer">{staff?.name || "Unknown"}</p>
                              </Link>
                              <p className="text-xs text-muted-foreground">{typeLabels[assignment.assignmentType] || assignment.assignmentType}</p>
                              <p className="text-xs text-muted-foreground">Since {new Date(assignment.startDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {!isArchived && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                              data-testid={`button-remove-assignment-${assignment.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentTracker 
            documents={client.clinicalDocuments} 
            clientId={client.id}
            zohoWorkdriveLink={client.zohoWorkdriveLink}
          />
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{client.clinicalNotes || "No clinical notes recorded"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Progress Notes</CardTitle>
                {!isArchived && (
                  <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-progress-note">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Progress Note</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Note Type</Label>
                          <Select value={noteType} onValueChange={(v) => setNoteType(v as typeof noteType)}>
                            <SelectTrigger data-testid="select-note-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="progress">Progress</SelectItem>
                              <SelectItem value="clinical">Clinical</SelectItem>
                              <SelectItem value="incident">Incident</SelectItem>
                              <SelectItem value="complaint">Complaint</SelectItem>
                              <SelectItem value="feedback">Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Author (Staff Member)</Label>
                          <Select value={noteAuthorId} onValueChange={setNoteAuthorId}>
                            <SelectTrigger data-testid="select-note-author">
                              <SelectValue placeholder="Select staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map(staff => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.name} ({staff.role.replace("_", " ")})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Note Content</Label>
                          <Textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Enter note content..."
                            rows={4}
                            data-testid="textarea-note-content"
                          />
                        </div>
                        <Button 
                          onClick={handleAddNote}
                          disabled={!noteContent.trim() || !noteAuthorId || addNoteMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-note"
                        >
                          {addNoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save Note
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No progress notes recorded yet</p>
                ) : (
                  progressNotes.map((note) => {
                    const noteAuthor = note.authorId ? staffList.find(s => s.id === note.authorId) : null;
                    const typeColors: Record<string, string> = {
                      progress: "border-primary",
                      clinical: "border-blue-500",
                      incident: "border-red-500",
                      complaint: "border-amber-500",
                      feedback: "border-green-500",
                    };
                    return (
                      <div 
                        key={note.id} 
                        className={`border-l-2 ${typeColors[note.type] || "border-muted"} pl-4 py-2`}
                        data-testid={`progress-note-${note.id}`}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{note.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(note.date).toLocaleDateString()} at {new Date(note.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <p className="text-sm">{note.note}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <UserCircle className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            By: {noteAuthor ? (
                              <Link href={`/staff/${noteAuthor.id}`} className="hover:underline text-primary">
                                {noteAuthor.name}
                              </Link>
                            ) : note.author}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Incident Reports
                </CardTitle>
                {!isArchived && (
                  <Dialog open={addIncidentOpen} onOpenChange={setAddIncidentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive" data-testid="button-add-incident">
                        <Plus className="w-4 h-4 mr-1" />
                        Report Incident
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report Incident</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Incident Type</Label>
                            <Select value={incidentType} onValueChange={(v) => setIncidentType(v as typeof incidentType)}>
                              <SelectTrigger data-testid="select-incident-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fall">Fall</SelectItem>
                                <SelectItem value="medication">Medication</SelectItem>
                                <SelectItem value="behavioral">Behavioral</SelectItem>
                                <SelectItem value="injury">Injury</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Severity</Label>
                            <Select value={incidentSeverity} onValueChange={(v) => setIncidentSeverity(v as typeof incidentSeverity)}>
                              <SelectTrigger data-testid="select-incident-severity">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Reported By (Staff Member)</Label>
                          <Select value={incidentReporterId} onValueChange={setIncidentReporterId}>
                            <SelectTrigger data-testid="select-incident-reporter">
                              <SelectValue placeholder="Select staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map(staff => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.name} ({staff.role.replace("_", " ")})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={incidentDescription}
                            onChange={(e) => setIncidentDescription(e.target.value)}
                            placeholder="Describe the incident..."
                            rows={3}
                            data-testid="textarea-incident-description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Action Taken (Optional)</Label>
                          <Textarea
                            value={incidentActionTaken}
                            onChange={(e) => setIncidentActionTaken(e.target.value)}
                            placeholder="What action was taken?"
                            rows={2}
                            data-testid="textarea-incident-action"
                          />
                        </div>
                        <Button 
                          onClick={handleAddIncident}
                          disabled={!incidentDescription.trim() || !incidentReporterId || addIncidentMutation.isPending}
                          variant="destructive"
                          className="w-full"
                          data-testid="button-submit-incident"
                        >
                          {addIncidentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Submit Report
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidentReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No incidents reported for this client</p>
                ) : (
                  incidentReports.map((incident) => {
                    const reporter = incident.reportedById ? staffList.find(s => s.id === incident.reportedById) : null;
                    const severityColors: Record<string, string> = {
                      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
                      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
                      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
                    };
                    const statusColors: Record<string, string> = {
                      open: "bg-red-100 text-red-800",
                      investigating: "bg-amber-100 text-amber-800",
                      resolved: "bg-blue-100 text-blue-800",
                      closed: "bg-gray-100 text-gray-800",
                    };
                    return (
                      <div 
                        key={incident.id} 
                        className="p-4 border rounded-lg space-y-2"
                        data-testid={`incident-${incident.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className={severityColors[incident.severity] || ""}>
                              {incident.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="capitalize">{incident.incidentType}</Badge>
                            <Badge className={statusColors[incident.status] || ""}>{incident.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(incident.incidentDate).toLocaleDateString()} at {new Date(incident.incidentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <p className="text-sm">{incident.description}</p>
                        {incident.actionTaken && (
                          <div className="bg-muted p-2 rounded text-xs">
                            <span className="font-medium">Action Taken: </span>
                            {incident.actionTaken}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <UserCircle className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Reported by: {reporter ? (
                              <Link href={`/staff/${reporter.id}`} className="hover:underline text-primary">
                                {reporter.name}
                              </Link>
                            ) : incident.reportedBy}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Total Allocated</p>
                <p className="text-2xl font-bold text-primary">${totalBudget.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Used</p>
                <p className="text-2xl font-bold">${usedBudget.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ${remainingBudget.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {budgets && budgets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgets.map((budget) => {
                    const allocated = parseFloat(budget.totalAllocated || "0");
                    const used = parseFloat(budget.used || "0");
                    const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
                    return (
                      <div key={budget.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{budget.category}</span>
                          <span className="text-sm text-muted-foreground">
                            ${used.toLocaleString()} / ${allocated.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No budget allocations recorded for this client.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {client && (
        <ArchiveClientModal
          client={client}
          open={archiveModalOpen}
          onOpenChange={setArchiveModalOpen}
          onSuccess={() => setLocation("/clients")}
        />
      )}
    </div>
  );
}
