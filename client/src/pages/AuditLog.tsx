import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Filter, Eye, Download, ChevronLeft, ChevronRight, History, User, FileText, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { AuditLog } from "@shared/schema";

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
}

const ENTITY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "client", label: "Clients" },
  { value: "document", label: "Documents" },
  { value: "note", label: "Progress Notes" },
  { value: "incident", label: "Incidents" },
  { value: "budget", label: "Budgets" },
  { value: "staff", label: "Staff" },
  { value: "goal", label: "Goals" },
  { value: "service_delivery", label: "Service Deliveries" },
];

const OPERATIONS = [
  { value: "all", label: "All Operations" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "archive", label: "Archived" },
  { value: "restore", label: "Restored" },
];

function getOperationColor(operation: string): string {
  switch (operation) {
    case "create": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "update": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "delete": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "archive": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "restore": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function getEntityTypeIcon(entityType: string) {
  switch (entityType) {
    case "client": return <User className="w-4 h-4" />;
    case "document": return <FileText className="w-4 h-4" />;
    case "incident": return <AlertCircle className="w-4 h-4" />;
    default: return <History className="w-4 h-4" />;
  }
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "string" && value.length > 100) return value.substring(0, 100) + "...";
  return String(value);
}

function AuditDetailDialog({ log }: { log: AuditLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-view-audit-${log.id}`}>
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEntityTypeIcon(log.entityType)}
            Audit Log Details
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Entity Type</Label>
                <p className="font-medium capitalize">{log.entityType}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entity Name</Label>
                <p className="font-medium">{log.entityName || log.entityId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Operation</Label>
                <Badge className={`${getOperationColor(log.operation)} capitalize`}>
                  {log.operation}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Timestamp</Label>
                <p className="font-medium">{format(new Date(log.createdAt), "PPpp")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">User</Label>
                <p className="font-medium">{log.userName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Role</Label>
                <p className="font-medium">{log.userRole || "N/A"}</p>
              </div>
            </div>

            {log.changedFields && log.changedFields.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-xs">Changed Fields</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {log.changedFields.map((field, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {formatFieldName(field)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {log.operation === "update" && log.changedFields && log.changedFields.length > 0 && (
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs">Field Changes</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Field</th>
                        <th className="text-left p-2 font-medium">Previous Value</th>
                        <th className="text-left p-2 font-medium w-8"></th>
                        <th className="text-left p-2 font-medium">New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.changedFields.map((field, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-medium">{formatFieldName(field)}</td>
                          <td className="p-2 text-red-600 dark:text-red-400 max-w-[200px] truncate">
                            {formatValue((log.oldValues as any)?.[field])}
                          </td>
                          <td className="p-2">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </td>
                          <td className="p-2 text-green-600 dark:text-green-400 max-w-[200px] truncate">
                            {formatValue((log.newValues as any)?.[field])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {log.operation === "create" && log.newValues && (
              <div>
                <Label className="text-muted-foreground text-xs">Created Values</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              </div>
            )}

            {log.operation === "delete" && log.oldValues && (
              <div>
                <Label className="text-muted-foreground text-xs">Deleted Values</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <Label className="text-muted-foreground text-xs">IP Address</Label>
                <p className="font-mono text-sm">{log.ipAddress || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entity ID</Label>
                <p className="font-mono text-sm">{log.entityId}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState("all");
  const [operation, setOperation] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const queryParams = new URLSearchParams();
  if (entityType !== "all") queryParams.set("entityType", entityType);
  if (operation !== "all") queryParams.set("operation", operation);
  if (startDate) queryParams.set("startDate", new Date(startDate).toISOString());
  if (endDate) queryParams.set("endDate", new Date(endDate + "T23:59:59").toISOString());
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(page * pageSize));

  const { data, isLoading, error } = useQuery<AuditLogResponse>({
    queryKey: ["/api/audit-logs", entityType, operation, startDate, endDate, page],
    queryFn: async () => {
      const response = await fetch(`/api/audit-logs?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
  });

  const filteredLogs = data?.logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.entityName?.toLowerCase().includes(term) ||
      log.userName.toLowerCase().includes(term) ||
      log.entityId.toLowerCase().includes(term)
    );
  }) || [];

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  const exportToCSV = () => {
    if (!data?.logs) return;
    
    const headers = ["Timestamp", "User", "Role", "Entity Type", "Entity Name", "Operation", "Changed Fields"];
    const rows = data.logs.map(log => [
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      log.userName,
      log.userRole || "",
      log.entityType,
      log.entityName || log.entityId,
      log.operation,
      log.changedFields?.join(", ") || ""
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Audit Log</h1>
          <p className="text-muted-foreground">Track all changes made to the system for compliance and review</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2" data-testid="button-export-csv">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit logs by entity type, operation, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(0); }}>
                <SelectTrigger data-testid="select-entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={v => { setOperation(v); setPage(0); }}>
                <SelectTrigger data-testid="select-operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATIONS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Audit History
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {data?.total || 0} total records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load audit logs
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found matching the filters
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Timestamp</th>
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Entity</th>
                      <th className="text-left p-3 font-medium">Operation</th>
                      <th className="text-left p-3 font-medium">Changes</th>
                      <th className="text-left p-3 font-medium w-16">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-t hover:bg-muted/30" data-testid={`row-audit-${log.id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{format(new Date(log.createdAt), "MMM d, yyyy")}</span>
                            <span className="text-muted-foreground">{format(new Date(log.createdAt), "h:mm a")}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-sm">{log.userName}</p>
                            {log.userRole && (
                              <p className="text-xs text-muted-foreground capitalize">{log.userRole}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getEntityTypeIcon(log.entityType)}
                            <div>
                              <p className="font-medium text-sm">{log.entityName || log.entityId}</p>
                              <p className="text-xs text-muted-foreground capitalize">{log.entityType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`${getOperationColor(log.operation)} capitalize`}>
                            {log.operation}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {log.changedFields && log.changedFields.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.changedFields.slice(0, 3).map((field, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {formatFieldName(field)}
                                </Badge>
                              ))}
                              {log.changedFields.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{log.changedFields.length - 3} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <AuditDetailDialog log={log} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total || 0} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
