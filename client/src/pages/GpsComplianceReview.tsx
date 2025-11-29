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
import { MapPin, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GpsComplianceLog {
  id: string;
  eventType: "clock_in" | "clock_out" | "location_update" | "geofence_violation";
  staffId?: string;
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

export default function GpsComplianceReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterCompliant, setFilterCompliant] = useState<boolean | undefined>(false);
  const [viewingLog, setViewingLog] = useState<GpsComplianceLog | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch GPS compliance logs
  const { data: logs = [], isLoading } = useQuery<GpsComplianceLog[]>({
    queryKey: ["/api/gps-compliance-logs", { isCompliant: filterCompliant }],
  });

  // Review GPS log mutation
  const reviewMutation = useMutation({
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
      toast({
        title: "Review Submitted",
        description: "GPS compliance log has been reviewed.",
      });
      setViewingLog(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getComplianceBadge = (isCompliant: string) => {
    if (isCompliant === "yes") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Compliant
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Non-Compliant
        </Badge>
    );
  };

  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      clock_in: "bg-blue-50 text-blue-700 border-blue-200",
      clock_out: "bg-purple-50 text-purple-700 border-purple-200",
      location_update: "bg-gray-50 text-gray-700 border-gray-200",
      geofence_violation: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return (
      <Badge variant="outline" className={colors[eventType] || ""}>
        {eventType.replace(/_/g, " ")}
      </Badge>
    );
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
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

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">GPS Compliance Review</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Monitor and review GPS compliance violations</p>
      </div>

      {/* Filter controls */}
      <div className="flex gap-2">
        <Button
          variant={filterCompliant === false ? "default" : "outline"}
          onClick={() => setFilterCompliant(false)}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Non-Compliant Only
        </Button>
        <Button
          variant={filterCompliant === true ? "default" : "outline"}
          onClick={() => setFilterCompliant(true)}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Compliant Only
        </Button>
        <Button
          variant={filterCompliant === undefined ? "default" : "outline"}
          onClick={() => setFilterCompliant(undefined)}
        >
          All Logs
        </Button>
      </div>

      {/* GPS logs table */}
      <Card>
        <CardHeader>
          <CardTitle>GPS Compliance Logs</CardTitle>
          <CardDescription>
            Review location compliance for clock events and appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading compliance logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No GPS compliance logs found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell>{getEventTypeBadge(log.eventType)}</TableCell>
                    <TableCell className="font-medium">{log.staffId || "N/A"}</TableCell>
                    <TableCell>
                      {log.distanceMeters ? (
                        <span className={parseFloat(log.distanceMeters) > 100 ? "text-red-600 font-medium" : ""}>
                          {formatDistance(log.distanceMeters)}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>{getComplianceBadge(log.isCompliant)}</TableCell>
                    <TableCell>
                      {log.reviewedAt ? (
                        <Badge variant="outline" className="bg-gray-50">Reviewed</Badge>
                      ) : log.requiresReview === "yes" ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Needs Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">No Review Needed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingLog(log)}
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

      {/* GPS log details dialog */}
      <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>GPS Compliance Details</DialogTitle>
            <DialogDescription>
              Review location data and compliance status
            </DialogDescription>
          </DialogHeader>

          {viewingLog && (
            <div className="space-y-6">
              {/* Event info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Event Type</div>
                  <div className="mt-1">{getEventTypeBadge(viewingLog.eventType)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Compliance Status</div>
                  <div className="mt-1">{getComplianceBadge(viewingLog.isCompliant)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Staff ID</div>
                  <div className="mt-1 font-medium">{viewingLog.staffId || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Timestamp</div>
                  <div className="mt-1 text-sm">{formatDateTime(viewingLog.timestamp)}</div>
                </div>
              </div>

              {/* Location data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Location Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {viewingLog.recordedLatitude && viewingLog.recordedLongitude && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Recorded Location</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {viewingLog.recordedLatitude}, {viewingLog.recordedLongitude}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMapsLink(viewingLog.recordedLatitude, viewingLog.recordedLongitude)}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  )}

                  {viewingLog.expectedLatitude && viewingLog.expectedLongitude && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Expected Location</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {viewingLog.expectedLatitude}, {viewingLog.expectedLongitude}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMapsLink(viewingLog.expectedLatitude, viewingLog.expectedLongitude)}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  )}

                  {viewingLog.distanceMeters && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Distance from Expected</div>
                      <div className={`text-lg font-semibold ${parseFloat(viewingLog.distanceMeters) > 100 ? "text-red-600" : "text-green-600"}`}>
                        {formatDistance(viewingLog.distanceMeters)}
                      </div>
                      {parseFloat(viewingLog.distanceMeters) > 100 && (
                        <div className="text-sm text-red-600 mt-1">
                          Exceeds 100m threshold
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {viewingLog.notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Notes</div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">{viewingLog.notes}</div>
                </div>
              )}

              {/* Review section */}
              {viewingLog.reviewedAt ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-900">
                    Reviewed on {formatDateTime(viewingLog.reviewedAt)}
                  </div>
                  {viewingLog.reviewNotes && (
                    <div className="text-sm text-green-700 mt-2">{viewingLog.reviewNotes}</div>
                  )}
                </div>
              ) : viewingLog.requiresReview === "yes" ? (
                <div className="space-y-3">
                  <Label htmlFor="review-notes">Review Notes</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add notes about this GPS compliance event..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              ) : null}

              {!viewingLog.reviewedAt && viewingLog.requiresReview === "yes" && (
                <DialogFooter>
                  <Button
                    onClick={() => {
                      reviewMutation.mutate({
                        logId: viewingLog.id,
                        notes: reviewNotes,
                      });
                    }}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Reviewed
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
