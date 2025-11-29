import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, XCircle, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Timesheet {
  id: string;
  staffId: string;
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

export default function TimesheetApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("pending_approval");
  const [viewingTimesheet, setViewingTimesheet] = useState<Timesheet | null>(null);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch timesheets
  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", { status: selectedStatus }],
  });

  // Approve timesheet mutation
  const approveMutation = useMutation({
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
      toast({
        title: "Timesheet Approved",
        description: "The timesheet has been approved successfully.",
      });
      setViewingTimesheet(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject timesheet mutation
  const rejectMutation = useMutation({
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
      toast({
        title: "Timesheet Rejected",
        description: "The timesheet has been rejected.",
      });
      setViewingTimesheet(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // View timesheet details
  const viewTimesheet = async (timesheet: Timesheet) => {
    try {
      const res = await fetch(`/api/timesheets/${timesheet.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setViewingTimesheet(data);
      setTimesheetEntries(data.entries || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load timesheet details",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timesheet Approval</h1>
        <p className="text-muted-foreground">Review and approve staff timesheets</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          variant={selectedStatus === "pending_approval" ? "default" : "outline"}
          onClick={() => setSelectedStatus("pending_approval")}
        >
          <Clock className="w-4 h-4 mr-2" />
          Pending Approval
        </Button>
        <Button
          variant={selectedStatus === "approved" ? "default" : "outline"}
          onClick={() => setSelectedStatus("approved")}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Approved
        </Button>
        <Button
          variant={selectedStatus === "rejected" ? "default" : "outline"}
          onClick={() => setSelectedStatus("rejected")}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Rejected
        </Button>
      </div>

      {/* Timesheets table */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheets</CardTitle>
          <CardDescription>
            {selectedStatus === "pending_approval" && "Review timesheets awaiting approval"}
            {selectedStatus === "approved" && "Previously approved timesheets"}
            {selectedStatus === "rejected" && "Rejected timesheets"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading timesheets...</div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No timesheets found with status: {selectedStatus}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell className="font-medium">{timesheet.staffId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                      </div>
                    </TableCell>
                    <TableCell>{parseFloat(timesheet.totalHours).toFixed(2)}h</TableCell>
                    <TableCell>{getStatusBadge(timesheet.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(timesheet.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewTimesheet(timesheet)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Timesheet details dialog */}
      <Dialog open={!!viewingTimesheet} onOpenChange={() => setViewingTimesheet(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timesheet Details</DialogTitle>
            <DialogDescription>
              Review timesheet entries and approve or reject
            </DialogDescription>
          </DialogHeader>

          {viewingTimesheet && (
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
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
                      <div className="text-xl font-semibold">
                        {(parseFloat(viewingTimesheet.saturdayHours) + parseFloat(viewingTimesheet.sundayHours)).toFixed(2)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Evening/Night</div>
                      <div className="text-xl font-semibold">
                        {(parseFloat(viewingTimesheet.eveningHours) + parseFloat(viewingTimesheet.nightHours)).toFixed(2)}h
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entries */}
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectDialog(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate(viewingTimesheet.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
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

      {/* Rejection dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timesheet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
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
                  rejectMutation.mutate({
                    timesheetId: viewingTimesheet.id,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
