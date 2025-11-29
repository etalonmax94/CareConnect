import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addDays, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar, Clock, Users, MapPin, Plus, Search, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, Edit, Trash2, Copy, Eye, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Download, Upload, FileText, User, Building2, ArrowRight, Loader2,
  CalendarDays, LayoutGrid, List, GripVertical, BarChart3, Settings, Sparkles,
  UserPlus, AlertCircle, ChevronDown, ClipboardCheck, Timer, CheckCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import type { Staff } from "@shared/schema";

type ShiftCategory = "NDIS" | "Support at Home" | "Private";
type ShiftStatus = "draft" | "published" | "assigned" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
type ViewMode = "calendar" | "list" | "board";
type RecurrencePattern = "none" | "daily" | "weekly" | "fortnightly" | "monthly";

interface Shift {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  category: ShiftCategory;
  shiftType: string | null;
  status: ShiftStatus;
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

interface Client {
  id: string;
  participantName: string;
  firstName: string;
  lastName: string;
  category: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  email: string | null;
}

interface ShiftTemplate {
  id: string;
  name: string;
  category: ShiftCategory;
  shiftType: string;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultDurationMinutes: number;
  requiredQualifications?: string[];
  taskChecklist?: string[];
}

interface AvailableStaff {
  id: string;
  name: string;
  email: string | null;
  role: string;
  matchScore: number;
  hasRestriction: boolean;
  isPreferred: boolean;
  isAvailable: boolean;
}

// Timesheet interfaces
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

// GPS Compliance interfaces
interface GpsComplianceLog {
  id: string;
  eventType: "clock_in" | "clock_out" | "location_update" | "geofence_violation";
  staffId?: string;
  staffName?: string;
  appointmentId?: string;
  timeClockRecordId?: string;
  recordedLatitude?: string;
  recordedLongitude?: string;
  expectedLatitude?: string;
  expectedLongitude?: string;
  distanceMeters?: string;
  isCompliant: "yes" | "no";
  requiresReview: "yes" | "no";
  notes?: string;
  timestamp: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewNotes?: string;
}

// Clock status interface
interface ClockStatus {
  isClockedIn: boolean;
  activeEvents: {
    recordId: string;
    appointmentId?: string;
    clockInTime: Date;
  }[];
}

interface ClockResult {
  success: boolean;
  recordId?: string;
  errors: string[];
  warnings: string[];
  gpsCompliant?: boolean;
  distance?: number;
}

const statusColors: Record<ShiftStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  published: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800",
  confirmed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
};

const categoryColors: Record<ShiftCategory, string> = {
  "NDIS": "bg-indigo-500",
  "Support at Home": "bg-teal-500",
  "Private": "bg-amber-500",
};

export default function Scheduling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState("shifts");

  // Shifts State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [draggedStaff, setDraggedStaff] = useState<Staff | null>(null);
  const [dropTargetShiftId, setDropTargetShiftId] = useState<string | null>(null);

  // Timesheet State
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState<string>("pending_approval");
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // GPS Compliance State
  const [gpsFilterCompliant, setGpsFilterCompliant] = useState<boolean | undefined>(false);
  const [viewingGpsLog, setViewingGpsLog] = useState<GpsComplianceLog | null>(null);
  const [gpsReviewNotes, setGpsReviewNotes] = useState("");

  // Time Clock State
  const [gpsLocation, setGpsLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  // Calculate date range for queries
  const dateRange = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 1));
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [currentDate]);

  // Queries
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/css/shifts/calendar", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/css/shifts/calendar?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!response.ok) throw new Error("Failed to fetch shifts");
      return response.json();
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: templates = [] } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/css/templates"],
  });

  // Fetch available staff for selected shift (smart matching)
  const { data: availableStaffData = [] } = useQuery<AvailableStaff[]>({
    queryKey: ["/api/css/shifts", selectedShift?.id, "available-staff"],
    queryFn: async () => {
      if (!selectedShift?.id) return [];
      const response = await fetch(`/api/css/shifts/${selectedShift.id}/available-staff`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedShift?.id && isAssignDialogOpen,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/css/stats", dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/css/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Timesheet Queries
  const { data: timesheets = [], isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { status: timesheetStatusFilter }],
    enabled: activeMainTab === "timesheets",
  });

  // GPS Compliance Queries
  const { data: gpsLogs = [], isLoading: gpsLogsLoading } = useQuery<GpsComplianceLog[]>({
    queryKey: ["/api/gps-compliance-logs", { isCompliant: gpsFilterCompliant }],
    enabled: activeMainTab === "gps-compliance",
  });

  // Time Clock - Current user's staff record
  const { data: currentStaffRecord, isLoading: loadingStaffRecord } = useQuery<Staff>({
    queryKey: ["/api/staff/me"],
    enabled: activeMainTab === "time-clock",
  });

  // Time Clock - Clock status
  const { data: clockStatus } = useQuery<ClockStatus>({
    queryKey: [`/api/staff/${currentStaffRecord?.id}/clock-status`],
    enabled: !!currentStaffRecord?.id && activeMainTab === "time-clock",
    refetchInterval: 30000,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/css/stats"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Shift created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create shift", variant: "destructive" });
    },
  });

  const publishShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/css/shifts/${id}/publish`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to publish shift");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] });
      toast({ title: "Shift published" });
    },
  });

  const cancelShiftMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/css/shifts/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to cancel shift");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] });
      toast({ title: "Shift cancelled" });
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
  });

  // Timesheet Mutations
  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      const res = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({ title: "Timesheet approved" });
      setViewingTimesheet(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }: { timesheetId: string; reason: string }) => {
      const res = await fetch(`/api/timesheets/${timesheetId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rejectionReason: reason }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({ title: "Timesheet rejected" });
      setViewingTimesheet(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // GPS Compliance Mutations
  const reviewGpsMutation = useMutation({
    mutationFn: async ({ logId, notes }: { logId: string; notes: string }) => {
      const res = await fetch(`/api/gps-compliance-logs/${logId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewNotes: notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gps-compliance-logs"] });
      toast({ title: "GPS compliance log reviewed" });
      setViewingGpsLog(null);
      setGpsReviewNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Time Clock Mutations
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!gpsLocation) throw new Error("Location not available");
      if (!currentStaffRecord?.id) throw new Error("Staff record not found");
      const res = await fetch(`/api/staff/${currentStaffRecord.id}/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          latitude: gpsLocation.coords.latitude,
          longitude: gpsLocation.coords.longitude,
          accuracy: gpsLocation.coords.accuracy,
          deviceType: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clock in");
      return data as ClockResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${currentStaffRecord?.id}/clock-status`] });
      if (data.success) {
        toast({
          title: "Clocked In Successfully",
          description: data.gpsCompliant ? "Location verified" : `Location warning: ${data.distance?.toFixed(0)}m from expected`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Clock In Failed", description: error.message, variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!gpsLocation) throw new Error("Location not available");
      if (!currentStaffRecord?.id) throw new Error("Staff record not found");
      const res = await fetch(`/api/staff/${currentStaffRecord.id}/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          latitude: gpsLocation.coords.latitude,
          longitude: gpsLocation.coords.longitude,
          accuracy: gpsLocation.coords.accuracy,
          deviceType: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clock out");
      return data as ClockResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${currentStaffRecord?.id}/clock-status`] });
      if (data.success) {
        toast({
          title: "Clocked Out Successfully",
          description: data.gpsCompliant ? "Location verified" : `Location warning: ${data.distance?.toFixed(0)}m from expected`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Clock Out Failed", description: error.message, variant: "destructive" });
    },
  });

  // Create shift form state
  const [shiftForm, setShiftForm] = useState({
    title: "",
    description: "",
    category: "NDIS" as ShiftCategory,
    shiftType: "standard",
    clientId: "",
    scheduledDate: format(new Date(), "yyyy-MM-dd"),
    scheduledStartTime: "08:00",
    scheduledEndTime: "12:00",
    durationMinutes: 240,
    locationAddress: "",
    requiredStaffCount: 1,
    notes: "",
    recurrencePattern: "none" as RecurrencePattern,
    recurrenceEndDate: "",
    recurrenceCount: 1,
  });

  // Apply template to form
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setShiftForm(prev => ({
        ...prev,
        title: template.name,
        category: template.category,
        shiftType: template.shiftType,
        scheduledStartTime: template.defaultStartTime,
        scheduledEndTime: template.defaultEndTime,
        durationMinutes: template.defaultDurationMinutes,
      }));
    }
  };

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || shift.category === filterCategory;
      const matchesStatus = filterStatus === "all" || shift.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [shifts, searchTerm, filterCategory, filterStatus]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentDate]);

  const getShiftsForDay = (date: Date) => {
    return filteredShifts.filter((shift) =>
      isSameDay(parseISO(shift.scheduledDate), date)
    );
  };

  const resetForm = () => {
    setSelectedTemplateId("");
    setShiftForm({
      title: "",
      description: "",
      category: "NDIS",
      shiftType: "standard",
      clientId: "",
      scheduledDate: format(new Date(), "yyyy-MM-dd"),
      scheduledStartTime: "08:00",
      scheduledEndTime: "12:00",
      durationMinutes: 240,
      locationAddress: "",
      requiredStaffCount: 1,
      notes: "",
      recurrencePattern: "none",
      recurrenceEndDate: "",
      recurrenceCount: 1,
    });
  };

  // Drag and drop handlers for board view
  const handleDragStart = (e: React.DragEvent, staff: Staff) => {
    setDraggedStaff(staff);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, shiftId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetShiftId(shiftId);
  };

  const handleDragLeave = () => {
    setDropTargetShiftId(null);
  };

  const handleDrop = (e: React.DragEvent, shiftId: string) => {
    e.preventDefault();
    if (draggedStaff) {
      assignStaffMutation.mutate({ shiftId, staffId: draggedStaff.id });
    }
    setDraggedStaff(null);
    setDropTargetShiftId(null);
  };

  const handleDragEnd = () => {
    setDraggedStaff(null);
    setDropTargetShiftId(null);
  };

  const handleCreateShift = () => {
    const startTime = shiftForm.scheduledStartTime.split(":");
    const endTime = shiftForm.scheduledEndTime.split(":");
    const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
    const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
    const duration = endMinutes - startMinutes;

    createShiftMutation.mutate({
      ...shiftForm,
      durationMinutes: duration > 0 ? duration : 240,
      status: "draft",
    });
  };

  const handleViewShift = (shift: Shift) => {
    setSelectedShift(shift);
    setIsViewDialogOpen(true);
  };

  const handleAssignStaff = (shift: Shift) => {
    setSelectedShift(shift);
    setIsAssignDialogOpen(true);
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Unassigned";
    const client = clients.find((c) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const getStaffName = (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    return staff?.name || "Unknown Staff";
  };

  // Timesheet helpers
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const getTimesheetStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const viewTimesheetDetails = async (timesheet: Timesheet) => {
    try {
      const res = await fetch(`/api/timesheets/${timesheet.id}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setViewingTimesheet(data);
      setTimesheetEntries(data.entries || []);
    } catch {
      toast({ title: "Error", description: "Failed to load timesheet details", variant: "destructive" });
    }
  };

  // GPS Compliance helpers
  const getGpsComplianceBadge = (isCompliant: string) => {
    if (isCompliant === "yes") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Non-Compliant</Badge>;
  };

  const getGpsEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      clock_in: "bg-blue-50 text-blue-700 border-blue-200",
      clock_out: "bg-purple-50 text-purple-700 border-purple-200",
      location_update: "bg-gray-50 text-gray-700 border-gray-200",
      geofence_violation: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return <Badge variant="outline" className={colors[eventType] || ""}>{eventType.replace(/_/g, " ")}</Badge>;
  };

  const formatDistance = (meters?: string) => {
    if (!meters) return "N/A";
    const m = parseFloat(meters);
    if (m < 1000) return `${m.toFixed(0)}m`;
    return `${(m / 1000).toFixed(2)}km`;
  };

  const openMapsLink = (lat?: string, lng?: string) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  // Time Clock helpers
  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation(position);
        setGettingLocation(false);
        toast({ title: "Location Acquired", description: `Accuracy: ${position.coords.accuracy.toFixed(0)}m` });
      },
      (error) => {
        setLocationError(error.message);
        setGettingLocation(false);
        toast({ title: "Location Error", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto-get location when switching to time-clock tab
  useEffect(() => {
    if (activeMainTab === "time-clock" && !gpsLocation) {
      getCurrentLocation();
    }
  }, [activeMainTab]);

  const handleClockIn = () => {
    if (!gpsLocation) {
      toast({ title: "Location Required", description: "Please enable GPS and refresh location", variant: "destructive" });
      return;
    }
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    if (!gpsLocation) {
      toast({ title: "Location Required", description: "Please enable GPS and refresh location", variant: "destructive" });
      return;
    }
    clockOutMutation.mutate();
  };

  const isClockedIn = clockStatus?.isClockedIn || false;
  const isClockProcessing = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Workforce Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Scheduling, time tracking, timesheets, and GPS compliance
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Shifts</span>
          </TabsTrigger>
          <TabsTrigger value="time-clock" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">Time Clock</span>
          </TabsTrigger>
          <TabsTrigger value="timesheets" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Timesheets</span>
          </TabsTrigger>
          <TabsTrigger value="gps-compliance" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">GPS Compliance</span>
          </TabsTrigger>
        </TabsList>

        {/* SHIFTS TAB */}
        <TabsContent value="shifts" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/css/shifts/calendar"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Shift
            </Button>
          </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShifts || 0}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.assignedShifts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.coverageRate || 0}% coverage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.unassignedShifts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHoursScheduled || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shifts..."
              className="pl-8 w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="NDIS">NDIS</SelectItem>
              <SelectItem value="Support at Home">Support at Home</SelectItem>
              <SelectItem value="Private">Private</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "calendar" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode("calendar")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Calendar View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none border-l"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "board" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none border-l"
                  onClick={() => setViewMode("board")}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Staff Assignment Board</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayShifts = getShiftsForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[120px] border rounded-lg p-1",
                      !isCurrentMonth && "bg-muted/30",
                      isToday && "border-primary border-2"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      !isCurrentMonth && "text-muted-foreground",
                      isToday && "text-primary"
                    )}>
                      {format(day, "d")}
                    </div>
                    <ScrollArea className="h-[90px]">
                      <div className="space-y-1">
                        {dayShifts.slice(0, 4).map((shift) => (
                          <div
                            key={shift.id}
                            className={cn(
                              "text-xs p-1 rounded cursor-pointer truncate",
                              categoryColors[shift.category],
                              "text-white hover:opacity-90"
                            )}
                            onClick={() => handleViewShift(shift)}
                          >
                            <div className="font-medium truncate">{shift.scheduledStartTime}</div>
                            <div className="truncate opacity-90">{getClientName(shift.clientId)}</div>
                          </div>
                        ))}
                        {dayShifts.length > 4 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayShifts.length - 4} more
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {shiftsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mb-2" />
                  <p>No shifts found</p>
                </div>
              ) : (
                filteredShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                    <div className={cn("w-1 h-12 rounded-full", categoryColors[shift.category])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{shift.title}</span>
                        <Badge className={statusColors[shift.status]} variant="secondary">
                          {shift.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(shift.scheduledDate), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shift.scheduledStartTime} - {shift.scheduledEndTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {getClientName(shift.clientId)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {shift.assignedStaffCount || 0}/{shift.requiredStaffCount || 1} staff
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewShift(shift)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignStaff(shift)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Staff
                          </DropdownMenuItem>
                          {shift.status === "draft" && (
                            <DropdownMenuItem onClick={() => publishShiftMutation.mutate(shift.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => cancelShiftMutation.mutate({ id: shift.id, reason: "Cancelled by admin" })}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Board View - Staff Assignment with Drag and Drop */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Staff Pool - Draggable */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Pool
              </CardTitle>
              <CardDescription>Drag staff to assign to shifts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-2">
                  {staffList.filter(s => s.role !== "admin").map((staff) => (
                    <div
                      key={staff.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, staff)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg cursor-grab active:cursor-grabbing transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        draggedStaff?.id === staff.id && "opacity-50 border-dashed"
                      )}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{staff.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{staff.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{staff.role?.replace("_", " ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Unassigned Shifts - Drop Targets */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Shifts Needing Staff
              </CardTitle>
              <CardDescription>Drop staff members here to assign them to shifts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 grid gap-4 md:grid-cols-2">
                  {filteredShifts
                    .filter(s => s.status !== "cancelled" && s.status !== "completed" && (s.assignedStaffCount || 0) < (s.requiredStaffCount || 1))
                    .map((shift) => (
                      <div
                        key={shift.id}
                        onDragOver={(e) => handleDragOver(e, shift.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, shift.id)}
                        className={cn(
                          "border rounded-lg p-4 transition-all",
                          dropTargetShiftId === shift.id && "border-primary border-2 bg-primary/5",
                          "hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-8 rounded-full", categoryColors[shift.category])} />
                            <div>
                              <div className="font-medium">{shift.title}</div>
                              <div className="text-xs text-muted-foreground">{getClientName(shift.clientId)}</div>
                            </div>
                          </div>
                          <Badge className={statusColors[shift.status]} variant="secondary">
                            {shift.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(shift.scheduledDate), "EEE, MMM d")}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {shift.scheduledStartTime} - {shift.scheduledEndTime}
                          </div>
                          {shift.locationAddress && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{shift.locationAddress}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className={cn(
                              "text-sm font-medium",
                              (shift.assignedStaffCount || 0) < (shift.requiredStaffCount || 1) ? "text-orange-500" : "text-green-500"
                            )}>
                              {shift.assignedStaffCount || 0}/{shift.requiredStaffCount || 1}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignStaff(shift)}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                        {/* Show assigned staff */}
                        {shift.allocations && shift.allocations.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {shift.allocations.map((allocation) => (
                              <div key={allocation.id} className="flex items-center gap-2 text-sm">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">{getStaffName(allocation.staffId).charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate">{getStaffName(allocation.staffId)}</span>
                                <Badge variant="outline" className="text-xs capitalize">{allocation.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  {filteredShifts.filter(s => s.status !== "cancelled" && s.status !== "completed" && (s.assignedStaffCount || 0) < (s.requiredStaffCount || 1)).length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                      <p className="font-medium">All shifts are fully staffed!</p>
                      <p className="text-sm">No shifts need additional staff assignments.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
        </TabsContent>

        {/* TIME CLOCK TAB */}
        <TabsContent value="time-clock" className="space-y-6">
          <div className="container max-w-md mx-auto space-y-6">
            {loadingStaffRecord ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading your staff profile...</p>
              </div>
            ) : !currentStaffRecord ? (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  No staff record found for your account. Please contact your administrator.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Staff Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Logged in as</p>
                      <p className="text-lg font-semibold">{currentStaffRecord.name}</p>
                      {currentStaffRecord.role && (
                        <Badge variant="secondary" className="mt-2">
                          {currentStaffRecord.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Location Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      GPS Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {locationError ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{locationError}</AlertDescription>
                      </Alert>
                    ) : gpsLocation ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Location Acquired
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Accuracy:</span>
                          <span className="font-medium">{gpsLocation.coords.accuracy.toFixed(0)}m</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {gpsLocation.coords.latitude.toFixed(6)}, {gpsLocation.coords.longitude.toFixed(6)}
                        </div>
                      </div>
                    ) : (
                      <Alert>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <AlertDescription>Acquiring GPS location...</AlertDescription>
                      </Alert>
                    )}
                    <Button variant="outline" className="w-full" onClick={getCurrentLocation} disabled={gettingLocation}>
                      {gettingLocation ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Getting Location...</>
                      ) : (
                        <><MapPin className="w-4 h-4 mr-2" />Refresh Location</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Clock Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Clock Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isClockedIn ? (
                      <Alert className="bg-blue-50 border-blue-200">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <AlertDescription className="text-blue-900">
                          You are currently clocked in
                          {clockStatus?.activeEvents[0]?.clockInTime && (
                            <div className="text-sm mt-1">
                              Since: {new Date(clockStatus.activeEvents[0].clockInTime).toLocaleTimeString()}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <CheckCircle className="w-4 h-4" />
                        <AlertDescription>You are not currently clocked in</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Clock In/Out Buttons */}
                <div className="space-y-3">
                  {!isClockedIn ? (
                    <Button className="w-full h-16 text-lg" size="lg" onClick={handleClockIn} disabled={!gpsLocation || isClockProcessing}>
                      {isClockProcessing ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                      ) : (
                        <><CheckCircle className="w-5 h-5 mr-2" />Clock In</>
                      )}
                    </Button>
                  ) : (
                    <Button className="w-full h-16 text-lg" size="lg" variant="destructive" onClick={handleClockOut} disabled={!gpsLocation || isClockProcessing}>
                      {isClockProcessing ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                      ) : (
                        <><XCircle className="w-5 h-5 mr-2" />Clock Out</>
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* TIMESHEETS TAB */}
        <TabsContent value="timesheets" className="space-y-6">
          <div className="flex gap-2">
            <Button variant={timesheetStatusFilter === "pending_approval" ? "default" : "outline"} onClick={() => setTimesheetStatusFilter("pending_approval")}>
              <Clock className="w-4 h-4 mr-2" />Pending
            </Button>
            <Button variant={timesheetStatusFilter === "approved" ? "default" : "outline"} onClick={() => setTimesheetStatusFilter("approved")}>
              <CheckCircle className="w-4 h-4 mr-2" />Approved
            </Button>
            <Button variant={timesheetStatusFilter === "rejected" ? "default" : "outline"} onClick={() => setTimesheetStatusFilter("rejected")}>
              <XCircle className="w-4 h-4 mr-2" />Rejected
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Timesheets</CardTitle>
              <CardDescription>Review and approve staff timesheets</CardDescription>
            </CardHeader>
            <CardContent>
              {timesheetsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading timesheets...</div>
              ) : timesheets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No timesheets found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets.map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell className="font-medium">{ts.staffName || ts.staffId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(ts.periodStart)} - {formatDate(ts.periodEnd)}
                          </div>
                        </TableCell>
                        <TableCell>{parseFloat(ts.totalHours).toFixed(2)}h</TableCell>
                        <TableCell>{getTimesheetStatusBadge(ts.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => viewTimesheetDetails(ts)}>
                            <Eye className="w-4 h-4 mr-1" />View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GPS COMPLIANCE TAB */}
        <TabsContent value="gps-compliance" className="space-y-6">
          <div className="flex gap-2">
            <Button variant={gpsFilterCompliant === false ? "default" : "outline"} onClick={() => setGpsFilterCompliant(false)}>
              <AlertTriangle className="w-4 h-4 mr-2" />Non-Compliant
            </Button>
            <Button variant={gpsFilterCompliant === true ? "default" : "outline"} onClick={() => setGpsFilterCompliant(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />Compliant
            </Button>
            <Button variant={gpsFilterCompliant === undefined ? "default" : "outline"} onClick={() => setGpsFilterCompliant(undefined)}>
              All Logs
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GPS Compliance Logs</CardTitle>
              <CardDescription>Review location compliance for clock events</CardDescription>
            </CardHeader>
            <CardContent>
              {gpsLogsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading compliance logs...</div>
              ) : gpsLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No GPS compliance logs found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gpsLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell>{getGpsEventTypeBadge(log.eventType)}</TableCell>
                        <TableCell className="font-medium">{log.staffName || log.staffId || "N/A"}</TableCell>
                        <TableCell>
                          {log.distanceMeters ? (
                            <span className={parseFloat(log.distanceMeters) > 100 ? "text-red-600 font-medium" : ""}>
                              {formatDistance(log.distanceMeters)}
                            </span>
                          ) : "N/A"}
                        </TableCell>
                        <TableCell>{getGpsComplianceBadge(log.isCompliant)}</TableCell>
                        <TableCell>
                          {log.reviewedAt ? (
                            <Badge variant="outline" className="bg-gray-50">Reviewed</Badge>
                          ) : log.requiresReview === "yes" ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Needs Review</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setViewingGpsLog(log)}>
                            <Eye className="w-4 h-4 mr-1" />View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Shift Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
            <DialogDescription>
              Create a new shift and assign it to a client
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Template Selection */}
            {templates.length > 0 && (
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quick Start from Template
                </Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={applyTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", categoryColors[template.category])} />
                          {template.name}
                          <span className="text-xs text-muted-foreground">
                            ({template.defaultStartTime} - {template.defaultEndTime})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit text-xs"
                    onClick={() => { setSelectedTemplateId(""); resetForm(); }}
                  >
                    Clear template
                  </Button>
                )}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Shift Title</Label>
                <Input
                  id="title"
                  value={shiftForm.title}
                  onChange={(e) => setShiftForm({ ...shiftForm, title: e.target.value })}
                  placeholder="e.g., Morning Support Visit"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={shiftForm.category}
                  onValueChange={(v) => setShiftForm({ ...shiftForm, category: v as ShiftCategory })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NDIS">NDIS</SelectItem>
                    <SelectItem value="Support at Home">Support at Home</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={shiftForm.clientId}
                onValueChange={(v) => setShiftForm({ ...shiftForm, clientId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <DatePicker
                  id="date"
                  value={shiftForm.scheduledDate}
                  onChange={(value) => setShiftForm({ ...shiftForm, scheduledDate: value })}
                  placeholder="Select date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <TimePicker
                  id="startTime"
                  value={shiftForm.scheduledStartTime}
                  onChange={(value) => setShiftForm({ ...shiftForm, scheduledStartTime: value })}
                  placeholder="Start time"
                  minuteStep={15}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <TimePicker
                  id="endTime"
                  value={shiftForm.scheduledEndTime}
                  onChange={(value) => setShiftForm({ ...shiftForm, scheduledEndTime: value })}
                  placeholder="End time"
                  minuteStep={15}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shiftType">Shift Type</Label>
                <Select
                  value={shiftForm.shiftType}
                  onValueChange={(v) => setShiftForm({ ...shiftForm, shiftType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="sleepover">Sleepover</SelectItem>
                    <SelectItem value="active_night">Active Night</SelectItem>
                    <SelectItem value="community_access">Community Access</SelectItem>
                    <SelectItem value="nursing">Nursing</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="respite">Respite</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staffCount">Required Staff</Label>
                <Input
                  id="staffCount"
                  type="number"
                  min={1}
                  value={shiftForm.requiredStaffCount}
                  onChange={(e) => setShiftForm({ ...shiftForm, requiredStaffCount: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={shiftForm.locationAddress}
                onChange={(e) => setShiftForm({ ...shiftForm, locationAddress: e.target.value })}
                placeholder="Enter address or use client's address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={shiftForm.notes}
                onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                placeholder="Additional notes for this shift..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Recurrence Options */}
            <div className="grid gap-4">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Recurrence
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="recurrence">Pattern</Label>
                  <Select
                    value={shiftForm.recurrencePattern}
                    onValueChange={(v) => setShiftForm({ ...shiftForm, recurrencePattern: v as RecurrencePattern })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No recurrence (single shift)</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {shiftForm.recurrencePattern !== "none" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="recurrenceCount">Number of occurrences</Label>
                      <Input
                        id="recurrenceCount"
                        type="number"
                        min={1}
                        max={52}
                        value={shiftForm.recurrenceCount}
                        onChange={(e) => setShiftForm({ ...shiftForm, recurrenceCount: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </>
                )}
              </div>
              {shiftForm.recurrencePattern !== "none" && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p>
                    This will create <strong>{shiftForm.recurrenceCount}</strong> {shiftForm.recurrencePattern === "daily" ? "consecutive days" : shiftForm.recurrencePattern === "weekly" ? "weekly shifts" : shiftForm.recurrencePattern === "fortnightly" ? "fortnightly shifts" : "monthly shifts"} starting from {format(new Date(shiftForm.scheduledDate), "MMM d, yyyy")}.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateShift} disabled={createShiftMutation.isPending}>
              {createShiftMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Shift Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-12 rounded-full", categoryColors[selectedShift.category])} />
                  <div>
                    <h3 className="text-lg font-semibold">{selectedShift.title}</h3>
                    <p className="text-sm text-muted-foreground">{getClientName(selectedShift.clientId)}</p>
                  </div>
                </div>
                <Badge className={statusColors[selectedShift.status]} variant="secondary">
                  {selectedShift.status.replace("_", " ")}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(selectedShift.scheduledDate), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedShift.scheduledStartTime} - {selectedShift.scheduledEndTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedShift.locationAddress || "No location set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedShift.assignedStaffCount || 0}/{selectedShift.requiredStaffCount || 1} staff assigned</span>
                </div>
              </div>
              {selectedShift.allocations && selectedShift.allocations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Assigned Staff</h4>
                    <div className="space-y-2">
                      {selectedShift.allocations.map((allocation) => (
                        <div key={allocation.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getStaffName(allocation.staffId).charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{getStaffName(allocation.staffId)}</div>
                              <div className="text-xs text-muted-foreground capitalize">{allocation.role}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">{allocation.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {selectedShift.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedShift.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => { setIsViewDialogOpen(false); handleAssignStaff(selectedShift!); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Staff to Shift</DialogTitle>
            <DialogDescription>
              Select a staff member to assign to this shift
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-8 rounded-full", categoryColors[selectedShift.category])} />
                  <div>
                    <div className="font-medium">{selectedShift.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(selectedShift.scheduledDate), "MMM d, yyyy")} • {selectedShift.scheduledStartTime} - {selectedShift.scheduledEndTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Suggestions */}
              {availableStaffData.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Recommended Staff
                  </Label>
                  <div className="space-y-2">
                    {availableStaffData
                      .filter(s => !s.hasRestriction && s.isAvailable)
                      .sort((a, b) => b.matchScore - a.matchScore)
                      .slice(0, 3)
                      .map((staff) => (
                        <div
                          key={staff.id}
                          className={cn(
                            "flex items-center justify-between p-3 border rounded-lg hover:bg-primary/5 cursor-pointer transition-all",
                            staff.isPreferred && "border-green-500 bg-green-50"
                          )}
                          onClick={() => assignStaffMutation.mutate({ shiftId: selectedShift.id, staffId: staff.id })}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-primary-foreground">{staff.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {staff.name}
                                {staff.isPreferred && (
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                    Preferred
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">{staff.role?.replace("_", " ")}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              Score: {staff.matchScore}%
                            </div>
                            <Button variant="default" size="sm">
                              Assign
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>All Staff</Label>
                <ScrollArea className="h-[250px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {staffList.filter(s => s.role !== "admin").map((staff) => {
                      const matchData = availableStaffData.find(a => a.id === staff.id);
                      const hasRestriction = matchData?.hasRestriction;
                      const isPreferred = matchData?.isPreferred;

                      return (
                        <div
                          key={staff.id}
                          className={cn(
                            "flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all",
                            hasRestriction && "opacity-50 border-red-200 bg-red-50"
                          )}
                          onClick={() => !hasRestriction && assignStaffMutation.mutate({ shiftId: selectedShift.id, staffId: staff.id })}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {staff.name}
                                {hasRestriction && (
                                  <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                                    Restricted
                                  </Badge>
                                )}
                                {isPreferred && !hasRestriction && (
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                    Preferred
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">{staff.role?.replace("_", " ")}</div>
                            </div>
                          </div>
                          {!hasRestriction ? (
                            <Button variant="outline" size="sm">
                              Assign
                            </Button>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                This staff member has a restriction for this client
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timesheet Details Dialog */}
      <Dialog open={!!viewingTimesheet} onOpenChange={() => setViewingTimesheet(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timesheet Details</DialogTitle>
            <DialogDescription>Review timesheet entries and approve or reject</DialogDescription>
          </DialogHeader>
          {viewingTimesheet && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                      <div className="text-2xl font-bold">{parseFloat(viewingTimesheet.totalHours).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Weekday</div>
                      <div className="text-xl font-semibold">{parseFloat(viewingTimesheet.weekdayHours).toFixed(2)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Weekend</div>
                      <div className="text-xl font-semibold">{(parseFloat(viewingTimesheet.saturdayHours) + parseFloat(viewingTimesheet.sundayHours)).toFixed(2)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Evening/Night</div>
                      <div className="text-xl font-semibold">{(parseFloat(viewingTimesheet.eveningHours) + parseFloat(viewingTimesheet.nightHours)).toFixed(2)}h</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div>
                <h3 className="text-lg font-semibold mb-3">Time Entries</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheetEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell>{new Date(entry.clockInTime).toLocaleTimeString()}</TableCell>
                          <TableCell>{new Date(entry.clockOutTime).toLocaleTimeString()}</TableCell>
                          <TableCell className="font-medium">{parseFloat(entry.totalHours).toFixed(2)}h</TableCell>
                          <TableCell className="text-sm">{entry.clientId}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {viewingTimesheet.status === "pending_approval" && (
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="w-4 h-4 mr-2" />Reject
                  </Button>
                  <Button onClick={() => approveTimesheetMutation.mutate(viewingTimesheet.id)} disabled={approveTimesheetMutation.isPending}>
                    <CheckCircle className="w-4 h-4 mr-2" />Approve
                  </Button>
                </DialogFooter>
              )}
              {viewingTimesheet.status === "rejected" && viewingTimesheet.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Rejection Reason:</div>
                  <div className="text-sm text-red-700 mt-1">{viewingTimesheet.rejectionReason}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this timesheet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea id="rejection-reason" placeholder="Enter reason for rejection..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (viewingTimesheet && rejectionReason.trim()) { rejectTimesheetMutation.mutate({ timesheetId: viewingTimesheet.id, reason: rejectionReason }); } }} disabled={!rejectionReason.trim() || rejectTimesheetMutation.isPending}>
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GPS Compliance Details Dialog */}
      <Dialog open={!!viewingGpsLog} onOpenChange={() => setViewingGpsLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>GPS Compliance Details</DialogTitle>
            <DialogDescription>Review location data and compliance status</DialogDescription>
          </DialogHeader>
          {viewingGpsLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Event Type</div>
                  <div className="mt-1">{getGpsEventTypeBadge(viewingGpsLog.eventType)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Compliance Status</div>
                  <div className="mt-1">{getGpsComplianceBadge(viewingGpsLog.isCompliant)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Staff</div>
                  <div className="mt-1 font-medium">{viewingGpsLog.staffName || viewingGpsLog.staffId || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Timestamp</div>
                  <div className="mt-1 text-sm">{formatDateTime(viewingGpsLog.timestamp)}</div>
                </div>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Location Data</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {viewingGpsLog.recordedLatitude && viewingGpsLog.recordedLongitude && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Recorded Location</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{viewingGpsLog.recordedLatitude}, {viewingGpsLog.recordedLongitude}</code>
                        <Button variant="ghost" size="sm" onClick={() => openMapsLink(viewingGpsLog.recordedLatitude, viewingGpsLog.recordedLongitude)}>
                          <MapPin className="w-4 h-4 mr-1" />View on Map
                        </Button>
                      </div>
                    </div>
                  )}
                  {viewingGpsLog.expectedLatitude && viewingGpsLog.expectedLongitude && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Expected Location</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{viewingGpsLog.expectedLatitude}, {viewingGpsLog.expectedLongitude}</code>
                        <Button variant="ghost" size="sm" onClick={() => openMapsLink(viewingGpsLog.expectedLatitude, viewingGpsLog.expectedLongitude)}>
                          <MapPin className="w-4 h-4 mr-1" />View on Map
                        </Button>
                      </div>
                    </div>
                  )}
                  {viewingGpsLog.distanceMeters && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Distance from Expected</div>
                      <div className={`text-lg font-semibold ${parseFloat(viewingGpsLog.distanceMeters) > 100 ? "text-red-600" : "text-green-600"}`}>
                        {formatDistance(viewingGpsLog.distanceMeters)}
                      </div>
                      {parseFloat(viewingGpsLog.distanceMeters) > 100 && (
                        <div className="text-sm text-red-600 mt-1">Exceeds 100m threshold</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              {viewingGpsLog.reviewedAt ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Reviewed on {formatDateTime(viewingGpsLog.reviewedAt)}</div>
                  {viewingGpsLog.reviewNotes && <div className="text-sm text-green-700 mt-2">{viewingGpsLog.reviewNotes}</div>}
                </div>
              ) : viewingGpsLog.requiresReview === "yes" ? (
                <div className="space-y-3">
                  <Label htmlFor="gps-review-notes">Review Notes</Label>
                  <Textarea id="gps-review-notes" placeholder="Add notes about this GPS compliance event..." value={gpsReviewNotes} onChange={(e) => setGpsReviewNotes(e.target.value)} rows={3} />
                </div>
              ) : null}
              {!viewingGpsLog.reviewedAt && viewingGpsLog.requiresReview === "yes" && (
                <DialogFooter>
                  <Button onClick={() => reviewGpsMutation.mutate({ logId: viewingGpsLog.id, notes: gpsReviewNotes })} disabled={reviewGpsMutation.isPending}>
                    <CheckCircle className="w-4 h-4 mr-2" />Mark as Reviewed
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
