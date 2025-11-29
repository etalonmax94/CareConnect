import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays,
  startOfMonth, endOfMonth, addMonths, subMonths, isSameDay,
  parseISO, isToday, eachDayOfInterval, setHours, setMinutes,
  addMinutes, startOfDay, endOfDay
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar, CalendarDays, CalendarRange, Clock, Users, MapPin, Plus, Search,
  ChevronLeft, ChevronRight, Edit, Trash2, Eye, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, Settings, Sparkles, User, Building2,
  ArrowLeftRight, Hand, BarChart3, Award, CalendarPlus, Loader2, UserCircle,
  LayoutGrid, List, GripVertical, Copy, MoreHorizontal, StickyNote, Pin, PinOff,
  FileText, MessageSquare, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Target, Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { ClipboardList, LayoutTemplate, ChevronDown, CheckSquare, ClipboardCheck, Timer } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types
type CalendarViewType = "weekly" | "monthly" | "daily";
type ScheduleViewMode = "by-staff" | "by-client";

interface Client {
  id: string;
  participantName: string;
  firstName: string;
  lastName: string;
  category: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  ndisNumber?: string;
  serviceType?: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone?: string;
}

interface Shift {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  category: string;
  shiftType: string | null;
  status: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  durationMinutes: number;
  locationAddress: string | null;
  requiredStaffCount: number | null;
  assignedStaffCount: number | null;
  notes: string | null;
  color: string | null;
  allocations?: ShiftAllocation[];
}

interface ShiftAllocation {
  id: string;
  shiftId: string;
  staffId: string;
  status: string;
  role: string;
  staffName?: string;
}

interface OpenShift {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  locationAddress?: string;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  status: string;
  claimsCount?: number;
}

interface SwapRequest {
  id: string;
  status: string;
  requesterName?: string;
  targetName?: string;
  createdAt: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  shiftType?: string;
  tasks: { name: string; description?: string; isRequired: boolean }[];
  estimatedDurationMinutes?: number;
  requiredQualifications?: string[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  usageCount: number;
  isActive: boolean;
}

interface TaskItem {
  name: string;
  description?: string;
  isRequired: boolean;
}

const TEMPLATE_CATEGORIES = ["NDIS", "Support at Home", "Private"];
const TEMPLATE_SHIFT_TYPES = [
  "Morning Support",
  "Afternoon Support",
  "Evening Support",
  "Overnight Support",
  "Personal Care",
  "Community Access",
  "Transport",
  "Respite",
  "SIL Support",
  "Nursing",
  "Therapy",
  "Other"
];
const TEMPLATE_QUALIFICATIONS = [
  "First Aid",
  "CPR",
  "Manual Handling",
  "Medication Administration",
  "Behaviour Support",
  "Complex Care",
  "NDIS Worker Screening",
  "Working With Children Check",
  "Driver's License"
];

interface ScheduleSuggestion {
  id: string;
  title: string;
  description?: string;
  suggestedStaffName?: string;
  confidenceScore?: number;
  status: string;
}

interface AnalyticsData {
  period: string;
  totalShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  noShowShifts: number;
  totalHours: number;
  averageShiftDuration: number;
  openShiftFillRate: number;
  swapRequestsApproved: number;
  swapRequestsDenied: number;
  staffUtilization: number;
  clientCoverage: number;
  aiSuggestionsAccepted: number;
  aiSuggestionsDeclined: number;
  taskCompletionRate: number;
  onTimeStartRate: number;
  overtimeHours: number;
  topPerformingStaff: { id: string; name: string; score: number }[];
  shiftsByCategory: { category: string; count: number }[];
  shiftsByDayOfWeek: { day: string; count: number }[];
  trendComparison: {
    shiftsChange: number;
    hoursChange: number;
    utilizationChange: number;
    completionChange: number;
  };
}

interface Timesheet {
  id: string;
  staffId: string;
  staffName?: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  totalHours: string;
  weekdayHours: string;
  saturdayHours: string;
  sundayHours: string;
  publicHolidayHours: string;
  eveningHours: string;
  nightHours: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface TimesheetEntry {
  id: string;
  timesheetId: string;
  appointmentId?: string;
  clientId: string;
  clientName?: string;
  serviceType: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  totalHours: string;
  weekdayHours: string;
  saturdayHours: string;
  sundayHours: string;
  publicHolidayHours: string;
  eveningHours: string;
  nightHours: string;
  notes?: string;
}

interface DailyNote {
  id: string;
  clientId: string;
  date: string;
  title: string | null;
  content: string;
  priority: string | null;
  category: string | null;
  visibility: "all_staff" | "client_team" | "specific_staff" | "management_only" | null;
  visibleToStaffIds: string | null;
  visibleToRoles: string | null;
  createdById: string;
  createdByName: string | null;
  requiresAcknowledgement: string | null;
  acknowledgedByStaffIds: string | null;
  isActive: string | null;
  isPinned: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const noteCategoryColors: Record<string, string> = {
  general: "bg-slate-500",
  medication: "bg-green-500",
  behaviour: "bg-orange-500",
  safety: "bg-red-500",
  handover: "bg-blue-500",
};

// Status colors
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  published: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  open: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

const categoryColors: Record<string, string> = {
  "NDIS": "bg-indigo-500",
  "Support at Home": "bg-teal-500",
  "Private": "bg-amber-500",
};

const urgencyColors: Record<string, string> = {
  low: "border-l-green-500",
  medium: "border-l-yellow-500",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

export default function ASCSCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View state
  const [viewType, setViewType] = useState<CalendarViewType>("weekly");
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>("by-staff");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Dialog states
  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const [isViewShiftOpen, setIsViewShiftOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isOpenShiftsOpen, setIsOpenShiftsOpen] = useState(false);
  const [isSwapRequestsOpen, setIsSwapRequestsOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isDailyNotesOpen, setIsDailyNotesOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DailyNote | null>(null);
  const [showDailyNotesRow, setShowDailyNotesRow] = useState(true);

  // Templates slideout state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [templateFilterCategory, setTemplateFilterCategory] = useState<string>("all");
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    description: "",
    category: "NDIS",
    shiftType: "",
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    estimatedDurationMinutes: 480,
    requiredQualifications: [] as string[],
    tasks: [] as TaskItem[],
    isActive: true,
  });
  const [newTemplateTask, setNewTemplateTask] = useState({ name: "", description: "", isRequired: false });

  // Analytics state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30d");

  // Timesheets state
  const [isTimesheetsOpen, setIsTimesheetsOpen] = useState(false);
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState<string>("pending_approval");
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Daily note form state
  const [newNote, setNewNote] = useState({
    clientId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    content: "",
    priority: "normal",
    category: "general",
    visibility: "client_team" as DailyNote["visibility"],
    visibleToStaffIds: [] as string[],
    requiresAcknowledgement: "no",
    isPinned: "no",
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showOpenShifts, setShowOpenShifts] = useState(true);

  // For creating/editing shifts - pre-populated context
  const [shiftContext, setShiftContext] = useState<{
    staffId?: string;
    clientId?: string;
    date?: string;
  }>({});

  // New shift form state
  const [newShift, setNewShift] = useState({
    clientId: "",
    staffId: "",
    title: "",
    description: "",
    category: "NDIS",
    scheduledDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    locationAddress: "",
    notes: "",
    isOpenShift: false,
    urgencyLevel: "medium" as OpenShift["urgencyLevel"],
  });

  // Calculate date ranges based on view type
  const dateRange = useMemo(() => {
    if (viewType === "daily") {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      };
    } else if (viewType === "weekly") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        start: weekStart,
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }, [currentDate, viewType]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  // Queries
  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery<Shift[]>({
    queryKey: ["/api/css/shifts/calendar", format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await fetch(
        `/api/css/shifts/calendar?startDate=${format(dateRange.start, "yyyy-MM-dd")}&endDate=${format(dateRange.end, "yyyy-MM-dd")}`
      );
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
  });

  const { data: openShifts = [] } = useQuery<OpenShift[]>({
    queryKey: ["/api/ascs/open-shifts"],
  });

  const { data: swapRequests = [] } = useQuery<SwapRequest[]>({
    queryKey: ["/api/ascs/swap-requests"],
  });

  const { data: suggestions = [] } = useQuery<ScheduleSuggestion[]>({
    queryKey: ["/api/ascs/suggestions"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Daily Notes Query
  const { data: dailyNotes = [], refetch: refetchDailyNotes } = useQuery<DailyNote[]>({
    queryKey: ["/api/daily-notes", format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await fetch(
        `/api/daily-notes?startDate=${format(dateRange.start, "yyyy-MM-dd")}&endDate=${format(dateRange.end, "yyyy-MM-dd")}`
      );
      if (!res.ok) throw new Error("Failed to fetch daily notes");
      return res.json();
    },
  });

  // Shift Templates Query
  const { data: shiftTemplates = [], isLoading: templatesLoading } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/ascs/task-templates"],
  });

  // Analytics Query
  const analyticsDateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (analyticsPeriod) {
      case "7d": start = subWeeks(now, 1); break;
      case "14d": start = addDays(subWeeks(now, 2), 0); break;
      case "30d": start = addDays(subMonths(now, 1), 0); break;
      case "90d": start = addDays(subMonths(now, 3), 0); break;
      case "month": start = startOfMonth(now); end = endOfMonth(now); break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default: start = addDays(subMonths(now, 1), 0);
    }
    return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") };
  }, [analyticsPeriod]);

  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/ascs/analytics", analyticsDateRange],
    queryFn: async () => {
      const res = await fetch(
        `/api/ascs/analytics?startDate=${analyticsDateRange.startDate}&endDate=${analyticsDateRange.endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: isAnalyticsOpen, // Only fetch when analytics panel is open
  });

  // Timesheets query
  const { data: timesheets = [], isLoading: timesheetsLoading, refetch: refetchTimesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { status: timesheetStatusFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?status=${timesheetStatusFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch timesheets");
      return res.json();
    },
    enabled: isTimesheetsOpen, // Only fetch when timesheets panel is open
  });

  // Pending timesheets count for badge
  const { data: pendingTimesheetsCount = 0 } = useQuery<number>({
    queryKey: ["/api/timesheets/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/timesheets?status=pending_approval", { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    },
  });

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/css/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create shift");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] });
      // If a staff member was selected, assign them
      if (newShift.staffId && data.id) {
        assignStaffMutation.mutate({ shiftId: data.id, staffId: newShift.staffId });
      }
      toast({ title: "Shift created successfully" });
      setIsCreateShiftOpen(false);
      resetNewShiftForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create shift", description: error.message, variant: "destructive" });
    },
  });

  const assignStaffMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }: { shiftId: string; staffId: string }) => {
      const response = await fetch(`/api/css/shifts/${shiftId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, role: "primary" }),
      });
      if (!response.ok) throw new Error("Failed to assign staff");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] });
      setIsAssignDialogOpen(false);
      toast({ title: "Staff assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign staff", description: error.message, variant: "destructive" });
    },
  });

  const createOpenShiftMutation = useMutation({
    mutationFn: async (data: Partial<OpenShift>) => {
      return apiRequest("POST", "/api/ascs/open-shifts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/open-shifts"] });
      toast({ title: "Open shift created successfully" });
      setIsCreateShiftOpen(false);
      resetNewShiftForm();
    },
  });

  const claimOpenShiftMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }: { shiftId: string; staffId: string }) => {
      return apiRequest("POST", `/api/ascs/open-shifts/${shiftId}/claims`, { staffId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/open-shifts"] });
      toast({ title: "Shift claimed successfully" });
    },
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      return apiRequest("POST", `/api/ascs/suggestions/${suggestionId}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] });
      toast({ title: "Suggestion accepted" });
    },
  });

  // Daily Notes Mutations
  const createDailyNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating daily note with data:", data);
      const response = await fetch("/api/daily-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to create daily note");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-notes"] });
      toast({ title: "Daily note created successfully" });
      setIsCreateNoteOpen(false);
      resetNewNoteForm();
    },
    onError: (error: Error) => {
      console.error("Error creating daily note:", error);
      toast({ title: "Failed to create daily note", description: error.message, variant: "destructive" });
    },
  });

  const deleteDailyNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/daily-notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete daily note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-notes"] });
      toast({ title: "Daily note deleted" });
      setSelectedNote(null);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/daily-notes/${noteId}/toggle-pin`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to toggle pin");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-notes"] });
    },
  });

  // Template Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ascs/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/task-templates"] });
      toast({ title: "Template created successfully" });
      setIsCreateTemplateOpen(false);
      resetTemplateForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/ascs/task-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/task-templates"] });
      toast({ title: "Template updated successfully" });
      setIsEditTemplateOpen(false);
      setSelectedTemplate(null);
      resetTemplateForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ascs/task-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ascs/task-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
    },
  });

  // Timesheet mutations
  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to approve timesheet");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending-count"] });
      toast({ title: "Timesheet approved" });
      setViewingTimesheet(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve timesheet", description: error.message, variant: "destructive" });
    },
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }: { timesheetId: string; reason: string }) => {
      const response = await fetch(`/api/timesheets/${timesheetId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject timesheet");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/pending-count"] });
      toast({ title: "Timesheet rejected" });
      setViewingTimesheet(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject timesheet", description: error.message, variant: "destructive" });
    },
  });

  // Fetch timesheet entries when viewing
  const fetchTimesheetEntries = async (timesheet: Timesheet) => {
    try {
      const res = await fetch(`/api/timesheets/${timesheet.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTimesheetEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch timesheet entries:", error);
    }
    setViewingTimesheet(timesheet);
  };

  // Helper functions
  const resetNewShiftForm = () => {
    setNewShift({
      clientId: "",
      staffId: "",
      title: "",
      description: "",
      category: "NDIS",
      scheduledDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "17:00",
      locationAddress: "",
      notes: "",
      isOpenShift: false,
      urgencyLevel: "medium",
    });
    setShiftContext({});
  };

  const resetNewNoteForm = () => {
    setNewNote({
      clientId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      title: "",
      content: "",
      priority: "normal",
      category: "general",
      visibility: "client_team",
      visibleToStaffIds: [],
      requiresAcknowledgement: "no",
      isPinned: "no",
    });
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: "",
      description: "",
      category: "NDIS",
      shiftType: "",
      defaultStartTime: "09:00",
      defaultEndTime: "17:00",
      estimatedDurationMinutes: 480,
      requiredQualifications: [],
      tasks: [],
      isActive: true,
    });
    setNewTemplateTask({ name: "", description: "", isRequired: false });
  };

  const handleCreateTemplate = () => {
    if (!templateFormData.name) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }
    createTemplateMutation.mutate(templateFormData);
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate || !templateFormData.name) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data: templateFormData });
  };

  const handleEditTemplate = (template: ShiftTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      shiftType: template.shiftType || "",
      defaultStartTime: template.defaultStartTime || "09:00",
      defaultEndTime: template.defaultEndTime || "17:00",
      estimatedDurationMinutes: template.estimatedDurationMinutes || 480,
      requiredQualifications: template.requiredQualifications || [],
      tasks: template.tasks || [],
      isActive: template.isActive,
    });
    setIsEditTemplateOpen(true);
  };

  const addTemplateTask = () => {
    if (!newTemplateTask.name) return;
    setTemplateFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...newTemplateTask }],
    }));
    setNewTemplateTask({ name: "", description: "", isRequired: false });
  };

  const removeTemplateTask = (index: number) => {
    setTemplateFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const toggleTemplateQualification = (qual: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      requiredQualifications: prev.requiredQualifications.includes(qual)
        ? prev.requiredQualifications.filter(q => q !== qual)
        : [...prev.requiredQualifications, qual],
    }));
  };

  // Apply template to create a shift
  const applyTemplateToShift = (template: ShiftTemplate, date?: Date, staffId?: string, clientId?: string) => {
    const targetDate = date || new Date();
    const client = clientId ? getClientDetails(clientId) : null;

    setNewShift({
      clientId: clientId || "",
      staffId: staffId || "",
      title: template.name,
      description: template.description || "",
      category: template.category,
      scheduledDate: format(targetDate, "yyyy-MM-dd"),
      startTime: template.defaultStartTime || "09:00",
      endTime: template.defaultEndTime || "17:00",
      locationAddress: client
        ? [client.address, client.suburb, client.state, client.postcode].filter(Boolean).join(", ")
        : "",
      notes: template.tasks.length > 0
        ? `Tasks:\n${template.tasks.map(t => `- ${t.name}${t.isRequired ? " (required)" : ""}`).join("\n")}`
        : "",
      isOpenShift: false,
      urgencyLevel: "medium",
    });

    setIsTemplatesOpen(false);
    setIsCreateShiftOpen(true);
  };

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let filtered = shiftTemplates;
    if (templateSearchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(templateSearchTerm.toLowerCase())
      );
    }
    if (templateFilterCategory !== "all") {
      filtered = filtered.filter(t => t.category === templateFilterCategory);
    }
    return filtered;
  }, [shiftTemplates, templateSearchTerm, templateFilterCategory]);

  // Get daily notes for a specific client on a specific day
  const getNotesForClientAndDay = (clientId: string, day: Date) => {
    return dailyNotes.filter(note => {
      const noteDate = parseISO(note.date);
      return isSameDay(noteDate, day) && note.clientId === clientId;
    });
  };

  // Get all daily notes for a specific day
  const getNotesForDay = (day: Date) => {
    return dailyNotes.filter(note => {
      const noteDate = parseISO(note.date);
      return isSameDay(noteDate, day);
    });
  };

  const handleCreateNote = () => {
    if (!newNote.content || !newNote.clientId || !newNote.date) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    createDailyNoteMutation.mutate({
      ...newNote,
      visibleToStaffIds: newNote.visibleToStaffIds.length > 0 ? JSON.stringify(newNote.visibleToStaffIds) : null,
    });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.participantName || (client ? `${client.firstName} ${client.lastName}` : "Unknown");
  };

  const getClientDetails = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || "Unknown";
  };

  const getStaffInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Get shifts for a specific staff member on a specific day
  const getShiftsForStaffAndDay = (staffId: string, day: Date) => {
    return shifts.filter(shift => {
      const shiftDate = parseISO(shift.scheduledDate);
      const isAssigned = shift.allocations?.some(a => a.staffId === staffId);
      return isSameDay(shiftDate, day) && isAssigned;
    });
  };

  // Get shifts for a specific client on a specific day
  const getShiftsForClientAndDay = (clientId: string, day: Date) => {
    return shifts.filter(shift => {
      const shiftDate = parseISO(shift.scheduledDate);
      return isSameDay(shiftDate, day) && shift.clientId === clientId;
    });
  };

  // Get unassigned shifts for a day
  const getUnassignedShiftsForDay = (day: Date) => {
    return shifts.filter(shift => {
      const shiftDate = parseISO(shift.scheduledDate);
      const hasNoAssignments = !shift.allocations || shift.allocations.length === 0;
      return isSameDay(shiftDate, day) && hasNoAssignments;
    });
  };

  // Handle cell click to create shift
  const handleCellClick = useCallback((entityId: string, day: Date, entityType: "staff" | "client") => {
    const context = entityType === "staff"
      ? { staffId: entityId, date: format(day, "yyyy-MM-dd") }
      : { clientId: entityId, date: format(day, "yyyy-MM-dd") };

    setShiftContext(context);

    // Auto-populate form
    const client = entityType === "client" ? getClientDetails(entityId) : null;

    setNewShift(prev => ({
      ...prev,
      clientId: entityType === "client" ? entityId : "",
      staffId: entityType === "staff" ? entityId : "",
      scheduledDate: format(day, "yyyy-MM-dd"),
      category: client?.category || "NDIS",
      locationAddress: client ?
        [client.address, client.suburb, client.state, client.postcode].filter(Boolean).join(", ") : "",
      title: client ? `${client.participantName || `${client.firstName} ${client.lastName}`} - Support` : "",
    }));

    setIsCreateShiftOpen(true);
  }, [clients]);

  // Handle shift click to view/edit
  const handleShiftClick = useCallback((shift: Shift, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedShift(shift);
    setIsViewShiftOpen(true);
  }, []);

  const navigateCalendar = (direction: "prev" | "next") => {
    if (viewType === "daily") {
      setCurrentDate(prev => direction === "prev" ? addDays(prev, -1) : addDays(prev, 1));
    } else if (viewType === "weekly") {
      setCurrentDate(prev => direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateShift = () => {
    if (!newShift.title || !newShift.scheduledDate) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    if (newShift.isOpenShift) {
      createOpenShiftMutation.mutate({
        title: newShift.title,
        description: newShift.description,
        clientId: newShift.clientId || undefined,
        scheduledDate: newShift.scheduledDate,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        locationAddress: newShift.locationAddress,
        urgencyLevel: newShift.urgencyLevel,
        status: "open",
      });
    } else {
      createShiftMutation.mutate({
        title: newShift.title,
        description: newShift.description,
        clientId: newShift.clientId || null,
        category: newShift.category,
        scheduledDate: newShift.scheduledDate,
        scheduledStartTime: newShift.startTime,
        scheduledEndTime: newShift.endTime,
        locationAddress: newShift.locationAddress,
        notes: newShift.notes,
        status: "draft",
      });
    }
  };

  // When client is selected, auto-fill their details
  const handleClientSelect = (clientId: string) => {
    const client = getClientDetails(clientId);
    if (client) {
      const fullAddress = [client.address, client.suburb, client.state, client.postcode].filter(Boolean).join(", ");
      setNewShift(prev => ({
        ...prev,
        clientId,
        category: client.category || prev.category,
        locationAddress: fullAddress || prev.locationAddress,
        title: prev.title || `${client.participantName || `${client.firstName} ${client.lastName}`} - Support`,
      }));
    } else {
      setNewShift(prev => ({ ...prev, clientId }));
    }
  };

  // Filtered staff/clients for display
  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staffList;
    return staffList.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  const filteredClients = useMemo(() => {
    let filtered = clients;
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.participantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterCategory !== "all") {
      filtered = filtered.filter(c => c.category === filterCategory);
    }
    return filtered;
  }, [clients, searchTerm, filterCategory]);

  const pendingSwapsCount = swapRequests.filter(s => s.status === "pending").length;
  const openShiftsCount = openShifts.filter(s => s.status === "open").length;
  const pendingSuggestionsCount = suggestions.filter(s => s.status === "pending").length;

  // Render the Connecteam-style grid view
  const renderConnecteamView = () => {
    const entities = scheduleViewMode === "by-staff" ? filteredStaff : filteredClients;
    const days = viewType === "weekly" ? weekDays :
                 viewType === "daily" ? [currentDate] :
                 weekDays; // For monthly, still show week view but in the grid

    return (
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header row with days */}
        <div className="grid" style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(120px, 1fr))` }}>
          {/* Top-left corner - Search bar */}
          <div className="p-2 bg-muted border-b border-r sticky left-0 z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={scheduleViewMode === "by-staff" ? "Search staff..." : "Search clients..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Day headers - compact format: Mon 24/11 */}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 border-b flex items-center justify-center",
                isToday(day) ? "bg-primary/10 font-bold" : "bg-muted"
              )}
            >
              <div className={cn("text-sm", isToday(day) ? "text-primary" : "")}>
                {format(day, "EEE d/MM")}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px]">
          <div className="grid" style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(120px, 1fr))` }}>
            {/* Daily Notes row - TOP, slim row that expands with content */}
            {showDailyNotesRow && (
              <div className="contents">
                <div className="p-2 border-b border-r bg-blue-50 dark:bg-blue-950 sticky left-0 z-10 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                    <StickyNote className="w-3 h-3 text-blue-700 dark:text-blue-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs">Daily Notes</div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          resetNewNoteForm();
                          setIsCreateNoteOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add Daily Note</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {days.map((day) => {
                  const dayNotes = getNotesForDay(day);
                  return (
                    <div
                      key={`notes-${day.toISOString()}`}
                      className={cn(
                        "p-1 border-b min-h-[44px] bg-blue-50/50 dark:bg-blue-950/50 cursor-pointer flex items-start",
                        isToday(day) ? "bg-primary/5" : ""
                      )}
                      onClick={() => {
                        setNewNote(prev => ({ ...prev, date: format(day, "yyyy-MM-dd") }));
                        setIsCreateNoteOpen(true);
                      }}
                    >
                      <div className="space-y-0.5 w-full">
                        {dayNotes.map((note) => {
                          const client = getClientDetails(note.clientId);
                          return (
                            <div
                              key={note.id}
                              className={cn(
                                "p-1 rounded text-[11px] cursor-pointer hover:shadow-md transition-all",
                                priorityColors[note.priority || "normal"]
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNote(note);
                                setIsDailyNotesOpen(true);
                              }}
                            >
                              <div className="flex items-center gap-1">
                                {note.isPinned === "yes" && <Pin className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />}
                                <span className="font-medium truncate">
                                  {client?.participantName || `${client?.firstName} ${client?.lastName}` || "Unknown"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {dayNotes.length === 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-full min-h-[28px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add Note</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unassigned shifts row (only in staff view) */}
            {scheduleViewMode === "by-staff" && (
              <div className="contents">
                <div className="p-3 border-b border-r bg-amber-50 dark:bg-amber-950 sticky left-0 z-10 flex items-center gap-2 min-h-[80px]">
                  <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">Unassigned</div>
                    <div className="text-xs text-muted-foreground">Need staff</div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 relative"
                        onClick={() => setIsSuggestionsOpen(true)}
                      >
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        {pendingSuggestionsCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {pendingSuggestionsCount}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI Scheduling Suggestions</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {days.map((day) => {
                  const unassignedShifts = getUnassignedShiftsForDay(day);
                  return (
                    <div
                      key={`unassigned-${day.toISOString()}`}
                      className={cn(
                        "p-1 border-b min-h-[80px] bg-amber-50/50 dark:bg-amber-950/50 flex items-start",
                        isToday(day) ? "bg-primary/5" : ""
                      )}
                    >
                      <div className="space-y-1 w-full">
                        {unassignedShifts.map((shift) => {
                          const client = shift.clientId ? getClientDetails(shift.clientId) : null;
                          return (
                            <div
                              key={shift.id}
                              className="p-1.5 rounded text-xs cursor-pointer bg-amber-100 dark:bg-amber-900 hover:shadow-md transition-all"
                              onClick={(e) => handleShiftClick(shift, e)}
                            >
                              <div className="font-medium truncate">
                                {shift.scheduledStartTime?.slice(0, 5)} - {shift.scheduledEndTime?.slice(0, 5)}
                              </div>
                              <div className="truncate text-muted-foreground">
                                {client ? (client.participantName || `${client.firstName} ${client.lastName}`) : shift.title}
                              </div>
                            </div>
                          );
                        })}
                        {unassignedShifts.length === 0 && (
                          <div className="h-full min-h-[60px] flex items-center justify-center text-xs text-muted-foreground">
                            No unassigned
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {entities.map((entity) => {
              const entityId = entity.id;
              const entityName = scheduleViewMode === "by-staff"
                ? (entity as Staff).name
                : ((entity as Client).participantName || `${(entity as Client).firstName} ${(entity as Client).lastName}`);
              const entityRole = scheduleViewMode === "by-staff"
                ? (entity as Staff).role
                : (entity as Client).category;

              return (
                <div key={entityId} className="contents">
                  {/* Entity name column - sticky */}
                  <div className="p-3 border-b border-r bg-card sticky left-0 z-10 flex items-center gap-2 min-h-[80px]">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm bg-primary/10">
                        {scheduleViewMode === "by-staff"
                          ? getStaffInitials(entityName)
                          : entityName.charAt(0).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{entityName}</div>
                      <div className="text-xs text-muted-foreground truncate">{entityRole}</div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {days.map((day) => {
                    const dayShifts = scheduleViewMode === "by-staff"
                      ? getShiftsForStaffAndDay(entityId, day)
                      : getShiftsForClientAndDay(entityId, day);

                    return (
                      <div
                        key={`${entityId}-${day.toISOString()}`}
                        className={cn(
                          "p-1 border-b min-h-[80px] cursor-pointer transition-colors flex items-start",
                          isToday(day) ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => handleCellClick(entityId, day, scheduleViewMode === "by-staff" ? "staff" : "client")}
                      >
                        <div className="space-y-1 w-full">
                          {dayShifts.map((shift) => {
                            const client = shift.clientId ? getClientDetails(shift.clientId) : null;
                            return (
                              <div
                                key={shift.id}
                                className={cn(
                                  "p-1.5 rounded text-xs cursor-pointer transition-all hover:shadow-md",
                                  statusColors[shift.status || "draft"]
                                )}
                                onClick={(e) => handleShiftClick(shift, e)}
                              >
                                <div className="font-medium truncate flex items-center gap-1">
                                  <span>{shift.scheduledStartTime?.slice(0, 5)}</span>
                                  {shift.category && (
                                    <span className={cn(
                                      "w-2 h-2 rounded-full flex-shrink-0",
                                      categoryColors[shift.category] || "bg-gray-400"
                                    )} />
                                  )}
                                </div>
                                <div className="truncate text-muted-foreground">
                                  {scheduleViewMode === "by-staff" && client
                                    ? client.participantName || `${client.firstName} ${client.lastName}`
                                    : shift.title
                                  }
                                </div>
                                {scheduleViewMode === "by-client" && shift.allocations && shift.allocations.length > 0 && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {shift.allocations.map(a => a.staffName || getStaffName(a.staffId)).join(", ")}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Show + button when empty */}
                          {dayShifts.length === 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-full min-h-[60px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                  <Plus className="w-5 h-5 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add Shift</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Open shifts row */}
            {showOpenShifts && openShifts.filter(s => s.status === "open").length > 0 && (
              <div className="contents">
                <div className="p-3 border-b border-r bg-teal-50 dark:bg-teal-950 sticky left-0 z-10 flex items-center gap-2 min-h-[80px]">
                  <div className="h-10 w-10 rounded-full bg-teal-200 dark:bg-teal-800 flex items-center justify-center">
                    <Hand className="w-5 h-5 text-teal-700 dark:text-teal-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">Open Shifts</div>
                    <div className="text-xs text-muted-foreground">Available to claim</div>
                  </div>
                </div>

                {days.map((day) => {
                  const dayOpenShifts = openShifts.filter(s => {
                    const shiftDate = parseISO(s.scheduledDate);
                    return isSameDay(shiftDate, day) && s.status === "open";
                  });
                  return (
                    <div
                      key={`open-${day.toISOString()}`}
                      className={cn(
                        "p-1 border-b min-h-[80px] bg-teal-50/50 dark:bg-teal-950/50 flex items-start",
                        isToday(day) ? "bg-primary/5" : ""
                      )}
                    >
                      <div className="space-y-1 w-full">
                        {dayOpenShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className={cn(
                              "p-1.5 rounded text-xs cursor-pointer border-l-4 bg-teal-100 dark:bg-teal-900 hover:shadow-md transition-all",
                              urgencyColors[shift.urgencyLevel]
                            )}
                            onClick={() => setIsOpenShiftsOpen(true)}
                          >
                            <div className="font-medium truncate">
                              {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)}
                            </div>
                            <div className="truncate text-muted-foreground">{shift.title}</div>
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                              {shift.claimsCount || 0} claims
                            </Badge>
                          </div>
                        ))}
                        {dayOpenShifts.length === 0 && (
                          <div className="h-full min-h-[60px] flex items-center justify-center text-xs text-muted-foreground">
                            No open shifts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Scheduling Calendar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage shifts and staff allocations</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpenShiftsOpen(true)}
            className="relative"
          >
            <Hand className="w-4 h-4 mr-2" />
            Open Shifts
            {openShiftsCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-teal-500 text-white">
                {openShiftsCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSwapRequestsOpen(true)}
            className="relative"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Swaps
            {pendingSwapsCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">
                {pendingSwapsCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDailyNotesOpen(true)}
            className="relative"
          >
            <StickyNote className="w-4 h-4 mr-2" />
            Notes
            {dailyNotes.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-500 text-white">
                {dailyNotes.length}
              </Badge>
            )}
          </Button>

          {/* Templates button - visible only on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplatesOpen(true)}
            className="relative lg:hidden"
          >
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
            {shiftTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-indigo-500 text-white">
                {shiftTemplates.length}
              </Badge>
            )}
          </Button>

          {/* Analytics button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAnalyticsOpen(true)}
            className="relative"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>

          {/* Timesheets button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTimesheetsOpen(true)}
            className="relative"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Timesheets
            {pendingTimesheetsCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">
                {pendingTimesheetsCount}
              </Badge>
            )}
          </Button>

          <Button onClick={() => {
            resetNewShiftForm();
            setIsCreateShiftOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* View mode toggle and navigation */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View by Staff/Client toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={scheduleViewMode === "by-staff" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleViewMode("by-staff")}
                  className="h-7"
                >
                  <Users className="w-4 h-4 mr-1" />
                  By Staff
                </Button>
                <Button
                  variant={scheduleViewMode === "by-client" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleViewMode("by-client")}
                  className="h-7"
                >
                  <UserCircle className="w-4 h-4 mr-1" />
                  By Client
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* Week/Day view toggle */}
              <Tabs value={viewType} onValueChange={(v) => setViewType(v as CalendarViewType)}>
                <TabsList className="h-8">
                  <TabsTrigger value="daily" className="h-7 text-xs">Day</TabsTrigger>
                  <TabsTrigger value="weekly" className="h-7 text-xs">Week</TabsTrigger>
                </TabsList>
              </Tabs>

              <Separator orientation="vertical" className="h-8" />

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateCalendar("prev")}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateCalendar("next")}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium ml-2">
                  {viewType === "daily" && format(currentDate, "EEEE, MMMM d, yyyy")}
                  {viewType === "weekly" && `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              {scheduleViewMode === "by-client" && (
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="NDIS">NDIS</SelectItem>
                    <SelectItem value="Support at Home">Support at Home</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="show-open"
                  checked={showOpenShifts}
                  onCheckedChange={setShowOpenShifts}
                />
                <Label htmlFor="show-open" className="text-xs cursor-pointer whitespace-nowrap">
                  Open Shifts
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="show-notes"
                  checked={showDailyNotesRow}
                  onCheckedChange={setShowDailyNotesRow}
                />
                <Label htmlFor="show-notes" className="text-xs cursor-pointer whitespace-nowrap">
                  Notes
                </Label>
              </div>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchShifts()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {shiftsLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        renderConnecteamView()
      )}

      {/* Create Shift Dialog */}
      <Dialog open={isCreateShiftOpen} onOpenChange={setIsCreateShiftOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5" />
              Add New Shift
            </DialogTitle>
            <DialogDescription>
              {shiftContext.staffId && `Adding shift for ${getStaffName(shiftContext.staffId)}`}
              {shiftContext.clientId && `Adding shift for ${getClientName(shiftContext.clientId)}`}
              {shiftContext.date && ` on ${format(parseISO(shiftContext.date), "MMMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Switch
                id="is-open-shift"
                checked={newShift.isOpenShift}
                onCheckedChange={(checked) => setNewShift(prev => ({ ...prev, isOpenShift: checked }))}
              />
              <Label htmlFor="is-open-shift" className="flex items-center gap-2 cursor-pointer">
                <Hand className="w-4 h-4" />
                Post as Open Shift
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Client Selection - auto-fills other fields */}
              <div className="col-span-2">
                <Label htmlFor="client">Client (auto-fills address & category)</Label>
                <Select
                  value={newShift.clientId}
                  onValueChange={handleClientSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {client.category === "Support at Home" ? "SaH" : client.category || "N/A"}
                          </Badge>
                          {client.participantName || `${client.firstName} ${client.lastName}`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Assignment (only for regular shifts) */}
              {!newShift.isOpenShift && (
                <div className="col-span-2">
                  <Label htmlFor="staff">Assign Staff</Label>
                  <Select
                    value={newShift.staffId}
                    onValueChange={(v) => setNewShift(prev => ({ ...prev, staffId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(staff => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <span>{staff.name}</span>
                            <span className="text-xs text-muted-foreground">({staff.role})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newShift.title}
                  onChange={(e) => setNewShift(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Morning Support Shift"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newShift.category}
                  onValueChange={(v) => setNewShift(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NDIS">NDIS</SelectItem>
                    <SelectItem value="Support at Home">Support at Home</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newShift.isOpenShift && (
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={newShift.urgencyLevel}
                    onValueChange={(v: OpenShift["urgencyLevel"]) => setNewShift(prev => ({ ...prev, urgencyLevel: v }))}
                  >
                    <SelectTrigger>
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
              )}

              <div className={newShift.isOpenShift ? "" : "col-span-2"}>
                <Label htmlFor="date">Date *</Label>
                <DatePicker
                  id="date"
                  value={newShift.scheduledDate}
                  onChange={(value) => setNewShift(prev => ({ ...prev, scheduledDate: value }))}
                  placeholder="Select date"
                />
              </div>

              <div>
                <Label htmlFor="start">Start Time</Label>
                <TimePicker
                  id="start"
                  value={newShift.startTime}
                  onChange={(value) => setNewShift(prev => ({ ...prev, startTime: value }))}
                  placeholder="Start time"
                  minuteStep={15}
                />
              </div>

              <div>
                <Label htmlFor="end">End Time</Label>
                <TimePicker
                  id="end"
                  value={newShift.endTime}
                  onChange={(value) => setNewShift(prev => ({ ...prev, endTime: value }))}
                  placeholder="End time"
                  minuteStep={15}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="location">Location (auto-filled from client)</Label>
                <Input
                  id="location"
                  value={newShift.locationAddress}
                  onChange={(e) => setNewShift(prev => ({ ...prev, locationAddress: e.target.value }))}
                  placeholder="Enter address"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Notes</Label>
                <Textarea
                  id="description"
                  value={newShift.description}
                  onChange={(e) => setNewShift(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setIsCreateShiftOpen(false); resetNewShiftForm(); }}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {/* Save as Template button */}
              <Button
                variant="secondary"
                onClick={() => {
                  // Pre-fill template form from shift data
                  setTemplateFormData({
                    name: newShift.title || "",
                    description: newShift.description || "",
                    category: newShift.category || "NDIS",
                    shiftType: "",
                    defaultStartTime: newShift.startTime || "09:00",
                    defaultEndTime: newShift.endTime || "17:00",
                    estimatedDurationMinutes: 480,
                    requiredQualifications: [],
                    tasks: newShift.notes ? newShift.notes.split("\n").filter(Boolean).map(t => ({ name: t.replace(/^-\s*/, ""), description: "", isRequired: false })) : [],
                    isActive: true,
                  });
                  setIsCreateTemplateOpen(true);
                }}
                disabled={!newShift.title}
                title="Save this shift configuration as a reusable template"
              >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
              <Button
                onClick={handleCreateShift}
                disabled={createShiftMutation.isPending || createOpenShiftMutation.isPending}
              >
                {(createShiftMutation.isPending || createOpenShiftMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  newShift.isOpenShift ? "Post Open Shift" : "Create Shift"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Shift Dialog */}
      <Dialog open={isViewShiftOpen} onOpenChange={setIsViewShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedShift?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedShift && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedShift.status || "draft"]}>
                  {(selectedShift.status || "draft").replace("_", " ")}
                </Badge>
                {selectedShift.category && (
                  <Badge variant="outline">{selectedShift.category}</Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedShift.scheduledStartTime} - {selectedShift.scheduledEndTime}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{format(parseISO(selectedShift.scheduledDate), "EEEE, MMMM d, yyyy")}</span>
                </div>

                {selectedShift.clientId && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{getClientName(selectedShift.clientId)}</span>
                  </div>
                )}

                {selectedShift.locationAddress && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedShift.locationAddress}</span>
                  </div>
                )}

                {selectedShift.allocations && selectedShift.allocations.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Assigned Staff</div>
                      <div className="text-muted-foreground">
                        {selectedShift.allocations.map(a => a.staffName || getStaffName(a.staffId)).join(", ")}
                      </div>
                    </div>
                  </div>
                )}

                {selectedShift.notes && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {selectedShift.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsViewShiftOpen(false)}>
              Close
            </Button>
            {selectedShift && (!selectedShift.allocations || selectedShift.allocations.length === 0) && (
              <Button onClick={() => {
                setIsViewShiftOpen(false);
                setIsAssignDialogOpen(true);
              }}>
                <Users className="w-4 h-4 mr-2" />
                Assign Staff
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff to Shift</DialogTitle>
            <DialogDescription>
              {selectedShift?.title} on {selectedShift?.scheduledDate}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-4">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    if (selectedShift) {
                      assignStaffMutation.mutate({ shiftId: selectedShift.id, staffId: staff.id });
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getStaffInitials(staff.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">{staff.role}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Open Shifts Dialog */}
      <Dialog open={isOpenShiftsOpen} onOpenChange={setIsOpenShiftsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hand className="w-5 h-5 text-teal-600" />
              Open Shifts Marketplace
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-4">
              {openShifts.filter(s => s.status === "open").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open shifts available
                </div>
              ) : (
                openShifts.filter(s => s.status === "open").map((shift) => (
                  <Card key={shift.id} className={cn("border-l-4", urgencyColors[shift.urgencyLevel])}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{shift.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(parseISO(shift.scheduledDate), "EEE, MMM d")} | {shift.startTime} - {shift.endTime}
                          </div>
                          {shift.locationAddress && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" /> {shift.locationAddress}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline">{shift.urgencyLevel}</Badge>
                          <div className="text-xs text-muted-foreground">{shift.claimsCount || 0} claims</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Swap Requests Dialog */}
      <Dialog open={isSwapRequestsOpen} onOpenChange={setIsSwapRequestsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Shift Swap Requests
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-4">
              {swapRequests.filter(s => s.status === "pending").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending swap requests
                </div>
              ) : (
                swapRequests.filter(s => s.status === "pending").map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{request.requesterName}</div>
                          <div className="text-sm text-muted-foreground">
                            Wants to swap with {request.targetName || "anyone"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-red-600">
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Scheduling Suggestions
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-4">
              {suggestions.filter(s => s.status === "pending").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No pending suggestions</p>
                </div>
              ) : (
                suggestions.filter(s => s.status === "pending").map((suggestion) => (
                  <Card key={suggestion.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{suggestion.title}</div>
                          {suggestion.description && (
                            <div className="text-sm text-muted-foreground mt-1">{suggestion.description}</div>
                          )}
                          {suggestion.suggestedStaffName && (
                            <div className="text-sm mt-2">
                              Suggested: {suggestion.suggestedStaffName}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <XCircle className="w-4 h-4 mr-1" />
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Daily Notes List Dialog */}
      <Dialog open={isDailyNotesOpen} onOpenChange={setIsDailyNotesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-blue-600" />
              Daily Notes
            </DialogTitle>
            <DialogDescription>
              Notes for staff looking after clients
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {dailyNotes.length} note{dailyNotes.length !== 1 ? "s" : ""} in view
            </div>
            <Button onClick={() => {
              setIsDailyNotesOpen(false);
              resetNewNoteForm();
              setIsCreateNoteOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3">
              {dailyNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <StickyNote className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No daily notes for this period</p>
                </div>
              ) : (
                dailyNotes.map((note) => {
                  const client = getClientDetails(note.clientId);
                  return (
                    <Card key={note.id} className={cn(
                      "border-l-4",
                      note.priority === "urgent" ? "border-l-red-500" :
                      note.priority === "high" ? "border-l-orange-500" :
                      "border-l-blue-500"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {note.isPinned === "yes" && <Pin className="w-4 h-4 text-blue-600" />}
                              <span className="font-medium">
                                {client?.participantName || `${client?.firstName} ${client?.lastName}` || "Unknown Client"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {note.category || "general"}
                              </Badge>
                              <Badge className={priorityColors[note.priority || "normal"]}>
                                {note.priority || "normal"}
                              </Badge>
                            </div>
                            {note.title && (
                              <div className="font-medium text-sm">{note.title}</div>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              {note.content}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                              <span>{format(parseISO(note.date), "EEE, MMM d")}</span>
                              <span>•</span>
                              <span>by {note.createdByName || "Unknown"}</span>
                              {note.visibility && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    {note.visibility.replace("_", " ")}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => togglePinMutation.mutate(note.id)}>
                                {note.isPinned === "yes" ? (
                                  <>
                                    <PinOff className="w-4 h-4 mr-2" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="w-4 h-4 mr-2" />
                                    Pin Note
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => deleteDailyNoteMutation.mutate(note.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Daily Note Dialog */}
      <Dialog open={isCreateNoteOpen} onOpenChange={setIsCreateNoteOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-blue-600" />
              Create Daily Note
            </DialogTitle>
            <DialogDescription>
              Add a note visible to staff looking after a specific client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="note-client">Client *</Label>
              <Select
                value={newNote.clientId}
                onValueChange={(v) => setNewNote(prev => ({ ...prev, clientId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.participantName || `${client.firstName} ${client.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="note-date">Date *</Label>
              <DatePicker
                id="note-date"
                value={newNote.date}
                onChange={(value) => setNewNote(prev => ({ ...prev, date: value }))}
                placeholder="Select date"
              />
            </div>

            <div>
              <Label htmlFor="note-title">Title (optional)</Label>
              <Input
                id="note-title"
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief title for the note"
              />
            </div>

            <div>
              <Label htmlFor="note-content">Content *</Label>
              <Textarea
                id="note-content"
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What should staff know about this client today?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={newNote.category}
                  onValueChange={(v) => setNewNote(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="behaviour">Behaviour</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="handover">Handover</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={newNote.priority}
                  onValueChange={(v) => setNewNote(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={newNote.visibility || "client_team"}
                onValueChange={(v) => setNewNote(prev => ({ ...prev, visibility: v as DailyNote["visibility"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_staff">All Staff</SelectItem>
                  <SelectItem value="client_team">Client's Team Only</SelectItem>
                  <SelectItem value="specific_staff">Specific Staff</SelectItem>
                  <SelectItem value="management_only">Management Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Who can see this note
              </p>
            </div>

            {newNote.visibility === "specific_staff" && (
              <div>
                <Label>Select Staff Members</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  {staffList.map(staff => (
                    <div key={staff.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id={`staff-${staff.id}`}
                        checked={newNote.visibleToStaffIds.includes(staff.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewNote(prev => ({
                              ...prev,
                              visibleToStaffIds: [...prev.visibleToStaffIds, staff.id]
                            }));
                          } else {
                            setNewNote(prev => ({
                              ...prev,
                              visibleToStaffIds: prev.visibleToStaffIds.filter(id => id !== staff.id)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`staff-${staff.id}`} className="text-sm cursor-pointer">
                        {staff.name}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="note-pinned"
                checked={newNote.isPinned === "yes"}
                onCheckedChange={(checked) => setNewNote(prev => ({ ...prev, isPinned: checked ? "yes" : "no" }))}
              />
              <Label htmlFor="note-pinned" className="cursor-pointer">
                Pin this note (shows at top)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateNoteOpen(false);
              resetNewNoteForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={createDailyNoteMutation.isPending}
            >
              {createDailyNoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Note"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky Templates Button - visible only on large screens */}
      <div
        onClick={() => setIsTemplatesOpen(true)}
        className={cn(
          "hidden lg:flex",
          "flex-col items-center gap-1 py-4 px-2",
          "rounded-l-lg rounded-r-none",
          "bg-indigo-600 hover:bg-indigo-700 text-white",
          "shadow-lg hover:shadow-xl transition-all cursor-pointer",
          "border-l border-y border-indigo-500",
          isTemplatesOpen && "opacity-0 pointer-events-none"
        )}
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
        }}
      >
        <LayoutTemplate className="w-5 h-5" />
        <span className="text-xs font-medium" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
          Templates
        </span>
        {shiftTemplates.length > 0 && (
          <Badge className="mt-1 bg-white text-indigo-600 hover:bg-white text-xs px-1.5 py-0">
            {shiftTemplates.length}
          </Badge>
        )}
      </div>

      {/* Templates Slideout Panel */}
      <Sheet open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              Shift Templates
            </SheetTitle>
            <SheetDescription>
              Create and manage reusable shift templates. Click on a template to apply it to the calendar.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={templateFilterCategory} onValueChange={setTemplateFilterCategory}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Create New Template Button */}
            <Button
              className="w-full"
              onClick={() => {
                resetTemplateForm();
                setIsCreateTemplateOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Template
            </Button>

            {/* Templates List */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>No templates found</p>
                    <p className="text-sm">Create your first template to get started</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <Card key={template.id} className={cn(
                      "cursor-pointer hover:shadow-md transition-all",
                      !template.isActive && "opacity-60"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0" onClick={() => applyTemplateToShift(template)}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{template.name}</span>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                categoryColors[template.category] ? "text-white" : ""
                              )} style={{
                                backgroundColor: categoryColors[template.category]?.replace("bg-", "")
                              }}>
                                {template.category}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {template.defaultStartTime && template.defaultEndTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.defaultStartTime} - {template.defaultEndTime}
                                </span>
                              )}
                              {template.shiftType && (
                                <Badge variant="secondary" className="text-xs">{template.shiftType}</Badge>
                              )}
                              {template.tasks.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3" />
                                  {template.tasks.length} tasks
                                </span>
                              )}
                            </div>
                            {template.requiredQualifications && template.requiredQualifications.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.requiredQualifications.slice(0, 3).map(qual => (
                                  <Badge key={qual} variant="outline" className="text-[10px]">
                                    <Award className="w-2 h-2 mr-1" />
                                    {qual}
                                  </Badge>
                                ))}
                                {template.requiredQualifications.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    +{template.requiredQualifications.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => applyTemplateToShift(template)}>
                                <CalendarPlus className="w-4 h-4 mr-2" />
                                Apply to Calendar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Template
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                resetTemplateForm();
                                setTemplateFormData({
                                  ...templateFormData,
                                  name: `${template.name} (Copy)`,
                                  description: template.description || "",
                                  category: template.category,
                                  shiftType: template.shiftType || "",
                                  defaultStartTime: template.defaultStartTime || "09:00",
                                  defaultEndTime: template.defaultEndTime || "17:00",
                                  estimatedDurationMinutes: template.estimatedDurationMinutes || 480,
                                  requiredQualifications: template.requiredQualifications || [],
                                  tasks: template.tasks || [],
                                  isActive: true,
                                });
                                setIsCreateTemplateOpen(true);
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Template Dialog */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              Create Shift Template
            </DialogTitle>
            <DialogDescription>
              Create a reusable template for quickly scheduling shifts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Morning Personal Care"
              />
            </div>

            <div>
              <Label htmlFor="template-desc">Description</Label>
              <Textarea
                id="template-desc"
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this shift type..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={templateFormData.category}
                  onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Shift Type</Label>
                <Select
                  value={templateFormData.shiftType}
                  onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, shiftType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_SHIFT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Start Time</Label>
                <TimePicker
                  value={templateFormData.defaultStartTime}
                  onChange={(v) => setTemplateFormData(prev => ({ ...prev, defaultStartTime: v }))}
                  minuteStep={15}
                />
              </div>
              <div>
                <Label>Default End Time</Label>
                <TimePicker
                  value={templateFormData.defaultEndTime}
                  onChange={(v) => setTemplateFormData(prev => ({ ...prev, defaultEndTime: v }))}
                  minuteStep={15}
                />
              </div>
            </div>

            <div>
              <Label>Required Qualifications</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {TEMPLATE_QUALIFICATIONS.map(qual => (
                  <div key={qual} className="flex items-center gap-2">
                    <Checkbox
                      id={`qual-${qual}`}
                      checked={templateFormData.requiredQualifications.includes(qual)}
                      onCheckedChange={() => toggleTemplateQualification(qual)}
                    />
                    <Label htmlFor={`qual-${qual}`} className="text-sm cursor-pointer">
                      {qual}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Tasks</Label>
              <div className="space-y-2 mt-2">
                {templateFormData.tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground">{task.description}</div>
                      )}
                    </div>
                    {task.isRequired && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeTemplateTask(index)}
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Task name"
                    value={newTemplateTask.name}
                    onChange={(e) => setNewTemplateTask(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Checkbox
                      id="task-required"
                      checked={newTemplateTask.isRequired}
                      onCheckedChange={(checked) => setNewTemplateTask(prev => ({ ...prev, isRequired: !!checked }))}
                    />
                    <Label htmlFor="task-required" className="text-xs cursor-pointer whitespace-nowrap">
                      Required
                    </Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={addTemplateTask}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="template-active"
                checked={templateFormData.isActive}
                onCheckedChange={(checked) => setTemplateFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="template-active" className="cursor-pointer">
                Template is active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateTemplateOpen(false);
              resetTemplateForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-600" />
              Edit Template
            </DialogTitle>
            <DialogDescription>
              Update the template details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-template-name">Template Name *</Label>
              <Input
                id="edit-template-name"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Morning Personal Care"
              />
            </div>

            <div>
              <Label htmlFor="edit-template-desc">Description</Label>
              <Textarea
                id="edit-template-desc"
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this shift type..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={templateFormData.category}
                  onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Shift Type</Label>
                <Select
                  value={templateFormData.shiftType}
                  onValueChange={(v) => setTemplateFormData(prev => ({ ...prev, shiftType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_SHIFT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Start Time</Label>
                <TimePicker
                  value={templateFormData.defaultStartTime}
                  onChange={(v) => setTemplateFormData(prev => ({ ...prev, defaultStartTime: v }))}
                  minuteStep={15}
                />
              </div>
              <div>
                <Label>Default End Time</Label>
                <TimePicker
                  value={templateFormData.defaultEndTime}
                  onChange={(v) => setTemplateFormData(prev => ({ ...prev, defaultEndTime: v }))}
                  minuteStep={15}
                />
              </div>
            </div>

            <div>
              <Label>Required Qualifications</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {TEMPLATE_QUALIFICATIONS.map(qual => (
                  <div key={qual} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-qual-${qual}`}
                      checked={templateFormData.requiredQualifications.includes(qual)}
                      onCheckedChange={() => toggleTemplateQualification(qual)}
                    />
                    <Label htmlFor={`edit-qual-${qual}`} className="text-sm cursor-pointer">
                      {qual}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Tasks</Label>
              <div className="space-y-2 mt-2">
                {templateFormData.tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground">{task.description}</div>
                      )}
                    </div>
                    {task.isRequired && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeTemplateTask(index)}
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Task name"
                    value={newTemplateTask.name}
                    onChange={(e) => setNewTemplateTask(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Checkbox
                      id="edit-task-required"
                      checked={newTemplateTask.isRequired}
                      onCheckedChange={(checked) => setNewTemplateTask(prev => ({ ...prev, isRequired: !!checked }))}
                    />
                    <Label htmlFor="edit-task-required" className="text-xs cursor-pointer whitespace-nowrap">
                      Required
                    </Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={addTemplateTask}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="edit-template-active"
                checked={templateFormData.isActive}
                onCheckedChange={(checked) => setTemplateFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-template-active" className="cursor-pointer">
                Template is active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditTemplateOpen(false);
              setSelectedTemplate(null);
              resetTemplateForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTemplate}
              disabled={updateTemplateMutation.isPending}
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Slideout Panel */}
      <Sheet open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Schedule Analytics
            </SheetTitle>
            <SheetDescription>
              Performance insights and workforce metrics
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="14d">Last 14 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetchAnalytics()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : analyticsData ? (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Shifts</p>
                          <p className="text-xl font-bold">{analyticsData.totalShifts}</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs",
                          analyticsData.trendComparison.shiftsChange >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {analyticsData.trendComparison.shiftsChange >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {analyticsData.trendComparison.shiftsChange >= 0 ? "+" : ""}{analyticsData.trendComparison.shiftsChange.toFixed(1)}%
                        </div>
                      </div>
                      <Progress value={(analyticsData.completedShifts / Math.max(analyticsData.totalShifts, 1)) * 100} className="mt-2 h-1" />
                      <p className="text-[10px] text-muted-foreground mt-1">{analyticsData.completedShifts} completed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Hours</p>
                          <p className="text-xl font-bold">{analyticsData.totalHours.toFixed(1)}h</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs",
                          analyticsData.trendComparison.hoursChange >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {analyticsData.trendComparison.hoursChange >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {analyticsData.trendComparison.hoursChange >= 0 ? "+" : ""}{analyticsData.trendComparison.hoursChange.toFixed(1)}%
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Avg: {analyticsData.averageShiftDuration.toFixed(1)}h
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Staff Utilization</p>
                          <p className="text-xl font-bold">{Math.round(analyticsData.staffUtilization)}%</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs",
                          analyticsData.trendComparison.utilizationChange >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {analyticsData.trendComparison.utilizationChange >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {analyticsData.trendComparison.utilizationChange >= 0 ? "+" : ""}{analyticsData.trendComparison.utilizationChange.toFixed(1)}%
                        </div>
                      </div>
                      <Progress value={analyticsData.staffUtilization} className="mt-2 h-1" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">On-Time Start</p>
                          <p className="text-xl font-bold">{Math.round(analyticsData.onTimeStartRate)}%</p>
                        </div>
                        <CheckCircle2 className={cn(
                          "w-6 h-6",
                          analyticsData.onTimeStartRate >= 90 ? "text-green-500" :
                          analyticsData.onTimeStartRate >= 75 ? "text-yellow-500" : "text-red-500"
                        )} />
                      </div>
                      <Progress value={analyticsData.onTimeStartRate} className="mt-2 h-1" />
                    </CardContent>
                  </Card>
                </div>

                {/* Shift Status Breakdown */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Shift Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>Completed</span>
                        </div>
                        <span className="font-medium">
                          {analyticsData.completedShifts} ({analyticsData.totalShifts > 0 ? Math.round((analyticsData.completedShifts / analyticsData.totalShifts) * 100) : 0}%)
                        </span>
                      </div>
                      <Progress value={analyticsData.totalShifts > 0 ? (analyticsData.completedShifts / analyticsData.totalShifts) * 100 : 0} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>Cancelled</span>
                        </div>
                        <span className="font-medium">
                          {analyticsData.cancelledShifts} ({analyticsData.totalShifts > 0 ? Math.round((analyticsData.cancelledShifts / analyticsData.totalShifts) * 100) : 0}%)
                        </span>
                      </div>
                      <Progress value={analyticsData.totalShifts > 0 ? (analyticsData.cancelledShifts / analyticsData.totalShifts) * 100 : 0} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span>No Show</span>
                        </div>
                        <span className="font-medium">
                          {analyticsData.noShowShifts} ({analyticsData.totalShifts > 0 ? Math.round((analyticsData.noShowShifts / analyticsData.totalShifts) * 100) : 0}%)
                        </span>
                      </div>
                      <Progress value={analyticsData.totalShifts > 0 ? (analyticsData.noShowShifts / analyticsData.totalShifts) * 100 : 0} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>

                {/* Open Shifts & Swaps */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Hand className="w-4 h-4" />
                      Open Shifts & Swaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="p-3 bg-teal-50 dark:bg-teal-950 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Open Shift Fill Rate</span>
                        <span className="text-lg font-bold text-teal-600">
                          {Math.round(analyticsData.openShiftFillRate)}%
                        </span>
                      </div>
                      <Progress value={analyticsData.openShiftFillRate} className="h-1.5" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <ArrowLeftRight className="w-5 h-5 mx-auto mb-1 text-green-500" />
                        <p className="text-lg font-bold">{analyticsData.swapRequestsApproved}</p>
                        <p className="text-[10px] text-muted-foreground">Swaps Approved</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <ArrowLeftRight className="w-5 h-5 mx-auto mb-1 text-red-500" />
                        <p className="text-lg font-bold">{analyticsData.swapRequestsDenied}</p>
                        <p className="text-[10px] text-muted-foreground">Swaps Denied</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Suggestions */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      AI Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-500" />
                        <p className="text-lg font-bold">{analyticsData.aiSuggestionsAccepted}</p>
                        <p className="text-[10px] text-muted-foreground">Accepted</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
                        <p className="text-lg font-bold">{analyticsData.aiSuggestionsDeclined}</p>
                        <p className="text-[10px] text-muted-foreground">Declined</p>
                      </div>
                    </div>

                    {analyticsData.aiSuggestionsAccepted + analyticsData.aiSuggestionsDeclined > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Acceptance Rate</span>
                          <span className="font-medium">
                            {Math.round((analyticsData.aiSuggestionsAccepted / (analyticsData.aiSuggestionsAccepted + analyticsData.aiSuggestionsDeclined)) * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(analyticsData.aiSuggestionsAccepted / (analyticsData.aiSuggestionsAccepted + analyticsData.aiSuggestionsDeclined)) * 100}
                          className="h-1.5"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Task Completion & Additional Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Target className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                      <p className="text-lg font-bold">{Math.round(analyticsData.taskCompletionRate)}%</p>
                      <p className="text-[10px] text-muted-foreground">Task Completion</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Clock className="w-6 h-6 mx-auto mb-1 text-orange-500" />
                      <p className="text-lg font-bold">{analyticsData.overtimeHours.toFixed(1)}h</p>
                      <p className="text-[10px] text-muted-foreground">Overtime</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Users className="w-6 h-6 mx-auto mb-1 text-green-500" />
                      <p className="text-lg font-bold">{Math.round(analyticsData.clientCoverage)}%</p>
                      <p className="text-[10px] text-muted-foreground">Client Coverage</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Zap className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                      <p className="text-lg font-bold">{analyticsData.averageShiftDuration.toFixed(1)}h</p>
                      <p className="text-[10px] text-muted-foreground">Avg Duration</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Staff */}
                {analyticsData.topPerformingStaff && analyticsData.topPerformingStaff.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
                        Top Performing Staff
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {analyticsData.topPerformingStaff.slice(0, 5).map((staff, index) => (
                        <div key={staff.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                            index === 0 ? "bg-yellow-500" :
                            index === 1 ? "bg-gray-400" :
                            index === 2 ? "bg-amber-700" : "bg-muted-foreground"
                          )}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{staff.name}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{staff.score} pts</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No analytics data available</p>
                <p className="text-sm">Try selecting a different time period</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Timesheets Slideout Panel */}
      <Sheet open={isTimesheetsOpen} onOpenChange={setIsTimesheetsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-600" />
              Timesheets
            </SheetTitle>
            <SheetDescription>
              Review and approve staff timesheets
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Status filter tabs */}
            <div className="flex items-center gap-2">
              <Button
                variant={timesheetStatusFilter === "pending_approval" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimesheetStatusFilter("pending_approval")}
              >
                <Clock className="w-4 h-4 mr-1" />
                Pending
              </Button>
              <Button
                variant={timesheetStatusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimesheetStatusFilter("approved")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approved
              </Button>
              <Button
                variant={timesheetStatusFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimesheetStatusFilter("rejected")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejected
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetchTimesheets()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {timesheetsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : timesheets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No timesheets found</p>
                <p className="text-sm">Try selecting a different status filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timesheets.map((ts) => (
                  <Card key={ts.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => fetchTimesheetEntries(ts)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{ts.staffName || ts.staffId}</span>
                        </div>
                        <Badge variant={
                          ts.status === "approved" ? "default" :
                          ts.status === "rejected" ? "destructive" :
                          "secondary"
                        } className={
                          ts.status === "approved" ? "bg-green-500" :
                          ts.status === "pending_approval" ? "bg-amber-500" :
                          ""
                        }>
                          {ts.status === "pending_approval" ? "Pending" : ts.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(ts.periodStart), "MMM d")} - {format(parseISO(ts.periodEnd), "MMM d, yyyy")}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="font-bold text-lg">{parseFloat(ts.totalHours).toFixed(1)}</div>
                          <div className="text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="font-bold">{parseFloat(ts.weekdayHours).toFixed(1)}</div>
                          <div className="text-muted-foreground">Weekday</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="font-bold">{(parseFloat(ts.saturdayHours) + parseFloat(ts.sundayHours)).toFixed(1)}</div>
                          <div className="text-muted-foreground">Weekend</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="font-bold">{(parseFloat(ts.eveningHours) + parseFloat(ts.nightHours)).toFixed(1)}</div>
                          <div className="text-muted-foreground">Night</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Timesheet Detail Dialog */}
      <Dialog open={!!viewingTimesheet} onOpenChange={() => setViewingTimesheet(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Timesheet Details
            </DialogTitle>
            <DialogDescription>
              {viewingTimesheet?.staffName || viewingTimesheet?.staffId} - {viewingTimesheet && format(parseISO(viewingTimesheet.periodStart), "MMM d")} to {viewingTimesheet && format(parseISO(viewingTimesheet.periodEnd), "MMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {viewingTimesheet && (
            <div className="space-y-4">
              {/* Hours Summary */}
              <div className="grid grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{parseFloat(viewingTimesheet.totalHours).toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">Total Hours</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-semibold">{parseFloat(viewingTimesheet.weekdayHours).toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">Weekday</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-semibold">{(parseFloat(viewingTimesheet.saturdayHours) + parseFloat(viewingTimesheet.sundayHours)).toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">Weekend</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-semibold">{(parseFloat(viewingTimesheet.eveningHours) + parseFloat(viewingTimesheet.nightHours)).toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">Evening/Night</div>
                  </CardContent>
                </Card>
              </div>

              {/* Timesheet Entries */}
              {timesheetEntries.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Time Entries</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>In</TableHead>
                          <TableHead>Out</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timesheetEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{format(parseISO(entry.date), "MMM d")}</TableCell>
                            <TableCell>{entry.clientName || entry.clientId}</TableCell>
                            <TableCell>{entry.clockInTime}</TableCell>
                            <TableCell>{entry.clockOutTime}</TableCell>
                            <TableCell className="text-right font-medium">{parseFloat(entry.totalHours).toFixed(1)}h</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Rejection reason if rejected */}
              {viewingTimesheet.status === "rejected" && viewingTimesheet.rejectionReason && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-3">
                    <div className="text-sm font-medium text-red-800">Rejection Reason</div>
                    <div className="text-sm text-red-700">{viewingTimesheet.rejectionReason}</div>
                  </CardContent>
                </Card>
              )}

              {/* Actions for pending timesheets */}
              {viewingTimesheet.status === "pending_approval" && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => approveTimesheetMutation.mutate(viewingTimesheet.id)}
                    disabled={approveTimesheetMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approveTimesheetMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Timesheet Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timesheet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (viewingTimesheet && rejectionReason.trim()) {
                  rejectTimesheetMutation.mutate({ timesheetId: viewingTimesheet.id, reason: rejectionReason });
                }
              }}
              disabled={!rejectionReason.trim() || rejectTimesheetMutation.isPending}
            >
              {rejectTimesheetMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
