import { useState, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CategoryBadge from "@/components/CategoryBadge";
import DocumentTracker from "@/components/DocumentTracker";
import { ArchiveClientModal } from "@/components/ArchiveClientModal";
import { ServiceScheduleModal } from "@/components/ServiceScheduleModal";
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Loader2, FileText, ExternalLink, DollarSign, Clock, Bell, MessageSquare, PhoneCall, Archive, RotateCcw, AlertTriangle, Heart, HeartOff, Plus, UserCircle, Trash2, Target, Shield, CheckCircle, Sparkles, TrendingUp, Pencil, Copy, Users, ClipboardCheck, Stethoscope, AlertCircle, Briefcase, UserCog, Building2, CreditCard, FileWarning, CalendarDays, Car, Pill, Activity, Navigation, Settings, BookOpen, UserPlus, FileCheck, Camera, Eye, Download, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Client, Budget, ProgressNote, Staff, ClientStaffAssignment, IncidentReport, ClientGoal, ServiceDelivery, GP, Pharmacy, ClientContact, Document } from "@shared/schema";
import { calculateAge, formatClientNumber } from "@shared/schema";
import ClientLocationMap from "@/components/ClientLocationMap";
import CarePlanTab from "@/components/CarePlanTab";

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

type ProfileSection = "overview" | "details" | "program" | "team" | "goals" | "documents" | "clinical" | "services" | "budget" | "careplan";

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
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

  // Fetch GP details if client has a GP assigned
  const { data: gpDetails } = useQuery<GP>({
    queryKey: ["/api/gps", client?.generalPractitionerId],
    enabled: !!client?.generalPractitionerId,
  });

  // Fetch Pharmacy details if client has a pharmacy assigned
  const { data: pharmacyDetails } = useQuery<Pharmacy>({
    queryKey: ["/api/pharmacies", client?.pharmacyId],
    enabled: !!client?.pharmacyId,
  });

  // Fetch client contacts (NOK, emergency contacts, etc.)
  const { data: clientContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/clients", params?.id, "contacts"],
    enabled: !!params?.id,
  });

  // Fetch client documents to check for Service Agreement
  const { data: clientDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/clients", params?.id, "documents"],
    enabled: !!params?.id,
  });

  // Check if Service Agreement document exists
  const hasServiceAgreement = clientDocuments.some(
    doc => doc.documentType === "Service Agreement"
  );

  const { data: goals = [] } = useQuery<ClientGoal[]>({
    queryKey: ["/api/clients", params?.id, "goals"],
    enabled: !!params?.id,
  });

  const { data: serviceDeliveries = [] } = useQuery<ServiceDelivery[]>({
    queryKey: ["/api/clients", params?.id, "service-deliveries"],
    enabled: !!params?.id,
  });

  // Service delivery management state
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceBudgetId, setServiceBudgetId] = useState("");
  const [serviceStaffId, setServiceStaffId] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceDuration, setServiceDuration] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceRateType, setServiceRateType] = useState<"weekday" | "saturday" | "sunday" | "public_holiday" | "evening" | "night">("weekday");

  const addServiceMutation = useMutation({
    mutationFn: async (data: { 
      serviceName: string; 
      amount?: string; 
      budgetId?: string;
      staffId?: string;
      deliveredAt: string;
      durationMinutes?: string;
      notes?: string;
      rateType?: string;
      status: string;
    }) => {
      return apiRequest("POST", `/api/clients/${params?.id}/service-deliveries`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "service-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", params?.id] });
      setAddServiceOpen(false);
      resetServiceForm();
      toast({ title: "Service recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to record service", description: error?.message, variant: "destructive" });
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/service-deliveries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "service-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", params?.id] });
      toast({ title: "Service deleted" });
    },
  });

  const resetServiceForm = () => {
    setServiceName("");
    setServiceAmount("");
    setServiceBudgetId("");
    setServiceStaffId("");
    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceDuration("");
    setServiceNotes("");
    setServiceRateType("weekday");
  };

  // Goal management state
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalStatus, setGoalStatus] = useState<"not_started" | "in_progress" | "achieved" | "on_hold">("not_started");
  const [pendingGoalSubmission, setPendingGoalSubmission] = useState(false);

  const addGoalMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; targetDate?: string; status: string }) => {
      // Check current goal count from cache before submitting
      const cachedGoals = queryClient.getQueryData<ClientGoal[]>(["/api/clients", params?.id, "goals"]) || [];
      if (cachedGoals.length >= 5) {
        throw new Error("Maximum of 5 goals per client allowed");
      }
      return apiRequest("POST", `/api/clients/${params?.id}/goals`, data);
    },
    onMutate: () => {
      setPendingGoalSubmission(true);
    },
    onSettled: () => {
      setPendingGoalSubmission(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "goals"] });
      setAddGoalOpen(false);
      setGoalTitle("");
      setGoalDescription("");
      setGoalTargetDate("");
      setGoalStatus("not_started");
      toast({ title: "Goal added successfully" });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to add goal";
      if (message.includes("Maximum")) {
        toast({ title: "Maximum goals reached", description: "You can only have up to 5 goals per client. Delete an existing goal to add a new one.", variant: "destructive" });
      } else {
        toast({ title: "Failed to add goal", description: message, variant: "destructive" });
      }
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientGoal> }) => {
      return apiRequest("PATCH", `/api/goals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "goals"] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "goals"] });
      toast({ title: "Goal deleted" });
    },
  });

  // Budget management state
  const [addBudgetOpen, setAddBudgetOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAllocated, setBudgetAllocated] = useState("");
  const [budgetUsed, setBudgetUsed] = useState("0");
  const [budgetStartDate, setBudgetStartDate] = useState("");
  const [budgetEndDate, setBudgetEndDate] = useState("");

  const openEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetCategory(budget.category);
    setBudgetAllocated(budget.totalAllocated);
    setBudgetUsed(budget.used || "0");
    setBudgetStartDate(budget.startDate || "");
    setBudgetEndDate(budget.endDate || "");
    setEditBudgetOpen(true);
  };

  const closeEditBudget = () => {
    setEditBudgetOpen(false);
    setEditingBudget(null);
    setBudgetCategory("");
    setBudgetAllocated("");
    setBudgetUsed("0");
    setBudgetStartDate("");
    setBudgetEndDate("");
  };

  const addBudgetMutation = useMutation({
    mutationFn: async (data: { clientId: string; category: string; totalAllocated: string; used: string; startDate?: string; endDate?: string }) => {
      return apiRequest("POST", "/api/budgets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", params?.id] });
      setAddBudgetOpen(false);
      setBudgetCategory("");
      setBudgetAllocated("");
      setBudgetUsed("0");
      setBudgetStartDate("");
      setBudgetEndDate("");
      toast({ title: "Budget added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add budget", description: error.message, variant: "destructive" });
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Budget> }) => {
      return apiRequest("PATCH", `/api/budgets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", params?.id] });
      closeEditBudget();
      toast({ title: "Budget updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update budget", description: error.message, variant: "destructive" });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", params?.id] });
      toast({ title: "Budget removed" });
    },
  });

  // Onboarding mutation
  const onboardMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/clients/${params?.id}/onboard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client marked as onboarded" });
    },
  });

  // Photo upload
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      
      const response = await fetch(`/api/clients/${params?.id}/photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id] });
      toast({ title: "Photo uploaded successfully" });
      setIsUploadingPhoto(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to upload photo", description: error.message, variant: "destructive" });
      setIsUploadingPhoto(false);
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Photo must be under 5MB", variant: "destructive" });
        return;
      }
      setIsUploadingPhoto(true);
      uploadPhotoMutation.mutate(file);
    }
  };

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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast({ title: `${label} copied to clipboard` });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({ title: `${label} copied to clipboard` });
      }
    } catch (err) {
      toast({ title: `Failed to copy ${label}`, variant: "destructive" });
    }
  };

  const getNdisNumber = () => client.ndisDetails?.ndisNumber;
  const getHcpNumber = () => client.supportAtHomeDetails?.hcpNumber;
  const getSupportLevel = () => {
    const level = (client.ndisDetails as any)?.supportLevel;
    if (level) return level;
    return null;
  };

  const assignedStaffCount = staffAssignments?.filter(a => !a.endDate || new Date(a.endDate) > new Date()).length || 0;

  const sidebarItems: { id: ProfileSection; label: string; icon: any; badge?: string; badgeColor?: string }[] = [
    { id: "overview", label: "Overview", icon: User },
    { id: "details", label: "Personal Details", icon: UserCircle },
    { id: "program", label: "Program Info", icon: ClipboardCheck },
    { id: "team", label: "Care Team", icon: Users },
    { id: "goals", label: "Goals", icon: Target },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "clinical", label: "Clinical Notes", icon: Stethoscope },
    { id: "services", label: "Services", icon: Clock },
    { id: "budget", label: "Budget Details", icon: DollarSign, badge: totalBudget === 0 ? "Setup" : undefined, badgeColor: "text-amber-600" },
  ];

  return (
    <div className="h-full -m-4 sm:-m-6 flex flex-col">
      {/* Profile Header */}
      <div className="bg-card border-b px-3 sm:px-6 py-3 sm:py-5">
        <div className="flex items-start gap-2 sm:gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          
          <Dialog>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
              data-testid="input-photo-upload"
            />
            <DialogTrigger asChild>
              <div className="relative group cursor-pointer flex-shrink-0">
                <Avatar 
                  className="w-14 h-14 sm:w-24 sm:h-24 border-2 border-border rounded-xl overflow-hidden"
                  data-testid="avatar-client"
                >
                  <AvatarImage src={client.photo || undefined} alt={client.participantName} className="object-cover" />
                  <AvatarFallback className="text-lg sm:text-2xl bg-muted text-foreground font-bold rounded-xl">{getInitials(client.participantName)}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 text-white animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  )}
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Client Photo</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <Avatar className="w-48 h-48 rounded-xl overflow-hidden border-2 border-border">
                  <AvatarImage src={client.photo || undefined} alt={client.participantName} className="object-cover" />
                  <AvatarFallback className="text-5xl bg-muted text-foreground font-bold rounded-xl">{getInitials(client.participantName)}</AvatarFallback>
                </Avatar>
                <p className="text-lg font-semibold">{client.participantName}</p>
                <Button 
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="gap-2"
                  data-testid="button-change-photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {client.photo ? "Change Photo" : "Upload Photo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              {client.clientNumber && (
                <Badge variant="secondary" className="font-mono text-xs sm:text-sm h-5 sm:h-6 px-1.5 sm:px-2.5" data-testid="badge-client-number">
                  {formatClientNumber(client.clientNumber)}
                </Badge>
              )}
              <h1 className="text-lg sm:text-2xl font-bold truncate text-foreground">{client.participantName}</h1>
              <Badge variant={isArchived ? "secondary" : "default"} className={`h-5 sm:h-6 px-1.5 sm:px-2.5 text-xs ${isArchived ? "" : "bg-emerald-500 hover:bg-emerald-600 text-white border-0"}`}>
                {isArchived ? 'Archived' : 'Active'}
              </Badge>
              <CategoryBadge category={client.category} className="h-5 sm:h-6 px-1.5 sm:px-2.5 text-xs" />
              {client.category === "NDIS" && client.ndisDetails?.ndisFundingType && (
                <Badge 
                  className={`h-5 sm:h-6 px-1.5 sm:px-2.5 text-xs border-0 text-white hidden sm:inline-flex ${
                    client.ndisDetails.ndisFundingType === "Plan-Managed" ? "bg-[hsl(var(--ndis-plan-managed))]" :
                    client.ndisDetails.ndisFundingType === "Agency-Managed" ? "bg-[hsl(var(--ndis-agency-managed))]" :
                    client.ndisDetails.ndisFundingType === "Self-Managed" ? "bg-[hsl(var(--ndis-self-managed))]" :
                    "bg-slate-500"
                  }`}
                >
                  {client.ndisDetails.ndisFundingType}
                </Badge>
              )}
              {client.isOnboarded !== "yes" && !isArchived && (
                <Badge variant="secondary" className="h-5 sm:h-6 px-1.5 sm:px-2.5 text-xs">New</Badge>
              )}
            </div>
            
            {/* Quick Info Chips - Interactive - Hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:flex items-center gap-2 mt-3 flex-wrap">
              {clientAge && (
                <div 
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 cursor-pointer hover-elevate transition-colors"
                  onClick={() => setActiveSection("details")}
                  data-testid="chip-age"
                >
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">Age</p>
                    <p className="text-sm font-semibold text-foreground">{clientAge}</p>
                  </div>
                </div>
              )}
              
              {client.clientNumber && (
                <div 
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 cursor-pointer hover-elevate transition-colors"
                  onClick={() => setActiveSection("details")}
                  data-testid="chip-client-number"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">Client #</p>
                    <p className="text-sm font-semibold font-mono text-foreground">{formatClientNumber(client.clientNumber)}</p>
                  </div>
                </div>
              )}
              
              {client.category === "NDIS" && getNdisNumber() && (
                <div 
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 cursor-pointer hover-elevate transition-colors"
                  onClick={() => setActiveSection("program")}
                  data-testid="chip-ndis"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">NDIS</p>
                    <p className="text-sm font-semibold font-mono text-foreground">{getNdisNumber()}</p>
                  </div>
                </div>
              )}
              
              {client.category === "Support at Home" && getHcpNumber() && (
                <div 
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 cursor-pointer hover-elevate transition-colors"
                  onClick={() => setActiveSection("program")}
                  data-testid="chip-hcp"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">HCP</p>
                    <p className="text-sm font-semibold font-mono text-foreground">{getHcpNumber()}</p>
                  </div>
                </div>
              )}
              
              <div 
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 cursor-pointer hover-elevate transition-colors"
                onClick={() => setActiveSection("program")}
                data-testid="chip-category"
              >
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">Care Category</p>
                  <p className="text-sm font-semibold text-foreground">{client.category}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Hidden on mobile, shown as icons on tablet, full on desktop */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isArchived ? (
              <Button 
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                data-testid="button-restore-client"
                size="sm"
                className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{restoreMutation.isPending ? "Restoring..." : "Restore"}</span>
              </Button>
            ) : (
              <>
                <Link href={`/clients/${params?.id}/edit`}>
                  <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:gap-2 sm:px-3" data-testid="button-edit-client">
                    <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
                {hasServiceAgreement ? (
                  client.zohoWorkdriveLink ? (
                    <a href={client.zohoWorkdriveLink} target="_blank" rel="noopener noreferrer" data-testid="link-service-agreement">
                      <Button size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:gap-2 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden md:inline">Agreement</span>
                      </Button>
                    </a>
                  ) : (
                    <Button size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:gap-2 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="link-service-agreement-uploaded">
                      <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden md:inline">Agreement</span>
                    </Button>
                  )
                ) : (
                  <Button size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:gap-2 sm:px-3 bg-red-600 hover:bg-red-700 text-white" data-testid="link-service-agreement-missing">
                    <FileWarning className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden md:inline">Agreement</span>
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => {
                        window.location.href = `/api/clients/${params?.id}/vcf`;
                      }}
                      data-testid="button-download-contact"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="sr-only">Download iPhone contact file</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download iPhone contact file</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setArchiveModalOpen(true)}
                      data-testid="button-archive-client"
                    >
                      <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="sr-only">Archive Client</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Archive this client</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {isArchived && (
        <Alert variant="default" className="mx-3 sm:mx-6 mt-2 sm:mt-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            This client record is archived and read-only. Archived on: {client.archivedAt ? new Date(client.archivedAt).toLocaleDateString() : 'Unknown'}. 
            Reason: {client.archiveReason || 'Not specified'}. 
            Records retained until: {client.retentionUntil || 'N/A'}.
          </AlertDescription>
        </Alert>
      )}

      {client.isOnboarded !== "yes" && !isArchived && (
        <div className="mx-3 sm:mx-6 mt-2 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm"><strong>New Client</strong> - Not yet onboarded</span>
          </div>
          <Button 
            size="sm" 
            className="h-7 sm:h-8 text-xs sm:text-sm w-full sm:w-auto sm:ml-auto"
            onClick={() => onboardMutation.mutate()}
            disabled={onboardMutation.isPending}
            data-testid="button-onboard-client"
          >
            {onboardMutation.isPending ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
            Mark as Onboarded
          </Button>
        </div>
      )}

      {/* Mobile Section Navigation - Horizontal scroll */}
      <div className="lg:hidden border-b overflow-x-auto bg-muted/30">
        <nav className="flex p-2 gap-1 min-w-max">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeSection === item.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background hover:bg-muted text-foreground border'
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
              {item.badge && (
                <span className={`ml-1 text-[10px] ${item.badgeColor || ''}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation - Desktop only */}
        <div className="w-56 border-r bg-muted/30 flex-shrink-0 hidden lg:block">
          <div className="p-4 border-b">
            <p className="font-semibold text-sm">Client Profile</p>
            <p className="text-xs text-muted-foreground">Navigate sections</p>
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <nav className="p-2 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    activeSection === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-foreground'
                  }`}
                  data-testid={`sidebar-${item.id}`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs ${item.badgeColor || 'text-muted-foreground'}`}>{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Stat Cards Row - Clean design with borders - Interactive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Card 
              className="bg-card hover-elevate cursor-pointer"
              onClick={() => setActiveSection("details")}
              data-testid="stat-age"
            >
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                    <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Age</p>
                    <p className="text-base sm:text-xl font-semibold">{clientAge || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-card hover-elevate cursor-pointer"
              onClick={() => setActiveSection("program")}
              data-testid="stat-support-level"
            >
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Support</p>
                    <p className="text-base sm:text-xl font-semibold truncate">{getSupportLevel() || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-card hover-elevate cursor-pointer"
              onClick={() => setActiveSection("team")}
              data-testid="stat-assigned-staff"
            >
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Staff</p>
                    <p className="text-base sm:text-xl font-semibold">{assignedStaffCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-card hover-elevate cursor-pointer"
              onClick={() => setActiveSection("budget")}
              data-testid="stat-budget"
            >
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Budget</p>
                    <p className="text-base sm:text-xl font-semibold">${remainingBudget.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Critical Alerts Banner */}
              {(client.allergies || client.advancedCareDirective || client.attentionNotes) && (
                <div className="space-y-3">
                  {client.allergies && (
                    <Alert variant="destructive" className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="font-medium">
                        <span className="font-bold">ALLERGIES: </span>{client.allergies}
                      </AlertDescription>
                    </Alert>
                  )}
                  {client.advancedCareDirective && client.advancedCareDirective !== "None" && (
                    <Alert className={`${client.advancedCareDirective === "NFR" ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30" : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"}`}>
                      <FileText className="h-4 w-4" />
                      <AlertDescription className="font-medium">
                        <span className="font-bold">Advanced Care Directive: </span>
                        <Badge className={`ml-2 ${client.advancedCareDirective === "NFR" ? "bg-rose-600" : "bg-emerald-600"} text-white border-0`}>
                          {client.advancedCareDirective === "NFR" ? "Not For Resuscitation" : "For Resuscitation"}
                        </Badge>
                      </AlertDescription>
                    </Alert>
                  )}
                  {client.attentionNotes && (
                    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="font-medium text-amber-800 dark:text-amber-200">
                        <span className="font-bold">ATTENTION: </span>{client.attentionNotes}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Quick Info Row - Interactive */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card 
                  className="bg-card hover-elevate cursor-pointer"
                  onClick={() => setActiveSection("services")}
                  data-testid="card-service-type"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs text-muted-foreground font-medium">Service Type</span>
                    </div>
                    <p className="text-sm font-semibold">{client.serviceType || 'Not specified'}</p>
                  </CardContent>
                </Card>
                <Card 
                  className="bg-card hover-elevate cursor-pointer"
                  onClick={() => setActiveSection("details")}
                  data-testid="card-risk-score"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-muted-foreground font-medium">Risk Score</span>
                    </div>
                    {client.riskAssessmentScore ? (
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          parseInt(client.riskAssessmentScore) <= 3 ? 'bg-emerald-500' :
                          parseInt(client.riskAssessmentScore) <= 6 ? 'bg-amber-500' :
                          'bg-red-500'
                        } text-white border-0 text-xs`}>
                          {client.riskAssessmentScore}/10
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {parseInt(client.riskAssessmentScore) <= 3 ? 'Low' :
                           parseInt(client.riskAssessmentScore) <= 6 ? 'Medium' : 'High'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold">Not assessed</p>
                    )}
                  </CardContent>
                </Card>
                <Card 
                  className="bg-card md:col-span-2 hover-elevate cursor-pointer"
                  onClick={() => setActiveSection("details")}
                  data-testid="card-parking"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span className="text-xs text-muted-foreground font-medium">Parking / Access</span>
                    </div>
                    <p className="text-sm font-semibold">{client.parkingInstructions || 'No instructions provided'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Contact & Location */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Contact Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {client.phoneNumber && (
                          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <a href={`tel:${client.phoneNumber}`} className="text-sm font-medium hover:text-primary">
                                {client.phoneNumber}
                              </a>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(client.phoneNumber!, 'Phone')}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <a href={`mailto:${client.email}`} className="text-sm font-medium hover:text-primary truncate block" data-testid="text-client-email">
                                {client.email}
                              </a>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(client.email!, 'Email')}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Notification Preferences */}
                      {client.notificationPreferences && (client.notificationPreferences.smsArrival || client.notificationPreferences.smsSchedule || client.notificationPreferences.callArrival || client.notificationPreferences.callSchedule) && (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Notification Preference</p>
                            <p className="text-sm font-medium" data-testid="text-notification-pref">
                              {(() => {
                                const prefs = [];
                                if (client.notificationPreferences?.smsArrival || client.notificationPreferences?.smsSchedule) {
                                  prefs.push('SMS Arrivals & Schedules');
                                }
                                if (client.notificationPreferences?.callArrival || client.notificationPreferences?.callSchedule) {
                                  prefs.push('Calls Arrivals & Schedules');
                                }
                                return prefs.join(', ') || 'None';
                              })()}
                            </p>
                          </div>
                        </div>
                      )}

                      {(client.homeAddress || client.streetAddress) && (
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Address</p>
                            <p className="text-sm font-medium">
                              {client.streetAddress ? (
                                <>
                                  {client.streetAddress}
                                  {(client.suburb || client.state || client.postcode) && <br />}
                                  {[client.suburb, client.state, client.postcode].filter(Boolean).join(' ')}
                                </>
                              ) : client.homeAddress}
                            </p>
                            {distanceData?.distanceKm !== null && distanceData?.distanceKm !== undefined && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Navigation className="w-3 h-3 inline mr-1" />
                                {distanceData.distanceKm} km from office
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(client.homeAddress!, 'Address')}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location Map */}
                  <ClientLocationMap
                    latitude={client.latitude}
                    longitude={client.longitude}
                    address={client.streetAddress ? `${client.streetAddress}, ${[client.suburb, client.state, client.postcode].filter(Boolean).join(' ')}` : client.homeAddress}
                    clientName={client.participantName}
                  />

                  {/* GP & Pharmacy Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GP Information */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
                          General Practitioner
                          {gpDetails && client.generalPractitionerId && (
                            <Link 
                              href={`/gps?highlight=${client.generalPractitionerId}`}
                              className="ml-auto inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground"
                              data-testid="link-gp-card"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {gpDetails ? (
                          <div className="space-y-2">
                            <p className="font-semibold">{gpDetails.name}</p>
                            {gpDetails.practiceName && (
                              <p className="text-sm text-muted-foreground">{gpDetails.practiceName}</p>
                            )}
                            {gpDetails.phoneNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <a href={`tel:${gpDetails.phoneNumber}`} className="hover:text-primary">{gpDetails.phoneNumber}</a>
                              </div>
                            )}
                            {gpDetails.faxNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-xs text-muted-foreground">Fax:</span>
                                <span>{gpDetails.faxNumber}</span>
                              </div>
                            )}
                            {gpDetails.address && (
                              <p className="text-sm text-muted-foreground">{gpDetails.address}</p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Stethoscope className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">No GP assigned</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pharmacy Information */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Pill className="w-4 h-4" />
                          Pharmacy
                          {pharmacyDetails && client.pharmacyId && (
                            <Link 
                              href={`/pharmacies?highlight=${client.pharmacyId}`}
                              className="ml-auto inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground"
                              data-testid="link-pharmacy-card"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {pharmacyDetails ? (
                          <div className="space-y-2">
                            <p className="font-semibold">{pharmacyDetails.name}</p>
                            {pharmacyDetails.phoneNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <a href={`tel:${pharmacyDetails.phoneNumber}`} className="hover:text-primary">{pharmacyDetails.phoneNumber}</a>
                              </div>
                            )}
                            {pharmacyDetails.faxNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-xs text-muted-foreground">Fax:</span>
                                <span>{pharmacyDetails.faxNumber}</span>
                              </div>
                            )}
                            {pharmacyDetails.address && (
                              <p className="text-sm text-muted-foreground">{pharmacyDetails.address}</p>
                            )}
                            {pharmacyDetails.deliveryAvailable === "yes" && (
                              <Badge variant="secondary" className="mt-1">Delivery Available</Badge>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Pill className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">No pharmacy assigned</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Right Column - Key Contacts & Program Info */}
                <div className="space-y-6">
                  {/* Next of Kin / Emergency Contact */}
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Emergency Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientContacts.length > 0 ? (
                        <div className="space-y-3">
                          {clientContacts.filter(c => c.isEmergencyContact === "yes" || c.isNok === "yes").slice(0, 2).map((contact) => (
                            <div key={contact.id} className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-sm">{contact.name}</p>
                                <div className="flex gap-1">
                                  {contact.isNok === "yes" && <Badge variant="outline" className="text-xs">NOK</Badge>}
                                  {contact.isEmergencyContact === "yes" && <Badge variant="destructive" className="text-xs">Emergency</Badge>}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground capitalize mb-2">{contact.relationship}</p>
                              {contact.phoneNumber && (
                                <div className="flex items-center gap-2">
                                  <a href={`tel:${contact.phoneNumber}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {contact.phoneNumber}
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : client.nokEpoa ? (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm">{client.nokEpoa}</p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">No emergency contact listed</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Program Info Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4" />
                        Program Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Category</p>
                        <p className="text-sm font-semibold">{client.category}</p>
                      </div>
                      
                      {client.category === "NDIS" && (
                        <>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">NDIS Number</p>
                            <p className="text-sm font-semibold font-mono">{getNdisNumber() || 'Not provided'}</p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">Funding Type</p>
                            <p className="text-sm font-semibold">{client.ndisDetails?.ndisFundingType || 'Not specified'}</p>
                          </div>
                        </>
                      )}
                      
                      {client.category === "Support at Home" && (
                        <>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">HCP Number</p>
                            <p className="text-sm font-semibold font-mono">{getHcpNumber() || 'Not provided'}</p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">Funding Level</p>
                            <p className="text-sm font-semibold">{client.supportAtHomeDetails?.hcpFundingLevel || 'Not specified'}</p>
                          </div>
                        </>
                      )}

                      {client.category === "Private" && client.medicareNumber && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">Medicare Number</p>
                          <p className="text-sm font-semibold font-mono text-emerald-900 dark:text-emerald-100">{client.medicareNumber}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Incidents */}
                  {incidentReports.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Recent Incidents
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {incidentReports.slice(0, 3).map((incident) => (
                            <div key={incident.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                              <Badge variant={incident.severity === 'high' || incident.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                                {incident.incidentType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(incident.incidentDate).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other sections - using existing Tabs content */}
          {activeSection !== "overview" && (
            <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as ProfileSection)} className="space-y-6">
              <TabsList className="w-full justify-start overflow-x-auto lg:hidden">
                <TabsTrigger value="details" data-testid="tab-details">Personal Details</TabsTrigger>
                <TabsTrigger value="program" data-testid="tab-program">Program Info</TabsTrigger>
                <TabsTrigger value="team" data-testid="tab-team">Care Team</TabsTrigger>
                <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
                <TabsTrigger value="clinical" data-testid="tab-clinical">Clinical Notes</TabsTrigger>
                <TabsTrigger value="careplan" data-testid="tab-careplan">Care Plan</TabsTrigger>
                <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
                <TabsTrigger value="budget" data-testid="tab-budget">Budget</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                {/* Identity & Demographics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Identity & Demographics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                        <p className="text-sm mt-1 font-medium">{client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('en-AU') : "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Medicare Number</p>
                        <p className="text-sm mt-1 font-mono">{client.medicareNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next of Kin / EPOA</p>
                        <p className="text-sm mt-1 font-medium">{client.nokEpoa || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                        <div className="mt-1">
                          <CategoryBadge category={client.category} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Clinical Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" />
                      Clinical Details
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Critical info displayed in Overview alerts</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Main Diagnosis</p>
                        <p className="text-sm mt-1 font-medium">{client.mainDiagnosis || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Score</p>
                        <div className="mt-1 flex items-center gap-2">
                          {client.riskAssessmentScore ? (
                            <Badge className={`${
                              parseInt(client.riskAssessmentScore) <= 3 ? 'bg-emerald-500' :
                              parseInt(client.riskAssessmentScore) <= 6 ? 'bg-amber-500' :
                              'bg-red-500'
                            } text-white border-0`}>
                              {client.riskAssessmentScore}/10
                            </Badge>
                          ) : (
                            <span className="text-sm font-semibold">Not assessed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Preferences */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      Service Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        className="cursor-pointer hover-elevate p-3 -m-3 rounded-lg transition-colors"
                        onClick={() => setScheduleModalOpen(true)}
                        data-testid="button-open-schedule-modal"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frequency of Services</p>
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        {client.serviceSchedule ? (
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {(() => {
                                const schedule = client.serviceSchedule as any;
                                const week1Slots = schedule.week1 ? Object.values(schedule.week1).flat().length : 0;
                                const week2Slots = schedule.week2 ? Object.values(schedule.week2).flat().length : 0;
                                return `${week1Slots + week2Slots} time slots configured`;
                              })()}
                            </Badge>
                            <p className="text-xs text-primary mt-1">Click to view/edit schedule</p>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <p className="text-sm font-medium">{client.frequencyOfServices || "Not specified"}</p>
                            <p className="text-xs text-primary mt-1">Click to set schedule</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Communication Needs</p>
                        <p className="text-sm mt-1 font-medium">{client.communicationNeeds || "No special needs"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notification Preferences</p>
                        <div className="mt-1">
                          <NotificationPreferencesBadges preferences={client.notificationPreferences as NotificationPreferencesType} />
                        </div>
                      </div>
                    </div>
                    {client.summaryOfServices && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Summary of Services</p>
                        <p className="text-sm">{client.summaryOfServices}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* High Intensity Supports */}
                {client.highIntensitySupports && client.highIntensitySupports.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        High Intensity Supports
                      </CardTitle>
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
                    <div className="flex-1">
                      <p className="text-sm font-medium">{client.careTeam.careManager}</p>
                      <p className="text-xs text-muted-foreground">Care Manager</p>
                    </div>
                    {client.careTeam?.careManagerId && (
                      <Link 
                        href={`/staff?highlight=${client.careTeam.careManagerId}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                        data-testid="link-care-manager"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
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
                    <div className="flex-1">
                      <p className="text-sm font-medium">{client.careTeam.generalPractitioner}</p>
                      <p className="text-xs text-muted-foreground">General Practitioner</p>
                    </div>
                    {client.generalPractitionerId && (
                      <Link 
                        href={`/gps?highlight=${client.generalPractitionerId}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                        data-testid="link-gp-team"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
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
                    <div className="flex-1">
                      <p className="text-sm font-medium">{client.careTeam.supportCoordinator}</p>
                      <p className="text-xs text-muted-foreground">Support Coordinator</p>
                    </div>
                    {client.careTeam?.supportCoordinatorId && (
                      <Link 
                        href={`/support-coordinators?highlight=${client.careTeam.supportCoordinatorId}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                        data-testid="link-support-coordinator"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
                {client.careTeam?.planManager && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{client.careTeam.planManager.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{client.careTeam.planManager}</p>
                      <p className="text-xs text-muted-foreground">Plan Manager</p>
                    </div>
                    {client.careTeam?.planManagerId && (
                      <Link 
                        href={`/plan-managers?highlight=${client.careTeam.planManagerId}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                        data-testid="link-plan-manager"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
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
                                    {staff.name} ({(staff.role || "staff").replace("_", " ")})
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
                              <p className="text-xs text-muted-foreground">Since {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : "N/A"}</p>
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

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Client Goals ({goals.length}/5)
                </CardTitle>
                {!isArchived && goals.length < 5 ? (
                  <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-goal">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Goal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Goal</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Goal Title *</Label>
                          <Input 
                            placeholder="Enter goal title..." 
                            value={goalTitle}
                            onChange={(e) => setGoalTitle(e.target.value)}
                            data-testid="input-goal-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea 
                            placeholder="Describe the goal in detail..." 
                            value={goalDescription}
                            onChange={(e) => setGoalDescription(e.target.value)}
                            rows={3}
                            data-testid="input-goal-description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Target Date</Label>
                            <Input 
                              type="date" 
                              value={goalTargetDate}
                              onChange={(e) => setGoalTargetDate(e.target.value)}
                              data-testid="input-goal-target-date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={goalStatus} onValueChange={(v) => setGoalStatus(v as typeof goalStatus)}>
                              <SelectTrigger data-testid="select-goal-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="achieved">Achieved</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {goals.length >= 5 || pendingGoalSubmission ? (
                          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              {pendingGoalSubmission ? "Processing..." : "Maximum of 5 goals reached. Delete an existing goal to add a new one."}
                            </p>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => {
                              // Double-check cache before submitting
                              const cachedGoals = queryClient.getQueryData<ClientGoal[]>(["/api/clients", params?.id, "goals"]) || [];
                              if (cachedGoals.length >= 5) {
                                toast({ title: "Maximum goals reached", description: "You can only have up to 5 goals per client.", variant: "destructive" });
                                setAddGoalOpen(false);
                                return;
                              }
                              addGoalMutation.mutate({ 
                                title: goalTitle, 
                                description: goalDescription || undefined,
                                targetDate: goalTargetDate || undefined,
                                status: goalStatus 
                              });
                            }}
                            disabled={!goalTitle.trim() || addGoalMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-goal"
                          >
                            {addGoalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Add Goal
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : !isArchived && goals.length >= 5 ? (
                  <Badge variant="secondary" className="gap-1 text-muted-foreground">
                    <CheckCircle className="w-3 h-3" />
                    Maximum goals reached
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No goals set for this client</p>
                  {!isArchived && (
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Goal" to set client objectives</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const statusConfig: Record<string, { label: string; className: string; icon: JSX.Element }> = {
                      not_started: { label: "Not Started", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: <Clock className="w-3 h-3" /> },
                      in_progress: { label: "In Progress", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", icon: <TrendingUp className="w-3 h-3" /> },
                      achieved: { label: "Achieved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", icon: <CheckCircle className="w-3 h-3" /> },
                      on_hold: { label: "On Hold", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: <AlertTriangle className="w-3 h-3" /> },
                    };
                    const status = statusConfig[goal.status] || statusConfig.not_started;
                    
                    return (
                      <div 
                        key={goal.id} 
                        className="p-4 border rounded-lg bg-card"
                        data-testid={`goal-${goal.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{goal.title}</h4>
                              <Badge className={`${status.className} gap-1`} variant="secondary">
                                {status.icon}
                                {status.label}
                              </Badge>
                            </div>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                            )}
                            {goal.targetDate && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Target: {new Date(goal.targetDate).toLocaleDateString('en-AU')}
                              </p>
                            )}
                          </div>
                          {!isArchived && (
                            <div className="flex items-center gap-1">
                              <Select 
                                value={goal.status} 
                                onValueChange={(v) => updateGoalMutation.mutate({ id: goal.id, data: { status: v as "not_started" | "in_progress" | "achieved" | "on_hold" } })}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs" data-testid={`select-goal-status-${goal.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="achieved">Achieved</SelectItem>
                                  <SelectItem value="on_hold">On Hold</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteGoalMutation.mutate(goal.id)}
                                data-testid={`button-delete-goal-${goal.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
                                  {staff.name} ({(staff.role || "staff").replace("_", " ")})
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
                      clinical: "border-teal-500",
                      incident: "border-red-500",
                      complaint: "border-amber-500",
                      feedback: "border-emerald-500",
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
                                  {staff.name} ({(staff.role || "staff").replace("_", " ")})
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
                      open: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                      investigating: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
                      resolved: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
                      closed: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
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

        <TabsContent value="careplan" className="space-y-6">
          {client && (
            <CarePlanTab 
              clientId={client.id} 
              clientName={client.participantName || `${client.firstName} ${client.lastName}`}
              isArchived={isArchived}
            />
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Service Deliveries
                </CardTitle>
                {!isArchived && (
                  <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-service">
                        <Plus className="w-4 h-4 mr-1" />
                        Record Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Record Service Delivery</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Service Name *</Label>
                          <Input 
                            placeholder="e.g., Personal Care, Transport, etc."
                            value={serviceName}
                            onChange={(e) => setServiceName(e.target.value)}
                            data-testid="input-service-name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input 
                              type="date"
                              value={serviceDate}
                              onChange={(e) => setServiceDate(e.target.value)}
                              data-testid="input-service-date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration (mins)</Label>
                            <Input 
                              type="number"
                              placeholder="60"
                              value={serviceDuration}
                              onChange={(e) => setServiceDuration(e.target.value)}
                              data-testid="input-service-duration"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Amount ($)</Label>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={serviceAmount}
                              onChange={(e) => setServiceAmount(e.target.value)}
                              data-testid="input-service-amount"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rate Type</Label>
                            <Select value={serviceRateType} onValueChange={(v: any) => setServiceRateType(v)}>
                              <SelectTrigger data-testid="select-service-rate-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekday">Weekday</SelectItem>
                                <SelectItem value="saturday">Saturday</SelectItem>
                                <SelectItem value="sunday">Sunday</SelectItem>
                                <SelectItem value="public_holiday">Public Holiday</SelectItem>
                                <SelectItem value="evening">Evening</SelectItem>
                                <SelectItem value="night">Night</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Link to Budget</Label>
                          <Select value={serviceBudgetId} onValueChange={setServiceBudgetId}>
                            <SelectTrigger data-testid="select-service-budget">
                              <SelectValue placeholder="Select budget category..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No budget link</SelectItem>
                              {budgets?.map((budget) => (
                                <SelectItem key={budget.id} value={budget.id}>
                                  {budget.category} (${parseFloat(budget.totalAllocated).toLocaleString()} allocated)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {serviceBudgetId && serviceAmount && (
                            <p className="text-xs text-muted-foreground">
                              Amount will be automatically added to budget usage
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Staff Member</Label>
                          <Select value={serviceStaffId} onValueChange={setServiceStaffId}>
                            <SelectTrigger data-testid="select-service-staff">
                              <SelectValue placeholder="Select staff..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Not specified</SelectItem>
                              {staffList.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea 
                            placeholder="Additional notes..."
                            value={serviceNotes}
                            onChange={(e) => setServiceNotes(e.target.value)}
                            data-testid="input-service-notes"
                          />
                        </div>
                        <Button 
                          onClick={() => addServiceMutation.mutate({
                            serviceName,
                            amount: serviceAmount || undefined,
                            budgetId: serviceBudgetId || undefined,
                            staffId: serviceStaffId || undefined,
                            deliveredAt: new Date(serviceDate).toISOString(),
                            durationMinutes: serviceDuration || undefined,
                            notes: serviceNotes || undefined,
                            rateType: serviceRateType,
                            status: "completed"
                          })}
                          disabled={!serviceName || !serviceDate || addServiceMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-service"
                        >
                          {addServiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Record Service
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {serviceDeliveries.length > 0 ? (
                <div className="space-y-3">
                  {serviceDeliveries.map((service) => {
                    const linkedBudget = budgets?.find(b => b.id === service.budgetId);
                    const staffMember = staffList.find(s => s.id === service.staffId);
                    return (
                      <div 
                        key={service.id} 
                        className="p-3 border rounded-lg bg-card"
                        data-testid={`service-${service.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{service.serviceName}</h4>
                              {service.status && (
                                <Badge variant={service.status === "completed" ? "default" : "secondary"} className="text-xs capitalize">
                                  {service.status}
                                </Badge>
                              )}
                              {service.rateType && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {service.rateType.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(service.deliveredAt).toLocaleDateString('en-AU')}
                              </span>
                              {service.durationMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {service.durationMinutes} mins
                                </span>
                              )}
                              {staffMember && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {staffMember.name}
                                </span>
                              )}
                            </div>
                            {linkedBudget && (
                              <p className="text-xs text-primary mt-1">
                                Linked to: {linkedBudget.category}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {service.amount && (
                              <span className="font-medium text-sm">
                                ${parseFloat(service.amount).toLocaleString()}
                              </span>
                            )}
                            {!isArchived && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteServiceMutation.mutate(service.id)}
                                data-testid={`button-delete-service-${service.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {service.notes && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                            {service.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No service deliveries recorded</p>
                  {!isArchived && (
                    <p className="text-xs text-muted-foreground mt-1">Click "Record Service" to add service delivery records</p>
                  )}
                </div>
              )}
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Budget Allocations
                </CardTitle>
                {!isArchived && (
                  <Dialog open={addBudgetOpen} onOpenChange={setAddBudgetOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-budget">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Budget
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Budget Allocation</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Category *</Label>
                          <Select value={budgetCategory} onValueChange={setBudgetCategory}>
                            <SelectTrigger data-testid="select-budget-category">
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Core Supports">Core Supports</SelectItem>
                              <SelectItem value="Capacity Building">Capacity Building</SelectItem>
                              <SelectItem value="Capital Supports">Capital Supports</SelectItem>
                              <SelectItem value="Support Coordination">Support Coordination</SelectItem>
                              <SelectItem value="Assistance with Daily Life">Assistance with Daily Life</SelectItem>
                              <SelectItem value="Transport">Transport</SelectItem>
                              <SelectItem value="Consumables">Consumables</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Allocated Amount *</Label>
                            <Input 
                              type="number"
                              placeholder="0.00" 
                              value={budgetAllocated}
                              onChange={(e) => setBudgetAllocated(e.target.value)}
                              data-testid="input-budget-allocated"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Used Amount</Label>
                            <Input 
                              type="number"
                              placeholder="0.00" 
                              value={budgetUsed}
                              onChange={(e) => setBudgetUsed(e.target.value)}
                              data-testid="input-budget-used"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input 
                              type="date" 
                              value={budgetStartDate}
                              onChange={(e) => setBudgetStartDate(e.target.value)}
                              data-testid="input-budget-start"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input 
                              type="date" 
                              value={budgetEndDate}
                              onChange={(e) => setBudgetEndDate(e.target.value)}
                              data-testid="input-budget-end"
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={() => addBudgetMutation.mutate({ 
                            clientId: params?.id || "",
                            category: budgetCategory, 
                            totalAllocated: budgetAllocated,
                            used: budgetUsed || "0",
                            startDate: budgetStartDate || undefined,
                            endDate: budgetEndDate || undefined
                          })}
                          disabled={!budgetCategory || !budgetAllocated || addBudgetMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-budget"
                        >
                          {addBudgetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Add Budget
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Edit Budget Dialog */}
                <Dialog open={editBudgetOpen} onOpenChange={(open) => !open && closeEditBudget()}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Budget Allocation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={budgetCategory} onValueChange={setBudgetCategory}>
                          <SelectTrigger data-testid="select-edit-budget-category">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Core Supports">Core Supports</SelectItem>
                            <SelectItem value="Capacity Building">Capacity Building</SelectItem>
                            <SelectItem value="Capital Supports">Capital Supports</SelectItem>
                            <SelectItem value="Support Coordination">Support Coordination</SelectItem>
                            <SelectItem value="Assistance with Daily Life">Assistance with Daily Life</SelectItem>
                            <SelectItem value="Transport">Transport</SelectItem>
                            <SelectItem value="Consumables">Consumables</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Allocated Amount ($) *</Label>
                          <Input 
                            type="number" 
                            placeholder="0.00"
                            value={budgetAllocated}
                            onChange={(e) => setBudgetAllocated(e.target.value)}
                            data-testid="input-edit-budget-allocated"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Used Amount ($)</Label>
                          <Input 
                            type="number" 
                            placeholder="0.00"
                            value={budgetUsed}
                            onChange={(e) => setBudgetUsed(e.target.value)}
                            data-testid="input-edit-budget-used"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input 
                            type="date" 
                            value={budgetStartDate}
                            onChange={(e) => setBudgetStartDate(e.target.value)}
                            data-testid="input-edit-budget-start"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input 
                            type="date" 
                            value={budgetEndDate}
                            onChange={(e) => setBudgetEndDate(e.target.value)}
                            data-testid="input-edit-budget-end"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => editingBudget && updateBudgetMutation.mutate({ 
                          id: editingBudget.id,
                          data: {
                            category: budgetCategory, 
                            totalAllocated: budgetAllocated,
                            used: budgetUsed || "0",
                            startDate: budgetStartDate || undefined,
                            endDate: budgetEndDate || undefined
                          }
                        })}
                        disabled={!budgetCategory || !budgetAllocated || updateBudgetMutation.isPending}
                        className="w-full"
                        data-testid="button-update-budget"
                      >
                        {updateBudgetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Update Budget
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {budgets && budgets.length > 0 ? (
                <div className="space-y-4">
                  {budgets.map((budget) => {
                    const allocated = parseFloat(budget.totalAllocated || "0");
                    const used = parseFloat(budget.used || "0");
                    const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
                    const remaining = allocated - used;
                    return (
                      <div 
                        key={budget.id} 
                        className="p-4 border rounded-lg bg-card"
                        data-testid={`budget-${budget.id}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{budget.category}</h4>
                              <Badge 
                                variant="secondary"
                                className={`text-xs ${
                                  percent > 100 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                    : percent >= 80 
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}
                              >
                                {percent > 100 ? 'Over Budget' : percent >= 80 ? 'Low' : 'Healthy'}
                              </Badge>
                            </div>
                            {(budget.startDate || budget.endDate) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {budget.startDate ? new Date(budget.startDate).toLocaleDateString('en-AU') : "N/A"} - {budget.endDate ? new Date(budget.endDate).toLocaleDateString('en-AU') : "Ongoing"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-medium">${used.toLocaleString()} / ${allocated.toLocaleString()}</p>
                              <p className={`text-xs ${remaining < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                ${remaining.toLocaleString()} remaining
                              </p>
                            </div>
                            {!isArchived && (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => openEditBudget(budget)}
                                  data-testid={`button-edit-budget-${budget.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteBudgetMutation.mutate(budget.id)}
                                  data-testid={`button-delete-budget-${budget.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percent}% used</span>
                          </div>
                          <Progress 
                            value={Math.min(percent, 100)} 
                            className={`h-2 ${percent > 100 ? '[&>div]:bg-red-500' : percent >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No budget allocations recorded</p>
                  {!isArchived && (
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Budget" to create budget categories</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {client && (
        <>
        <ArchiveClientModal
          client={client}
          open={archiveModalOpen}
          onOpenChange={setArchiveModalOpen}
          onSuccess={() => setLocation("/clients")}
        />
        <ServiceScheduleModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          clientId={client.id}
          clientName={client.participantName}
          currentSchedule={client.serviceSchedule as any}
          currentFrequencyText={client.frequencyOfServices}
        />
        </>
      )}
    </div>
  );
}
