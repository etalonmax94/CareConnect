import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, Archive, Filter, Calendar, FileText, Users, MessageSquare, AlertCircle, Megaphone, ClipboardList, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import type { Notification } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const pageSize = 20;

  const { data: notificationsData, isLoading } = useQuery<{
    notifications: Notification[];
    total: number;
  }>({
    queryKey: ["/api/notifications/paginated", page, pageSize, typeFilter, readFilter],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: pageSize.toString(),
      });
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (readFilter !== "all") params.append("isRead", readFilter);
      
      const response = await fetch(`/api/notifications/paginated?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "Notification archived" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getNotificationIcon = (type: string, priority?: string | null) => {
    const priorityColor = priority === "urgent" ? "text-red-500" : 
                         priority === "high" ? "text-orange-500" : undefined;
    
    switch (type) {
      case "ticket_created":
      case "ticket_updated":
      case "ticket_assigned":
      case "ticket_resolved":
        return <ClipboardList className={`h-5 w-5 ${priorityColor || "text-blue-500"}`} />;
      case "ticket_comment":
        return <MessageSquare className={`h-5 w-5 ${priorityColor || "text-green-500"}`} />;
      case "announcement":
      case "system":
        return <Megaphone className={`h-5 w-5 ${priorityColor || "text-purple-500"}`} />;
      case "task_assigned":
      case "task_updated":
      case "task_completed":
      case "task_due":
        return <ClipboardList className={`h-5 w-5 ${priorityColor || "text-orange-500"}`} />;
      case "approval_required":
        return <AlertCircle className={`h-5 w-5 ${priorityColor || "text-yellow-500"}`} />;
      case "appointment_reminder":
      case "appointment_update":
      case "appointment_cancelled":
        return <Calendar className={`h-5 w-5 ${priorityColor || "text-sky-500"}`} />;
      case "compliance_warning":
      case "compliance_expired":
        return <Shield className={`h-5 w-5 ${priorityColor || "text-red-500"}`} />;
      case "chat_message":
      case "chat_mention":
        return <MessageSquare className={`h-5 w-5 ${priorityColor || "text-pink-500"}`} />;
      case "client_update":
      case "client_incident":
      case "care_plan_update":
        return <Users className={`h-5 w-5 ${priorityColor || "text-emerald-500"}`} />;
      case "document_uploaded":
        return <FileText className={`h-5 w-5 ${priorityColor || "text-amber-500"}`} />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority || priority === "normal") return null;
    
    const variants: Record<string, "destructive" | "secondary" | "default"> = {
      urgent: "destructive",
      high: "secondary",
      low: "default",
    };
    
    return (
      <Badge variant={variants[priority] || "default"} className="text-xs">
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.isRead === "no") {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
    } else if (notification.relatedType && notification.relatedId) {
      switch (notification.relatedType) {
        case "ticket":
          setLocation(`/help-desk?ticket=${notification.relatedId}`);
          break;
        case "task":
          setLocation(`/tasks?task=${notification.relatedId}`);
          break;
        case "appointment":
          setLocation(`/appointments?id=${notification.relatedId}`);
          break;
        case "client":
          setLocation(`/clients/${notification.relatedId}`);
          break;
        case "chat":
          setLocation(`/chat?room=${notification.relatedId}`);
          break;
        default:
          break;
      }
    }
  };

  const notificationTypes = [
    { value: "all", label: "All Types" },
    { value: "ticket_created", label: "Tickets Created" },
    { value: "ticket_assigned", label: "Tickets Assigned" },
    { value: "ticket_comment", label: "Ticket Comments" },
    { value: "task_assigned", label: "Tasks Assigned" },
    { value: "task_due", label: "Tasks Due" },
    { value: "appointment_reminder", label: "Appointments" },
    { value: "compliance_warning", label: "Compliance Warnings" },
    { value: "chat_message", label: "Chat Messages" },
    { value: "announcement", label: "Announcements" },
  ];

  const notifications = notificationsData?.notifications || [];
  const total = notificationsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const count = unreadCount?.count || 0;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center justify-center sm:justify-start gap-2">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            Notifications
            {count > 0 && (
              <Badge variant="destructive" className="ml-2">
                {count} unread
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Stay updated with important alerts and activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[180px]" data-testid="select-notification-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={readFilter} onValueChange={(value) => { setReadFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-read-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="no">Unread Only</SelectItem>
                  <SelectItem value="yes">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {typeFilter !== "all" || readFilter !== "all"
                  ? "No notifications match your current filters"
                  : "You're all caught up! Check back later for updates."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 cursor-pointer hover-elevate transition-colors ${
                    notification.isRead === "no" ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-row-${notification.id}`}
                >
                  <div className="flex-shrink-0 mt-1 p-2 rounded-full bg-muted">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium ${
                          notification.isRead === "no" ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {notification.title}
                        </p>
                        {notification.isRead === "no" && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                      <span className="text-muted-foreground/30">|</span>
                      <Badge variant="outline" className="text-xs">
                        {notification.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {notification.isRead === "no" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notification.id);
                        }}
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveMutation.mutate(notification.id);
                      }}
                      data-testid={`button-archive-${notification.id}`}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notification.id);
                      }}
                      data-testid={`button-delete-${notification.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} notifications
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
