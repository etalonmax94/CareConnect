import { useState, useEffect } from "react";
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
import CategoryBadge from "@/components/CategoryBadge";
import DocumentTracker from "@/components/DocumentTracker";
import { ArchiveClientModal } from "@/components/ArchiveClientModal";
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Loader2, FileText, ExternalLink, DollarSign, Clock, Bell, MessageSquare, PhoneCall, Archive, RotateCcw, AlertTriangle, Heart, HeartOff, Plus, UserCircle, Trash2, Target, Shield, CheckCircle, Sparkles, TrendingUp, Pencil, Copy, Users, ClipboardCheck, Stethoscope, AlertCircle, Briefcase, UserCog, Building2, CreditCard, FileWarning, CalendarDays, Car, Pill, Activity, Navigation, Settings, BookOpen, UserPlus, FileCheck } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Client, Budget, ProgressNote, Staff, ClientStaffAssignment, IncidentReport, ClientGoal, ServiceDelivery, GP, Pharmacy, ClientContact } from "@shared/schema";
import { calculateAge } from "@shared/schema";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

type ProfileSection = "overview" | "care" | "people" | "services" | "admin";

export default function ClientProfile() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
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

  const sidebarItems: { id: ProfileSection; label: string; icon: any; badge?: string; badgeColor?: string; description?: string }[] = [
    { id: "overview", label: "Overview", icon: User, description: "At-a-glance information" },
    { id: "care", label: "Care", icon: Heart, description: "Medical, Behaviors, Goals" },
    { id: "people", label: "People", icon: Users, description: "Contacts, Staff, Team" },
    { id: "services", label: "Services", icon: Clock, description: "Appointments, Notes" },
    { id: "admin", label: "Admin", icon: Settings, description: "Documents, Budget, Meeting Notes" },
  ];

  return (
    <div className="h-full -m-6 flex flex-col">
      {/* Profile Header */}
      <div className="bg-slate-800 dark:bg-slate-900 text-white px-6 py-4">
        <div className="flex items-start gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          
          <Avatar className="w-16 h-16 border-2 border-white/20 flex-shrink-0">
            <AvatarImage src={client.photo || undefined} alt={client.participantName} />
            <AvatarFallback className="text-xl bg-primary text-white font-bold">{getInitials(client.participantName)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{client.participantName}</h1>
              <Badge className={`${isArchived ? 'bg-amber-500' : 'bg-green-500'} text-white border-0`}>
                {isArchived ? 'Archived' : 'Active'}
              </Badge>
              {client.isOnboarded !== "yes" && !isArchived && (
                <Badge className="bg-blue-500 text-white border-0">New</Badge>
              )}
            </div>
            
            {/* Quick Info Chips */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {clientAge && (
                <div className="flex items-center gap-2 bg-slate-700/50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-400">Age</p>
                    <p className="text-sm font-semibold">{clientAge}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 bg-slate-700/50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400">ID</p>
                  <p className="text-sm font-semibold font-mono truncate max-w-[100px]" title={client.id}>{client.id.substring(0, 10)}...</p>
                </div>
              </div>
              
              {client.category === "NDIS" && getNdisNumber() && (
                <div className="flex items-center gap-2 bg-slate-700/50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-400">NDIS</p>
                    <p className="text-sm font-semibold font-mono">{getNdisNumber()}</p>
                  </div>
                </div>
              )}
              
              {client.category === "Support at Home" && getHcpNumber() && (
                <div className="flex items-center gap-2 bg-slate-700/50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-400">HCP</p>
                    <p className="text-sm font-semibold font-mono">{getHcpNumber()}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 bg-slate-700/50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Care Category</p>
                  <p className="text-sm font-semibold">{client.category}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isArchived ? (
              <Button 
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                data-testid="button-restore-client"
                className="gap-2 bg-white text-slate-800 hover:bg-slate-100"
              >
                <RotateCcw className="w-4 h-4" />
                {restoreMutation.isPending ? "Restoring..." : "Restore"}
              </Button>
            ) : (
              <>
                <Link href={`/clients/${params?.id}/edit`}>
                  <Button variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10" data-testid="button-edit-client">
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </Link>
                {client.zohoWorkdriveLink && (
                  <a href={client.zohoWorkdriveLink} target="_blank" rel="noopener noreferrer" data-testid="link-service-agreement">
                    <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                      <FileText className="w-4 h-4" />
                      Service Agreement
                    </Button>
                  </a>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setArchiveModalOpen(true)}
                  data-testid="button-archive-client"
                  className="gap-2 border-white/30 text-white hover:bg-white/10"
                >
                  <Archive className="w-4 h-4" />
                  <span className="sr-only">Archive Client</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {isArchived && (
        <Alert variant="default" className="mx-6 mt-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This client record is archived and read-only. Archived on: {client.archivedAt ? new Date(client.archivedAt).toLocaleDateString() : 'Unknown'}. 
            Reason: {client.archiveReason || 'Not specified'}. 
            Records retained until: {client.retentionUntil || 'N/A'}.
          </AlertDescription>
        </Alert>
      )}

      {client.isOnboarded !== "yes" && !isArchived && (
        <Alert variant="default" className="mx-6 mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 flex items-center justify-between">
            <span><strong>New Client</strong> - This client has not been onboarded yet.</span>
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
              onClick={() => onboardMutation.mutate()}
              disabled={onboardMutation.isPending}
              data-testid="button-onboard-client"
            >
              {onboardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Mark as Onboarded
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stat Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{clientAge || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Support Level</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{getSupportLevel() || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Staff</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{assignedStaffCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">${remainingBudget.toLocaleString()}</p>
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
                    <Alert className={`${client.advancedCareDirective === "NFR" ? "border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30" : "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"}`}>
                      <FileText className="h-4 w-4" />
                      <AlertDescription className="font-medium">
                        <span className="font-bold">Advanced Care Directive: </span>
                        <Badge className={`ml-2 ${client.advancedCareDirective === "NFR" ? "bg-purple-600" : "bg-blue-600"} text-white border-0`}>
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

              {/* Quick Info Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-slate-50 dark:bg-slate-900/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-muted-foreground">Service Type</span>
                    </div>
                    <p className="text-sm font-semibold mt-1">{client.serviceType || 'Not specified'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-slate-900/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-muted-foreground">Distance</span>
                    </div>
                    <p className="text-sm font-semibold mt-1">
                      {distanceData?.distanceKm !== null && distanceData?.distanceKm !== undefined 
                        ? `${distanceData.distanceKm} km from office` 
                        : 'Not calculated'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-slate-900/50 md:col-span-2">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-muted-foreground">Parking / Access</span>
                    </div>
                    <p className="text-sm font-semibold mt-1">{client.parkingInstructions || 'No instructions provided'}</p>
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
                      {client.homeAddress && (
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Address</p>
                            <p className="text-sm font-medium">{client.homeAddress}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(client.homeAddress!, 'Address')}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location Map */}
                  {client.latitude && client.longitude && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="h-64 rounded-b-lg overflow-hidden">
                          <MapContainer 
                            center={[parseFloat(client.latitude), parseFloat(client.longitude)]} 
                            zoom={14} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[parseFloat(client.latitude), parseFloat(client.longitude)]}>
                              <Popup>{client.participantName}<br />{client.homeAddress}</Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* GP & Pharmacy Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GP Information */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
                          General Practitioner
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
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Medicare Number</p>
                          <p className="text-sm font-semibold font-mono">{client.medicareNumber}</p>
                        </div>
                      )}

                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <div className="flex items-center gap-2 mt-1">
                          {client.riskAssessmentScore ? (
                            <>
                              <Badge className={`${
                                parseInt(client.riskAssessmentScore) <= 3 ? 'bg-green-500' :
                                parseInt(client.riskAssessmentScore) <= 6 ? 'bg-amber-500' :
                                'bg-red-500'
                              } text-white border-0`}>
                                {client.riskAssessmentScore}/10
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {parseInt(client.riskAssessmentScore) <= 3 ? 'Low Risk' :
                                 parseInt(client.riskAssessmentScore) <= 6 ? 'Medium Risk' : 'High Risk'}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assessed</span>
                          )}
                        </div>
                      </div>
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

          {/* Care Section - Medical Info, Behaviors, Goals */}
          {activeSection === "care" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Care Information
                  </h2>
                  <p className="text-sm text-muted-foreground">Medical details, behaviors, and care goals</p>
                </div>
              </div>

              {/* Sub-navigation for Care section */}
              <Tabs defaultValue="medical" className="space-y-4">
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                  <TabsTrigger value="medical" data-testid="tab-care-medical">Medical Info</TabsTrigger>
                  <TabsTrigger value="behaviors" data-testid="tab-care-behaviors">Behaviors</TabsTrigger>
                  <TabsTrigger value="goals" data-testid="tab-care-goals">Goals</TabsTrigger>
                </TabsList>

                {/* Medical Information */}
                <TabsContent value="medical" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
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
                      </CardContent>
                    </Card>

                    {/* Clinical Information */}
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
                        {/* Advanced Care Directive */}
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

                    {/* Risk Assessment */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Risk Assessment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                          {client.riskAssessmentScore ? (
                            <Badge className={`${
                              parseInt(client.riskAssessmentScore) <= 3 ? 'bg-green-500' :
                              parseInt(client.riskAssessmentScore) <= 6 ? 'bg-amber-500' :
                              'bg-red-500'
                            } text-white border-0`}>
                              {client.riskAssessmentScore}/10
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assessed</span>
                          )}
                        </div>
                        {client.riskAssessmentScore && parseInt(client.riskAssessmentScore) > 6 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              High risk client - ensure appropriate safety measures are in place
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>

                    {/* Service Preferences */}
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
                  </div>
                </TabsContent>

                {/* Behaviors Tab */}
                <TabsContent value="behaviors" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Behavioral Notes</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1" disabled={isArchived}>
                        <Plus className="w-3 h-3" />
                        Add Behavior
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No behavioral notes recorded yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add behavior patterns, triggers, and interventions</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Goals Tab - Reuse existing goals content */}
                <TabsContent value="goals" className="space-y-6">
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
                      in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: <TrendingUp className="w-3 h-3" /> },
                      achieved: { label: "Achieved", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
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
