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
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Loader2, FileText, ExternalLink, DollarSign, Clock, Bell, MessageSquare, PhoneCall, Archive, RotateCcw, AlertTriangle, Heart, HeartOff, Plus, UserCircle, Trash2, Target, Shield, CheckCircle, Sparkles, TrendingUp, Pencil, Copy, Users, ClipboardCheck, Stethoscope, AlertCircle, Briefcase, UserCog, Building2, CreditCard, FileWarning, CalendarDays, Car, Pill, Activity, Navigation, Settings, BookOpen, UserPlus, FileCheck, Camera, Eye, Download, ChevronRight, HeartPulse } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Client, Budget, ProgressNote, Staff, ClientStaffAssignment, IncidentReport, ClientGoal, ServiceDelivery, GP, Pharmacy, ClientContact, Document, NonFaceToFaceServiceLog, SupportCoordinator } from "@shared/schema";
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

type ProfileSection = "overview" | "details" | "program" | "team" | "goals" | "documents" | "clinical" | "services" | "budget" | "careplan" | "nonfacetoface";

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
    refetchOnMount: "always",
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

  // Fetch Support Coordinator details if client has one assigned
  const { data: supportCoordinatorDetails } = useQuery<SupportCoordinator>({
    queryKey: ["/api/support-coordinators", client?.careTeam?.supportCoordinatorId],
    enabled: !!client?.careTeam?.supportCoordinatorId,
  });

  // Fetch lists for entity selectors
  const { data: gpsList = [] } = useQuery<GP[]>({
    queryKey: ["/api/gps"],
  });

  const { data: pharmaciesList = [] } = useQuery<Pharmacy[]>({
    queryKey: ["/api/pharmacies"],
  });

  const { data: supportCoordinatorsList = [] } = useQuery<SupportCoordinator[]>({
    queryKey: ["/api/support-coordinators"],
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

  // Non-face-to-face service logs
  const { data: nonFaceToFaceLogs = [] } = useQuery<NonFaceToFaceServiceLog[]>({
    queryKey: ["/api/clients", params?.id, "non-face-to-face-logs"],
    enabled: !!params?.id,
  });

  // Non-face-to-face log state
  const [addNonF2FOpen, setAddNonF2FOpen] = useState(false);
  const [nonF2FMethod, setNonF2FMethod] = useState<"email" | "phone" | "video_call" | "plan_review" | "document_review">("phone");
  const [nonF2FDateTime, setNonF2FDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [nonF2FDuration, setNonF2FDuration] = useState("");
  const [nonF2FLocation, setNonF2FLocation] = useState("");
  const [nonF2FSummary, setNonF2FSummary] = useState("");

  const addNonF2FMutation = useMutation({
    mutationFn: async (data: { 
      method: string; 
      contactDateTime: string;
      durationMinutes?: number;
      location?: string;
      summary: string;
    }) => {
      return apiRequest("POST", `/api/clients/${params?.id}/non-face-to-face-logs`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "non-face-to-face-logs"] });
      setAddNonF2FOpen(false);
      resetNonF2FForm();
      toast({ title: "Non-face-to-face service logged successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to log service", description: error?.message, variant: "destructive" });
    }
  });

  const deleteNonF2FMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/non-face-to-face-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id, "non-face-to-face-logs"] });
      toast({ title: "Log deleted" });
    },
  });

  const resetNonF2FForm = () => {
    setNonF2FMethod("phone");
    setNonF2FDateTime(new Date().toISOString().slice(0, 16));
    setNonF2FDuration("");
    setNonF2FLocation("");
    setNonF2FSummary("");
  };

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

  // Inline editing state for quick edits directly on profile
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editRiskScore, setEditRiskScore] = useState<string>("");
  const [editAllergies, setEditAllergies] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editMainDiagnosis, setEditMainDiagnosis] = useState<string>("");
  const [editDob, setEditDob] = useState<string>("");
  const [editStreetAddress, setEditStreetAddress] = useState<string>("");
  const [editSuburb, setEditSuburb] = useState<string>("");
  const [editState, setEditState] = useState<string>("");
  const [editPostcode, setEditPostcode] = useState<string>("");
  const [editParkingInstructions, setEditParkingInstructions] = useState<string>("");
  const [editGpId, setEditGpId] = useState<string>("");
  const [editPharmacyId, setEditPharmacyId] = useState<string>("");
  const [editSupportCoordinatorId, setEditSupportCoordinatorId] = useState<string>("");
  const [editNokEpoa, setEditNokEpoa] = useState<string>("");
  const [editMedicareNumber, setEditMedicareNumber] = useState<string>("");
  const [editNotificationsPreference, setEditNotificationsPreference] = useState<string>("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState<string>("");
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState<string>("");
  const [editEmergencyContactRelationship, setEditEmergencyContactRelationship] = useState<string>("");
  const [editServiceType, setEditServiceType] = useState<string>("");
  
  // Inline field update mutation
  const updateFieldMutation = useMutation({
    mutationFn: async (data: Partial<Client>) => {
      return apiRequest("PATCH", `/api/clients/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingField(null);
      toast({ title: "Updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error?.message, variant: "destructive" });
    },
  });

  const startEditing = (field: string) => {
    if (isArchived) return;
    setEditingField(field);
    switch (field) {
      case "riskScore":
        setEditRiskScore(client?.riskAssessmentScore || "");
        break;
      case "allergies":
        setEditAllergies(client?.allergies || "");
        break;
      case "phone":
        setEditPhone(client?.phoneNumber || "");
        break;
      case "email":
        setEditEmail(client?.email || "");
        break;
      case "mainDiagnosis":
        setEditMainDiagnosis(client?.mainDiagnosis || "");
        break;
      case "dob":
        setEditDob(client?.dateOfBirth || "");
        break;
      case "streetAddress":
        setEditStreetAddress(client?.streetAddress || "");
        break;
      case "suburb":
        setEditSuburb(client?.suburb || "");
        break;
      case "state":
        setEditState(client?.state || "");
        break;
      case "postcode":
        setEditPostcode(client?.postcode || "");
        break;
      case "parkingInstructions":
        setEditParkingInstructions(client?.parkingInstructions || "");
        break;
      case "address":
        setEditStreetAddress(client?.streetAddress || "");
        setEditSuburb(client?.suburb || "");
        setEditState(client?.state || "");
        setEditPostcode(client?.postcode || "");
        break;
      case "gp":
        setEditGpId(client?.generalPractitionerId || "");
        break;
      case "pharmacy":
        setEditPharmacyId(client?.pharmacyId || "");
        break;
      case "supportCoordinator":
        setEditSupportCoordinatorId(client?.careTeam?.supportCoordinatorId || "");
        break;
      case "nokEpoa":
        setEditNokEpoa(client?.nokEpoa || "");
        break;
      case "medicareNumber":
        setEditMedicareNumber(client?.medicareNumber || "");
        break;
      case "notificationsPreference":
        const notifPrefs = client?.notificationPreferences as NotificationPreferencesType;
        if (notifPrefs?.smsArrival || notifPrefs?.smsSchedule) {
          setEditNotificationsPreference("SMS");
        } else if (notifPrefs?.callArrival || notifPrefs?.callSchedule) {
          setEditNotificationsPreference("Call");
        } else if (notifPrefs?.none) {
          setEditNotificationsPreference("N/A");
        } else {
          setEditNotificationsPreference("Email");
        }
        break;
      case "emergencyContact":
        const nokInfo = client?.nokEpoa || "";
        const nokParts = nokInfo.split(' - ');
        setEditEmergencyContactName(nokParts[0] || "");
        setEditEmergencyContactRelationship(nokParts[1] || "");
        setEditEmergencyContactPhone(nokParts[2] || "");
        break;
      case "serviceType":
        setEditServiceType(client?.serviceType || "");
        break;
    }
  };

  const saveField = (field: string) => {
    switch (field) {
      case "riskScore":
        updateFieldMutation.mutate({ riskAssessmentScore: editRiskScore as any });
        break;
      case "allergies":
        updateFieldMutation.mutate({ allergies: editAllergies });
        break;
      case "phone":
        updateFieldMutation.mutate({ phoneNumber: editPhone });
        break;
      case "email":
        updateFieldMutation.mutate({ email: editEmail });
        break;
      case "mainDiagnosis":
        updateFieldMutation.mutate({ mainDiagnosis: editMainDiagnosis });
        break;
      case "dob":
        updateFieldMutation.mutate({ dateOfBirth: editDob });
        break;
      case "streetAddress":
        updateFieldMutation.mutate({ streetAddress: editStreetAddress });
        break;
      case "suburb":
        updateFieldMutation.mutate({ suburb: editSuburb });
        break;
      case "state":
        updateFieldMutation.mutate({ state: editState });
        break;
      case "postcode":
        updateFieldMutation.mutate({ postcode: editPostcode });
        break;
      case "parkingInstructions":
        updateFieldMutation.mutate({ parkingInstructions: editParkingInstructions });
        break;
      case "gp":
        updateFieldMutation.mutate({ generalPractitionerId: editGpId || null });
        break;
      case "pharmacy":
        updateFieldMutation.mutate({ pharmacyId: editPharmacyId || null });
        break;
      case "supportCoordinator":
        // Update careTeam JSON with the new support coordinator ID
        const currentCareTeam = client?.careTeam || {};
        updateFieldMutation.mutate({ 
          careTeam: { 
            ...currentCareTeam, 
            supportCoordinatorId: editSupportCoordinatorId || undefined 
          } as any 
        });
        break;
      case "nokEpoa":
        updateFieldMutation.mutate({ nokEpoa: editNokEpoa });
        break;
      case "medicareNumber":
        updateFieldMutation.mutate({ medicareNumber: editMedicareNumber });
        break;
      case "notificationsPreference":
        let newNotifPrefs: NotificationPreferencesType = {};
        switch (editNotificationsPreference) {
          case "SMS":
            newNotifPrefs = { smsArrival: true, smsSchedule: true };
            break;
          case "Call":
            newNotifPrefs = { callArrival: true, callSchedule: true };
            break;
          case "N/A":
            newNotifPrefs = { none: true };
            break;
          default:
            newNotifPrefs = {};
        }
        updateFieldMutation.mutate({ notificationPreferences: newNotifPrefs as any });
        break;
      case "emergencyContact":
        const emergencyInfo = [editEmergencyContactName, editEmergencyContactRelationship, editEmergencyContactPhone].filter(Boolean).join(' - ');
        updateFieldMutation.mutate({ nokEpoa: emergencyInfo });
        break;
      case "serviceType":
        updateFieldMutation.mutate({ serviceType: editServiceType as any });
        break;
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
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
  const getSahNumber = () => client.supportAtHomeDetails?.sahNumber;
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
    { id: "careplan", label: "Care Plan", icon: HeartPulse },
    { id: "services", label: "Services", icon: Clock },
    { id: "nonfacetoface", label: "Non-F2F Services", icon: PhoneCall },
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
              <div className="relative group cursor-pointer flex-shrink-0 flex items-center justify-center">
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 border-border rounded-full overflow-hidden bg-muted flex items-center justify-center"
                  data-testid="avatar-client"
                >
                  {client.photo ? (
                    <img src={client.photo} alt={client.participantName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg sm:text-xl md:text-2xl text-foreground font-bold">{getInitials(client.participantName)}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                  {client.photo ? (
                    <img src={client.photo} alt={client.participantName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl text-foreground font-bold">{getInitials(client.participantName)}</span>
                  )}
                </div>
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
              
              {client.category === "Support at Home" && getSahNumber() && (
                <div 
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 cursor-pointer hover-elevate transition-colors"
                  onClick={() => setActiveSection("program")}
                  data-testid="chip-sah"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-medium">SaH</p>
                    <p className="text-sm font-semibold font-mono text-foreground">{getSahNumber()}</p>
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
                  onClick={() => !editingField && startEditing("serviceType")}
                  data-testid="card-service-type"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs text-muted-foreground font-medium">Service Type</span>
                      {!isArchived && !editingField && (
                        <Pencil className="w-3 h-3 text-muted-foreground ml-auto" />
                      )}
                    </div>
                    {editingField === "serviceType" ? (
                      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select value={editServiceType} onValueChange={setEditServiceType}>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-service-type-inline">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Support Work">Support Work</SelectItem>
                            <SelectItem value="Nursing">Nursing</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("serviceType")} disabled={updateFieldMutation.isPending} data-testid="button-save-service-type">
                            {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing} data-testid="button-cancel-service-type">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold">{client.serviceType || 'Click to set'}</p>
                    )}
                  </CardContent>
                </Card>
                <Card 
                  className="bg-card hover-elevate cursor-pointer"
                  onClick={() => !editingField && startEditing("riskScore")}
                  data-testid="card-risk-score"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-muted-foreground font-medium">Risk Score</span>
                      {!isArchived && !editingField && (
                        <Pencil className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    {editingField === "riskScore" ? (
                      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select value={editRiskScore} onValueChange={setEditRiskScore}>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-risk-score-inline">
                            <SelectValue placeholder="Select level..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Level 1">Level 1 (Lowest)</SelectItem>
                            <SelectItem value="Level 2">Level 2</SelectItem>
                            <SelectItem value="Level 3">Level 3</SelectItem>
                            <SelectItem value="Level 4">Level 4</SelectItem>
                            <SelectItem value="Level 5">Level 5 (Highest)</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("riskScore")} disabled={updateFieldMutation.isPending} data-testid="button-save-risk-score">
                            {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing} data-testid="button-cancel-risk-score">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : client.riskAssessmentScore ? (
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          client.riskAssessmentScore === 'Level 1' || client.riskAssessmentScore === 'Level 2' ? 'bg-emerald-500' :
                          client.riskAssessmentScore === 'Level 3' ? 'bg-amber-500' :
                          'bg-red-500'
                        } text-white border-0 text-xs`}>
                          {client.riskAssessmentScore}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {client.riskAssessmentScore === 'Level 1' || client.riskAssessmentScore === 'Level 2' ? 'Low Risk' :
                           client.riskAssessmentScore === 'Level 3' ? 'Medium Risk' : 'High Risk'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-muted-foreground">Click to assess</p>
                    )}
                  </CardContent>
                </Card>
                <Card 
                  className="bg-card md:col-span-2 hover-elevate cursor-pointer"
                  onClick={() => !editingField && startEditing("parkingInstructions")}
                  data-testid="card-parking"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span className="text-xs text-muted-foreground font-medium">Parking / Access</span>
                      {!isArchived && !editingField && (
                        <Pencil className="w-3 h-3 text-muted-foreground ml-auto" />
                      )}
                    </div>
                    {editingField === "parkingInstructions" ? (
                      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editParkingInstructions}
                          onChange={(e) => setEditParkingInstructions(e.target.value)}
                          placeholder="Enter parking/access instructions..."
                          className="h-8 text-sm"
                          data-testid="input-parking-inline"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("parkingInstructions")} disabled={updateFieldMutation.isPending} data-testid="button-save-parking">
                            {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing} data-testid="button-cancel-parking">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold">{client.parkingInstructions || 'Click to add'}</p>
                    )}
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
                      <p className="text-xs text-muted-foreground">Click fields to edit</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phone - Inline Editable */}
                        <div 
                          className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg ${!isArchived && editingField !== "phone" ? "cursor-pointer hover-elevate" : ""}`}
                          onClick={() => editingField !== "phone" && startEditing("phone")}
                          data-testid="field-phone"
                        >
                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Phone</p>
                              {!isArchived && editingField !== "phone" && (
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            {editingField === "phone" ? (
                              <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder="Enter phone number..."
                                  className="h-8 text-sm"
                                  data-testid="input-phone-inline"
                                />
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("phone")} disabled={updateFieldMutation.isPending}>
                                    {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : client.phoneNumber ? (
                              <a href={`tel:${client.phoneNumber}`} className="text-sm font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                {client.phoneNumber}
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground">Click to add</p>
                            )}
                          </div>
                          {client.phoneNumber && editingField !== "phone" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => { e.stopPropagation(); copyToClipboard(client.phoneNumber!, 'Phone'); }}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {/* Email - Inline Editable */}
                        <div 
                          className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg ${!isArchived && editingField !== "email" ? "cursor-pointer hover-elevate" : ""}`}
                          onClick={() => editingField !== "email" && startEditing("email")}
                          data-testid="field-email"
                        >
                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Email</p>
                              {!isArchived && editingField !== "email" && (
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            {editingField === "email" ? (
                              <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  placeholder="Enter email address..."
                                  type="email"
                                  className="h-8 text-sm"
                                  data-testid="input-email-inline"
                                />
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("email")} disabled={updateFieldMutation.isPending}>
                                    {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : client.email ? (
                              <a href={`mailto:${client.email}`} className="text-sm font-medium hover:text-primary truncate block" data-testid="text-client-email" onClick={(e) => e.stopPropagation()}>
                                {client.email}
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground">Click to add</p>
                            )}
                          </div>
                          {client.email && editingField !== "email" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => { e.stopPropagation(); copyToClipboard(client.email!, 'Email'); }}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Notification Preferences - Inline Editable */}
                      <div 
                        className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg ${!isArchived && editingField !== "notificationsPreference" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "notificationsPreference" && startEditing("notificationsPreference")}
                        data-testid="field-notifications"
                      >
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Notification Preference</p>
                            {!isArchived && editingField !== "notificationsPreference" && (
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          {editingField === "notificationsPreference" ? (
                            <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Select value={editNotificationsPreference} onValueChange={setEditNotificationsPreference}>
                                <SelectTrigger className="h-8 text-sm" data-testid="select-notifications-inline">
                                  <SelectValue placeholder="Select preference..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Email">Email</SelectItem>
                                  <SelectItem value="SMS">SMS</SelectItem>
                                  <SelectItem value="Call">Phone Call</SelectItem>
                                  <SelectItem value="N/A">No Notifications</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("notificationsPreference")} disabled={updateFieldMutation.isPending}>
                                  {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm font-medium" data-testid="text-notification-pref">
                              {(() => {
                                const prefs = client.notificationPreferences as NotificationPreferencesType;
                                if (prefs?.none) return 'No Notifications';
                                const prefsList = [];
                                if (prefs?.smsArrival || prefs?.smsSchedule) prefsList.push('SMS');
                                if (prefs?.callArrival || prefs?.callSchedule) prefsList.push('Calls');
                                return prefsList.join(' & ') || 'Click to set';
                              })()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Address - Inline Editable */}
                      <div 
                        className={`flex items-start gap-3 p-3 bg-muted/30 rounded-lg ${!isArchived && editingField !== "address" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "address" && startEditing("address")}
                        data-testid="field-address"
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Address</p>
                            {!isArchived && editingField !== "address" && (
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          {editingField === "address" ? (
                            <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editStreetAddress}
                                onChange={(e) => setEditStreetAddress(e.target.value)}
                                placeholder="Street address..."
                                className="h-8 text-sm"
                                data-testid="input-street-address"
                              />
                              <div className="grid grid-cols-3 gap-1">
                                <Input
                                  value={editSuburb}
                                  onChange={(e) => setEditSuburb(e.target.value)}
                                  placeholder="Suburb"
                                  className="h-8 text-sm"
                                  data-testid="input-suburb"
                                />
                                <Input
                                  value={editState}
                                  onChange={(e) => setEditState(e.target.value)}
                                  placeholder="State"
                                  className="h-8 text-sm"
                                  data-testid="input-state"
                                />
                                <Input
                                  value={editPostcode}
                                  onChange={(e) => setEditPostcode(e.target.value)}
                                  placeholder="Postcode"
                                  className="h-8 text-sm"
                                  data-testid="input-postcode"
                                />
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-xs flex-1" onClick={() => {
                                  updateFieldMutation.mutate({ 
                                    streetAddress: editStreetAddress,
                                    suburb: editSuburb,
                                    state: editState,
                                    postcode: editPostcode
                                  });
                                }} disabled={updateFieldMutation.isPending}>
                                  {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium">
                                {client.streetAddress ? (
                                  <>
                                    {client.streetAddress}
                                    {(client.suburb || client.state || client.postcode) && <br />}
                                    {[client.suburb, client.state, client.postcode].filter(Boolean).join(' ')}
                                  </>
                                ) : client.homeAddress || 'Click to add address'}
                              </p>
                              {distanceData?.distanceKm !== null && distanceData?.distanceKm !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <Navigation className="w-3 h-3 inline mr-1" />
                                  {distanceData.distanceKm} km from office
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {(client.homeAddress || client.streetAddress) && editingField !== "address" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => { e.stopPropagation(); copyToClipboard(client.streetAddress || client.homeAddress!, 'Address'); }}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* Emergency Contact - Highlighted under address - Inline Editable */}
                      <div 
                        className={`p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 ${!isArchived && editingField !== "emergencyContact" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "emergencyContact" && startEditing("emergencyContact")}
                        data-testid="field-emergency-contact"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <p className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide">Emergency Contact</p>
                          </div>
                          {!isArchived && editingField !== "emergencyContact" && (
                            <Pencil className="w-3 h-3 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        {editingField === "emergencyContact" ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editEmergencyContactName}
                              onChange={(e) => setEditEmergencyContactName(e.target.value)}
                              placeholder="Contact name..."
                              className="h-8 text-sm"
                              data-testid="input-emergency-name"
                            />
                            <Input
                              value={editEmergencyContactPhone}
                              onChange={(e) => setEditEmergencyContactPhone(e.target.value)}
                              placeholder="Phone number..."
                              className="h-8 text-sm"
                              data-testid="input-emergency-phone"
                            />
                            <Select value={editEmergencyContactRelationship} onValueChange={setEditEmergencyContactRelationship}>
                              <SelectTrigger className="h-8 text-sm" data-testid="select-emergency-relationship">
                                <SelectValue placeholder="Relationship..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="parent">Parent</SelectItem>
                                <SelectItem value="child">Child</SelectItem>
                                <SelectItem value="sibling">Sibling</SelectItem>
                                <SelectItem value="friend">Friend</SelectItem>
                                <SelectItem value="carer">Carer</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("emergencyContact")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (() => {
                          const emergencyContacts = clientContacts.filter(c => c.isEmergencyContact === "yes" || c.isNok === "yes");
                          if (emergencyContacts.length > 0) {
                            return (
                              <div className="space-y-2">
                                {emergencyContacts.slice(0, 2).map((contact) => (
                                  <div key={contact.id} className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm">{contact.name}</p>
                                        <div className="flex gap-1">
                                          {contact.isNok === "yes" && <Badge variant="outline" className="text-xs h-5">NOK</Badge>}
                                          {contact.isEmergencyContact === "yes" && <Badge variant="destructive" className="text-xs h-5">Emergency</Badge>}
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground capitalize">{contact.relationship}</p>
                                    </div>
                                    {contact.phoneNumber && (
                                      <a href={`tel:${contact.phoneNumber}`} className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium" onClick={(e) => e.stopPropagation()}>
                                        <Phone className="w-3 h-3" />
                                        {contact.phoneNumber}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          if (client.nokEpoa) {
                            const nokParts = client.nokEpoa.split(' - ');
                            const name = nokParts[0];
                            const relationship = nokParts[1];
                            const phone = nokParts[2];
                            return (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm">{name}</p>
                                  {relationship && <p className="text-xs text-muted-foreground capitalize">{relationship}</p>}
                                </div>
                                {phone && (
                                  <a href={`tel:${phone}`} className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium" onClick={(e) => e.stopPropagation()}>
                                    <Phone className="w-3 h-3" />
                                    {phone}
                                  </a>
                                )}
                              </div>
                            );
                          }
                          return <p className="text-sm text-muted-foreground">Click to add emergency contact</p>;
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* GP and Pharmacy - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GP Information - Inline Editable */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        General Practitioner
                        {!isArchived && editingField !== "gp" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="ml-auto h-6 w-6" 
                            onClick={() => startEditing("gp")}
                            data-testid="button-edit-gp"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                        {gpDetails && client.generalPractitionerId && editingField !== "gp" && (
                          <Link 
                            href={`/gps?highlight=${client.generalPractitionerId}`}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground"
                            data-testid="link-gp-card"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editingField === "gp" ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <Select value={editGpId} onValueChange={setEditGpId}>
                            <SelectTrigger className="w-full" data-testid="select-gp-inline">
                              <SelectValue placeholder="Select a GP..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No GP assigned</SelectItem>
                              {gpsList.map((gp) => (
                                <SelectItem key={gp.id} value={gp.id}>
                                  {gp.name} {gp.practiceName && `(${gp.practiceName})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => {
                              if (editGpId === "none") setEditGpId("");
                              saveField("gp");
                            }} disabled={updateFieldMutation.isPending}>
                              {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={cancelEditing}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : gpDetails ? (
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
                          {!isArchived && (
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => startEditing("gp")}>
                              <Plus className="w-3 h-3 mr-1" /> Assign GP
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                    {/* Pharmacy Information - Inline Editable */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Pill className="w-4 h-4" />
                          Pharmacy
                          {!isArchived && editingField !== "pharmacy" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="ml-auto h-6 w-6" 
                              onClick={() => startEditing("pharmacy")}
                              data-testid="button-edit-pharmacy-left"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                          {pharmacyDetails && client.pharmacyId && editingField !== "pharmacy" && (
                            <Link 
                              href={`/pharmacies?highlight=${client.pharmacyId}`}
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground"
                              data-testid="link-pharmacy-card-left"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {editingField === "pharmacy" ? (
                          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                            <Select value={editPharmacyId} onValueChange={setEditPharmacyId}>
                              <SelectTrigger className="w-full" data-testid="select-pharmacy-inline-left">
                                <SelectValue placeholder="Select a Pharmacy..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No pharmacy assigned</SelectItem>
                                {pharmaciesList.map((pharmacy) => (
                                  <SelectItem key={pharmacy.id} value={pharmacy.id}>
                                    {pharmacy.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs flex-1" onClick={() => {
                                if (editPharmacyId === "none") setEditPharmacyId("");
                                saveField("pharmacy");
                              }} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : pharmacyDetails ? (
                          <div className="space-y-2">
                            <p className="font-semibold">{pharmacyDetails.name}</p>
                            {pharmacyDetails.phoneNumber && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <a href={`tel:${pharmacyDetails.phoneNumber}`} className="hover:text-primary">{pharmacyDetails.phoneNumber}</a>
                              </div>
                            )}
                            {pharmacyDetails.address && (
                              <p className="text-sm text-muted-foreground">{pharmacyDetails.address}</p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Pill className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">No pharmacy assigned</p>
                            {!isArchived && (
                              <Button variant="ghost" size="sm" className="mt-2" onClick={() => startEditing("pharmacy")}>
                                <Plus className="w-3 h-3 mr-1" /> Assign Pharmacy
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Right Column - Support Coordinator & Location Map */}
                <div className="space-y-6">
                  {/* Support Coordinator - Inline Editable */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        Support Coordinator
                        {!isArchived && editingField !== "supportCoordinator" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="ml-auto h-6 w-6" 
                            onClick={() => startEditing("supportCoordinator")}
                            data-testid="button-edit-support-coordinator"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                        {supportCoordinatorDetails && client.careTeam?.supportCoordinatorId && editingField !== "supportCoordinator" && (
                          <Link 
                            href={`/support-coordinators?highlight=${client.careTeam.supportCoordinatorId}`}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground"
                            data-testid="link-support-coordinator-card"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editingField === "supportCoordinator" ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <Select value={editSupportCoordinatorId} onValueChange={setEditSupportCoordinatorId}>
                            <SelectTrigger className="w-full" data-testid="select-support-coordinator-inline">
                              <SelectValue placeholder="Select a Support Coordinator..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No coordinator assigned</SelectItem>
                              {supportCoordinatorsList.map((sc) => (
                                <SelectItem key={sc.id} value={sc.id}>
                                  {sc.name} {sc.organisation && `(${sc.organisation})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => {
                              if (editSupportCoordinatorId === "none") setEditSupportCoordinatorId("");
                              saveField("supportCoordinator");
                            }} disabled={updateFieldMutation.isPending}>
                              {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={cancelEditing}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : supportCoordinatorDetails ? (
                        <div className="space-y-2">
                          <p className="font-semibold">{supportCoordinatorDetails.name}</p>
                          {supportCoordinatorDetails.organisation && (
                            <p className="text-sm text-muted-foreground">{supportCoordinatorDetails.organisation}</p>
                          )}
                          {supportCoordinatorDetails.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <a href={`tel:${supportCoordinatorDetails.phoneNumber}`} className="hover:text-primary">{supportCoordinatorDetails.phoneNumber}</a>
                            </div>
                          )}
                          {supportCoordinatorDetails.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <a href={`mailto:${supportCoordinatorDetails.email}`} className="hover:text-primary truncate">{supportCoordinatorDetails.email}</a>
                            </div>
                          )}
                        </div>
                      ) : client.careTeam?.supportCoordinator ? (
                        <div className="space-y-2">
                          <p className="font-semibold">{client.careTeam.supportCoordinator}</p>
                          <p className="text-sm text-muted-foreground">Contact details not available</p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <UserCog className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">No support coordinator assigned</p>
                          {!isArchived && (
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => startEditing("supportCoordinator")}>
                              <Plus className="w-3 h-3 mr-1" /> Assign Coordinator
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location Map - Under Support Coordinator */}
                  <ClientLocationMap
                    latitude={client.latitude}
                    longitude={client.longitude}
                    address={client.streetAddress ? `${client.streetAddress}, ${[client.suburb, client.state, client.postcode].filter(Boolean).join(' ')}` : client.homeAddress}
                    clientName={client.participantName}
                  />
                </div>
              </div>

              {/* Bottom Section - Program Summary (Standalone) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Program Info Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" />
                      Program Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
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
                          <div className="p-3 bg-muted/30 rounded-lg col-span-2">
                            <p className="text-xs text-muted-foreground">Funding Type</p>
                            <p className="text-sm font-semibold">{client.ndisDetails?.ndisFundingType || 'Not specified'}</p>
                          </div>
                        </>
                      )}
                      
                      {client.category === "Support at Home" && (
                        <>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">SaH Number</p>
                            <p className="text-sm font-semibold font-mono">{getSahNumber() || 'Not provided'}</p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg col-span-2">
                            <p className="text-xs text-muted-foreground">Funding Level</p>
                            <p className="text-sm font-semibold">{client.supportAtHomeDetails?.sahFundingLevel || 'Not specified'}</p>
                          </div>
                        </>
                      )}

                      {client.category === "Private" && client.medicareNumber && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 col-span-2">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">Medicare Number</p>
                          <p className="text-sm font-semibold font-mono text-emerald-900 dark:text-emerald-100">{client.medicareNumber}</p>
                        </div>
                      )}
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
                <TabsTrigger value="nonfacetoface" data-testid="tab-nonfacetoface">Non-F2F</TabsTrigger>
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
                    <p className="text-xs text-muted-foreground">Click fields to edit</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Date of Birth - Inline Editable */}
                      <div 
                        className={`p-3 -m-3 rounded-lg transition-colors ${!isArchived && editingField !== "dob" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "dob" && startEditing("dob")}
                        data-testid="field-dob"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                          {!isArchived && editingField !== "dob" && (
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {editingField === "dob" ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="date"
                              value={editDob}
                              onChange={(e) => setEditDob(e.target.value)}
                              className="h-8 text-sm"
                              data-testid="input-dob-inline"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("dob")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm mt-1 font-medium">{client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('en-AU') : "Click to add"}</p>
                        )}
                      </div>
                      
                      {/* Medicare Number - Inline Editable */}
                      <div 
                        className={`p-3 -m-3 rounded-lg transition-colors ${!isArchived && editingField !== "medicareNumber" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "medicareNumber" && startEditing("medicareNumber")}
                        data-testid="field-medicare-number"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Medicare Number</p>
                          {!isArchived && editingField !== "medicareNumber" && (
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {editingField === "medicareNumber" ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editMedicareNumber}
                              onChange={(e) => setEditMedicareNumber(e.target.value)}
                              placeholder="Enter Medicare number..."
                              className="h-8 text-sm font-mono"
                              data-testid="input-medicare-number-inline"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("medicareNumber")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm mt-1 font-mono">{client.medicareNumber || "Click to add"}</p>
                        )}
                      </div>
                      
                      {/* NOK / EPOA - Inline Editable */}
                      <div 
                        className={`p-3 -m-3 rounded-lg transition-colors ${!isArchived && editingField !== "nokEpoa" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "nokEpoa" && startEditing("nokEpoa")}
                        data-testid="field-nok-epoa"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next of Kin / EPOA</p>
                          {!isArchived && editingField !== "nokEpoa" && (
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {editingField === "nokEpoa" ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editNokEpoa}
                              onChange={(e) => setEditNokEpoa(e.target.value)}
                              placeholder="Enter NOK/EPOA..."
                              className="h-8 text-sm"
                              data-testid="input-nok-epoa-inline"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("nokEpoa")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm mt-1 font-medium">{client.nokEpoa || "Click to add"}</p>
                        )}
                      </div>
                      
                      {/* Category - Display only */}
                      <div className="p-3 -m-3">
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
                    <p className="text-xs text-muted-foreground">Critical info displayed in Overview alerts - click fields to edit</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Main Diagnosis - Inline Editable */}
                      <div 
                        className={`p-3 -m-3 rounded-lg transition-colors ${!isArchived && editingField !== "mainDiagnosis" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "mainDiagnosis" && startEditing("mainDiagnosis")}
                        data-testid="field-main-diagnosis"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Main Diagnosis</p>
                          {!isArchived && editingField !== "mainDiagnosis" && (
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {editingField === "mainDiagnosis" ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editMainDiagnosis}
                              onChange={(e) => setEditMainDiagnosis(e.target.value)}
                              placeholder="Enter diagnosis..."
                              className="h-8 text-sm"
                              data-testid="input-main-diagnosis-inline"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("mainDiagnosis")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm mt-1 font-medium">{client.mainDiagnosis || "Click to add"}</p>
                        )}
                      </div>

                      {/* Risk Score - Inline Editable */}
                      <div 
                        className={`p-3 -m-3 rounded-lg transition-colors ${!isArchived && editingField !== "riskScore" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "riskScore" && startEditing("riskScore")}
                        data-testid="field-risk-score"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Score</p>
                          {!isArchived && editingField !== "riskScore" && (
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {editingField === "riskScore" ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Select value={editRiskScore} onValueChange={setEditRiskScore}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select level..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Level 1">Level 1 (Lowest)</SelectItem>
                                <SelectItem value="Level 2">Level 2</SelectItem>
                                <SelectItem value="Level 3">Level 3</SelectItem>
                                <SelectItem value="Level 4">Level 4</SelectItem>
                                <SelectItem value="Level 5">Level 5 (Highest)</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("riskScore")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            {client.riskAssessmentScore ? (
                              <Badge className={`${
                                client.riskAssessmentScore === 'Level 1' || client.riskAssessmentScore === 'Level 2' ? 'bg-emerald-500' :
                                client.riskAssessmentScore === 'Level 3' ? 'bg-amber-500' :
                                'bg-red-500'
                              } text-white border-0`}>
                                {client.riskAssessmentScore}
                              </Badge>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">Click to assess</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Allergies - Inline Editable */}
                      <div 
                        className={`p-3 -m-3 rounded-lg transition-colors md:col-span-2 ${!isArchived && editingField !== "allergies" ? "cursor-pointer hover-elevate" : ""}`}
                        onClick={() => editingField !== "allergies" && startEditing("allergies")}
                        data-testid="field-allergies"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Allergies</p>
                          {!isArchived && editingField !== "allergies" && (
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        {editingField === "allergies" ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editAllergies}
                              onChange={(e) => setEditAllergies(e.target.value)}
                              placeholder="List any known allergies..."
                              className="h-8 text-sm border-red-200 dark:border-red-800"
                              data-testid="input-allergies-inline"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs flex-1" onClick={() => saveField("allergies")} disabled={updateFieldMutation.isPending}>
                                {updateFieldMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={cancelEditing}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : client.allergies ? (
                          <p className="text-sm mt-1 font-medium text-red-600 dark:text-red-400">{client.allergies}</p>
                        ) : (
                          <p className="text-sm mt-1 text-muted-foreground">No known allergies (click to add)</p>
                        )}
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
                <CardTitle className="text-base">Support at Home Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SaH Number</p>
                  <p className="text-sm mt-1 font-mono">{client.supportAtHomeDetails.sahNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SaH Funding Level</p>
                  <p className="text-sm mt-1">{client.supportAtHomeDetails.sahFundingLevel || "Not specified"}</p>
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
                {!client.careTeam?.careManager && !client.careTeam?.generalPractitioner && (
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

        {/* Non-Face-to-Face Services Tab */}
        <TabsContent value="nonfacetoface" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" />
                  Non-Face-to-Face Service Logs
                </CardTitle>
                {!isArchived && (
                  <Dialog open={addNonF2FOpen} onOpenChange={setAddNonF2FOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-nonf2f">
                        <Plus className="w-4 h-4 mr-1" />
                        Log Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Non-Face-to-Face Service</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Method *</Label>
                          <Select value={nonF2FMethod} onValueChange={(v: "email" | "phone" | "video_call" | "plan_review" | "document_review") => setNonF2FMethod(v)}>
                            <SelectTrigger data-testid="select-nonf2f-method">
                              <SelectValue placeholder="Select method..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone">Phone Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="video_call">Video Call</SelectItem>
                              <SelectItem value="plan_review">Plan Review</SelectItem>
                              <SelectItem value="document_review">Document Review</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Date & Time *</Label>
                          <Input 
                            type="datetime-local" 
                            value={nonF2FDateTime}
                            onChange={(e) => setNonF2FDateTime(e.target.value)}
                            data-testid="input-nonf2f-datetime"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input 
                            type="number" 
                            placeholder="e.g., 15"
                            value={nonF2FDuration}
                            onChange={(e) => setNonF2FDuration(e.target.value)}
                            data-testid="input-nonf2f-duration"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Location/Context</Label>
                          <Input 
                            placeholder="e.g., From office, Remote"
                            value={nonF2FLocation}
                            onChange={(e) => setNonF2FLocation(e.target.value)}
                            data-testid="input-nonf2f-location"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Summary *</Label>
                          <Textarea 
                            placeholder="Brief summary of the service provided..."
                            value={nonF2FSummary}
                            onChange={(e) => setNonF2FSummary(e.target.value)}
                            rows={3}
                            data-testid="textarea-nonf2f-summary"
                          />
                        </div>
                        <Button 
                          className="w-full" 
                          disabled={!nonF2FMethod || !nonF2FDateTime || !nonF2FSummary.trim() || addNonF2FMutation.isPending}
                          onClick={() => {
                            addNonF2FMutation.mutate({
                              method: nonF2FMethod,
                              contactDateTime: nonF2FDateTime,
                              durationMinutes: nonF2FDuration ? parseInt(nonF2FDuration) : undefined,
                              location: nonF2FLocation || undefined,
                              summary: nonF2FSummary.trim()
                            });
                          }}
                          data-testid="button-submit-nonf2f"
                        >
                          {addNonF2FMutation.isPending ? "Saving..." : "Save Log"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Track non-face-to-face client interactions (calls, emails, reviews)</p>
            </CardHeader>
            <CardContent>
              {nonFaceToFaceLogs.length > 0 ? (
                <div className="space-y-3">
                  {nonFaceToFaceLogs.map((log) => {
                    const methodLabels: Record<string, { label: string; icon: JSX.Element }> = {
                      phone: { label: "Phone Call", icon: <Phone className="w-4 h-4" /> },
                      email: { label: "Email", icon: <Mail className="w-4 h-4" /> },
                      video_call: { label: "Video Call", icon: <Activity className="w-4 h-4" /> },
                      plan_review: { label: "Plan Review", icon: <FileText className="w-4 h-4" /> },
                      document_review: { label: "Document Review", icon: <FileCheck className="w-4 h-4" /> },
                    };
                    const methodInfo = methodLabels[log.method] || { label: log.method, icon: <PhoneCall className="w-4 h-4" /> };
                    return (
                      <div 
                        key={log.id} 
                        className="p-4 border rounded-lg bg-muted/30"
                        data-testid={`nonf2f-log-${log.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {methodInfo.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary">{methodInfo.label}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.contactDateTime).toLocaleDateString('en-AU')} at {new Date(log.contactDateTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {log.durationMinutes && (
                                  <span className="text-xs text-muted-foreground">
                                    ({log.durationMinutes} min)
                                  </span>
                                )}
                              </div>
                              <p className="text-sm mt-2">{log.summary}</p>
                              {log.location && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {log.location}
                                </p>
                              )}
                            </div>
                          </div>
                          {!isArchived && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteNonF2FMutation.mutate(log.id)}
                              data-testid={`button-delete-nonf2f-${log.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <PhoneCall className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No non-face-to-face services logged</p>
                  {!isArchived && (
                    <p className="text-xs text-muted-foreground mt-1">Click "Log Service" to record phone calls, emails, or reviews</p>
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
