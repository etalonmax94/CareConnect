import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Search, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Appointment, Client } from "@shared/schema";

const APPOINTMENT_TYPES = [
  "initial_assessment",
  "support_session", 
  "plan_review",
  "home_visit",
  "community_access",
  "therapy",
  "transport",
  "respite",
  "other"
] as const;

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  initial_assessment: "Initial Assessment",
  support_session: "Support Session",
  plan_review: "Plan Review",
  home_visit: "Home Visit",
  community_access: "Community Access",
  therapy: "Therapy",
  transport: "Transport",
  respite: "Respite",
  other: "Other"
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  missed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

export default function Appointments() {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    clientId: "",
    appointmentType: "support_session" as typeof APPOINTMENT_TYPES[number],
    title: "",
    description: "",
    scheduledStart: "",
    scheduledEnd: "",
    customAddress: "",
    notes: ""
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/range", currentWeekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/range?startDate=${currentWeekStart.toISOString()}&endDate=${weekEnd.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    }
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"]
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof newAppointment) => {
      return apiRequest("POST", "/api/appointments", {
        ...data,
        status: "scheduled"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsCreateDialogOpen(false);
      setNewAppointment({
        clientId: "",
        appointmentType: "support_session",
        title: "",
        description: "",
        scheduledStart: "",
        scheduledEnd: "",
        customAddress: "",
        notes: ""
      });
      toast({ title: "Appointment created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create appointment", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Appointment status updated" });
    }
  });

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.participantName || (client ? `${client.firstName} ${client.lastName}` : "Unknown Client");
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = apt.scheduledStart instanceof Date 
        ? apt.scheduledStart 
        : parseISO(String(apt.scheduledStart));
      return isSameDay(aptDate, date);
    });
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = searchTerm === "" || 
      getClientName(apt.clientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    const aptDate = apt.scheduledStart instanceof Date 
      ? apt.scheduledStart 
      : parseISO(String(apt.scheduledStart));
    const matchesDate = !selectedDate || isSameDay(aptDate, selectedDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleCreateAppointment = () => {
    if (!newAppointment.clientId || !newAppointment.scheduledStart || !newAppointment.scheduledEnd) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createAppointmentMutation.mutate(newAppointment);
  };

  const formatTime = (dateValue: Date | string) => {
    const date = dateValue instanceof Date ? dateValue : parseISO(String(dateValue));
    return format(date, "HH:mm");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Appointments</h1>
          <p className="text-muted-foreground">Manage client appointments and scheduling</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-appointment">
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Appointment</DialogTitle>
              <DialogDescription>Schedule a new appointment for a client</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client">Client *</Label>
                <Select 
                  value={newAppointment.clientId} 
                  onValueChange={(v) => setNewAppointment({...newAppointment, clientId: v})}
                >
                  <SelectTrigger data-testid="select-client">
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
                <Label htmlFor="type">Appointment Type</Label>
                <Select 
                  value={newAppointment.appointmentType} 
                  onValueChange={(v) => setNewAppointment({...newAppointment, appointmentType: v as typeof APPOINTMENT_TYPES[number]})}
                >
                  <SelectTrigger data-testid="select-appointment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {APPOINTMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
                  placeholder="Appointment title"
                  data-testid="input-appointment-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Start Time *</Label>
                  <Input 
                    id="start"
                    type="datetime-local"
                    value={newAppointment.scheduledStart}
                    onChange={(e) => setNewAppointment({...newAppointment, scheduledStart: e.target.value})}
                    data-testid="input-start-time"
                  />
                </div>
                <div>
                  <Label htmlFor="end">End Time *</Label>
                  <Input 
                    id="end"
                    type="datetime-local"
                    value={newAppointment.scheduledEnd}
                    onChange={(e) => setNewAppointment({...newAppointment, scheduledEnd: e.target.value})}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location"
                  value={newAppointment.customAddress}
                  onChange={(e) => setNewAppointment({...newAppointment, customAddress: e.target.value})}
                  placeholder="Address or location (leave blank to use client address)"
                  data-testid="input-location"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes"
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  placeholder="Additional notes..."
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateAppointment} 
                disabled={createAppointmentMutation.isPending}
                data-testid="button-save-appointment"
              >
                {createAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Week View
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} data-testid="button-prev-week">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} data-testid="button-next-week">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors ${
                      isToday ? "bg-primary/10 border-primary" : "bg-card hover:bg-accent/50"
                    } ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {format(day, "EEE")}
                    </div>
                    <div className={`text-lg font-semibold mb-2 ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div 
                          key={apt.id} 
                          className={`text-xs p-1 rounded truncate ${STATUS_COLORS[apt.status || "scheduled"]}`}
                          title={`${getClientName(apt.clientId)} - ${apt.title || APPOINTMENT_TYPE_LABELS[apt.appointmentType || "other"]}`}
                        >
                          {formatTime(apt.scheduledStart)} {getClientName(apt.clientId).split(" ")[0]}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{dayAppointments.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="w-full lg:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search appointments..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-appointments"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
              {selectedDate && (
                <div className="flex items-center justify-between p-2 bg-accent rounded-lg">
                  <span className="text-sm">Showing: {format(selectedDate, "MMM d, yyyy")}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {selectedDate ? `Appointments for ${format(selectedDate, "MMM d")}` : "All Appointments"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No appointments found</div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredAppointments.map((apt) => (
                    <div key={apt.id} className="p-3 border rounded-lg space-y-2" data-testid={`appointment-card-${apt.id}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{getClientName(apt.clientId)}</div>
                          <div className="text-sm text-muted-foreground">
                            {apt.title || APPOINTMENT_TYPE_LABELS[apt.appointmentType || "other"]}
                          </div>
                        </div>
                        <Badge className={STATUS_COLORS[apt.status || "scheduled"]}>
                          {(apt.status || "scheduled").replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(apt.scheduledStart)} - {formatTime(apt.scheduledEnd)}
                        </span>
                        {apt.customAddress && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            {apt.customAddress}
                          </span>
                        )}
                      </div>
                      {apt.status === "scheduled" && (
                        <div className="flex gap-2 pt-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "in_progress" })}
                            data-testid={`button-start-${apt.id}`}
                          >
                            Start
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "cancelled" })}
                            data-testid={`button-cancel-${apt.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {apt.status === "in_progress" && (
                        <Button 
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "completed" })}
                          data-testid={`button-complete-${apt.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
