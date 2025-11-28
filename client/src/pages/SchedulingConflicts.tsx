import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarX, AlertTriangle, Check, X, Search, Filter, RefreshCw, ChevronDown, User, Calendar, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface SchedulingConflict {
  id: string;
  appointmentId: string;
  clientId?: string | null;
  staffId?: string | null;
  conflictType: string;
  severity: "critical" | "warning" | "info";
  description: string;
  status: "open" | "resolved" | "dismissed";
  detectedAt: string;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  resolvedByName?: string | null;
  resolutionNotes?: string | null;
  resolutionAction?: string | null;
  clientName?: string | null;
  staffName?: string | null;
  conflictDetails?: any;
}

interface ConflictsResponse {
  conflicts: SchedulingConflict[];
  total: number;
}

export default function SchedulingConflicts() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [conflictTypeFilter, setConflictTypeFilter] = useState<string>("all");
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SchedulingConflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionAction, setResolutionAction] = useState("resolved");

  const { data: conflictsData, isLoading, refetch } = useQuery<ConflictsResponse>({
    queryKey: ["/api/scheduling-conflicts", statusFilter, severityFilter, conflictTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (severityFilter && severityFilter !== "all") params.append("severity", severityFilter);
      if (conflictTypeFilter && conflictTypeFilter !== "all") params.append("conflictType", conflictTypeFilter);
      params.append("limit", "100");
      
      const response = await fetch(`/api/scheduling-conflicts?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch conflicts");
      return response.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/scheduling-conflicts/${id}/resolve`, {
        resolutionAction: action,
        resolutionNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict resolved",
        description: "The scheduling conflict has been resolved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling-conflicts"] });
      setResolveDialogOpen(false);
      setSelectedConflict(null);
      setResolutionNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve conflict",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/scheduling-conflicts/${id}/dismiss`, {
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict dismissed",
        description: "The scheduling conflict has been dismissed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling-conflicts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss conflict",
        variant: "destructive",
      });
    },
  });

  const conflicts = conflictsData?.conflicts || [];
  const filteredConflicts = conflicts.filter((conflict) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (conflict.clientName?.toLowerCase().includes(searchLower) || false) ||
      (conflict.staffName?.toLowerCase().includes(searchLower) || false) ||
      (conflict.description?.toLowerCase().includes(searchLower) || false) ||
      (conflict.conflictType?.toLowerCase().includes(searchLower) || false)
    );
  });

  const handleSelectConflict = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedConflicts([...selectedConflicts, id]);
    } else {
      setSelectedConflicts(selectedConflicts.filter((cid) => cid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConflicts(filteredConflicts.map((c) => c.id));
    } else {
      setSelectedConflicts([]);
    }
  };

  const handleResolveClick = (conflict: SchedulingConflict) => {
    setSelectedConflict(conflict);
    setResolveDialogOpen(true);
  };

  const handleResolveSubmit = () => {
    if (!selectedConflict) return;
    resolveMutation.mutate({
      id: selectedConflict.id,
      action: resolutionAction,
      notes: resolutionNotes,
    });
  };

  const handleDismiss = (conflict: SchedulingConflict) => {
    if (confirm("Are you sure you want to dismiss this conflict? This action cannot be undone.")) {
      dismissMutation.mutate({
        id: conflict.id,
        notes: "Dismissed by user",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "warning":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "info":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "resolved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "dismissed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConflictType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const criticalCount = conflicts.filter((c) => c.severity === "critical" && c.status === "open").length;
  const warningCount = conflicts.filter((c) => c.severity === "warning" && c.status === "open").length;
  const openCount = conflicts.filter((c) => c.status === "open").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <CalendarX className="w-6 h-6 text-amber-500" />
            Scheduling Conflicts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and resolve staff scheduling conflicts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={criticalCount > 0 ? "border-red-200 dark:border-red-900/50" : ""}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-critical-count">
                {criticalCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={warningCount > 0 ? "border-amber-200 dark:border-amber-900/50" : ""}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-warning-count">
                {warningCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Open</p>
              <p className="text-2xl font-bold" data-testid="text-open-count">
                {openCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-muted">
              <CalendarX className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Conflict List</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conflicts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-severity">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={conflictTypeFilter} onValueChange={setConflictTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-type">
                  <SelectValue placeholder="Conflict Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="double_booking">Double Booking</SelectItem>
                  <SelectItem value="staff_restriction">Staff Restriction</SelectItem>
                  <SelectItem value="unavailability_overlap">Unavailability</SelectItem>
                  <SelectItem value="outside_availability">Outside Availability</SelectItem>
                  <SelectItem value="client_preference_warning">Preference Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredConflicts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b">
                <Checkbox
                  checked={selectedConflicts.length === filteredConflicts.length && filteredConflicts.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedConflicts.length > 0 ? `${selectedConflicts.length} selected` : "Select all"}
                </span>
              </div>
              {filteredConflicts.map((conflict) => (
                <Card
                  key={conflict.id}
                  className={`${
                    conflict.severity === "critical"
                      ? "border-red-200 dark:border-red-900/50"
                      : conflict.severity === "warning"
                      ? "border-amber-200 dark:border-amber-900/50"
                      : ""
                  }`}
                  data-testid={`card-conflict-${conflict.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedConflicts.includes(conflict.id)}
                        onCheckedChange={(checked) => handleSelectConflict(conflict.id, checked as boolean)}
                        data-testid={`checkbox-conflict-${conflict.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getSeverityColor(conflict.severity)}>
                            {conflict.severity}
                          </Badge>
                          <Badge className={getStatusColor(conflict.status)}>
                            {conflict.status}
                          </Badge>
                          <Badge variant="outline">
                            {formatConflictType(conflict.conflictType)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{conflict.staffName || "Unknown Staff"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{conflict.clientName || "Unknown Client"}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {conflict.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Detected: {formatDate(conflict.detectedAt)}</span>
                          {conflict.resolvedAt && (
                            <>
                              <span className="mx-1">-</span>
                              <span>Resolved: {formatDate(conflict.resolvedAt)}</span>
                            </>
                          )}
                        </div>
                        {conflict.resolutionNotes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Resolution: {conflict.resolutionNotes}
                          </p>
                        )}
                      </div>
                      {conflict.status === "open" && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveClick(conflict)}
                            data-testid={`button-resolve-${conflict.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismiss(conflict)}
                            data-testid={`button-dismiss-${conflict.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarX className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No conflicts found</p>
              <p className="text-sm mt-1">
                {statusFilter === "open"
                  ? "All staff assignments are valid"
                  : "No conflicts match your filters"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Conflict</DialogTitle>
            <DialogDescription>
              Provide details about how this conflict was resolved.
            </DialogDescription>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-medium">{formatConflictType(selectedConflict.conflictType)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedConflict.staffName} - {selectedConflict.clientName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{selectedConflict.description}</p>
              </div>
              <div className="space-y-2">
                <Label>Resolution Action</Label>
                <Select value={resolutionAction} onValueChange={setResolutionAction}>
                  <SelectTrigger data-testid="select-resolution-action">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reassigned">Staff Reassigned</SelectItem>
                    <SelectItem value="override_approved">Override Approved</SelectItem>
                    <SelectItem value="appointment_cancelled">Appointment Cancelled</SelectItem>
                    <SelectItem value="restriction_updated">Restriction Updated</SelectItem>
                    <SelectItem value="auto_resolved">Auto-resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how the conflict was resolved..."
                  rows={3}
                  data-testid="textarea-resolution-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveSubmit} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "Resolving..." : "Resolve Conflict"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
