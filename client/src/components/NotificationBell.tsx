import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, MessageSquare, AlertCircle, Megaphone, ClipboardList, Calendar, FileText, Users, Heart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface NotificationBellProps {
  className?: string;
  userId?: string;
  userName?: string;
}

export default function NotificationBell({ className, userId, userName }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // Poll every 60 seconds as backup
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000,
  });

  // WebSocket connection for real-time notifications
  const connectWebSocket = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${userId}&userName=${encodeURIComponent(userName || "User")}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Notifications] WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "notification") {
            // New notification received - refresh queries
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
            
            // Show toast for new notification
            toast({
              title: data.notification.title,
              description: data.notification.message,
            });
          } else if (data.type === "unread_count") {
            // Update unread count directly
            queryClient.setQueryData(["/api/notifications/unread-count"], { count: data.count });
          } else if (data.type === "notification_update") {
            // Notification was updated (read/archived)
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
          }
        } catch (error) {
          console.error("[Notifications] Error parsing message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[Notifications] WebSocket disconnected");
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("[Notifications] WebSocket error:", error);
      };
    } catch (error) {
      console.error("[Notifications] Error creating WebSocket:", error);
    }
  }, [userId, userName, toast]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

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
        return <ClipboardList className={`h-4 w-4 ${priorityColor || "text-blue-500"}`} />;
      case "ticket_comment":
        return <MessageSquare className={`h-4 w-4 ${priorityColor || "text-green-500"}`} />;
      case "announcement":
      case "system":
        return <Megaphone className={`h-4 w-4 ${priorityColor || "text-purple-500"}`} />;
      case "task_assigned":
      case "task_updated":
      case "task_completed":
      case "task_due":
        return <ClipboardList className={`h-4 w-4 ${priorityColor || "text-orange-500"}`} />;
      case "approval_required":
        return <AlertCircle className={`h-4 w-4 ${priorityColor || "text-yellow-500"}`} />;
      case "appointment_reminder":
      case "appointment_update":
      case "appointment_cancelled":
        return <Calendar className={`h-4 w-4 ${priorityColor || "text-sky-500"}`} />;
      case "compliance_warning":
      case "compliance_expired":
        return <Shield className={`h-4 w-4 ${priorityColor || "text-red-500"}`} />;
      case "chat_message":
      case "chat_mention":
        return <MessageSquare className={`h-4 w-4 ${priorityColor || "text-pink-500"}`} />;
      case "client_update":
      case "client_incident":
      case "care_plan_update":
        return <Users className={`h-4 w-4 ${priorityColor || "text-emerald-500"}`} />;
      case "document_uploaded":
        return <FileText className={`h-4 w-4 ${priorityColor || "text-amber-500"}`} />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (notification.isRead === "no") {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on linkUrl or relatedType
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
    
    setOpen(false);
  };

  const count = unreadCount?.count || 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={className}
              data-testid="button-notifications"
            >
              <div className="relative">
                <Bell className="h-4 w-4" />
                {count > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center"
                  >
                    {count > 99 ? "99+" : count}
                  </Badge>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notifications</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer hover-elevate transition-colors ${
                  notification.isRead === "no" ? "bg-primary/5" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type, notification.priority)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${
                      notification.isRead === "no" ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {notification.title}
                    </p>
                    {notification.isRead === "no" && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(notification.id);
                  }}
                  data-testid={`button-delete-notification-${notification.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="justify-center text-sm text-primary cursor-pointer"
          onClick={() => {
            setLocation("/notifications");
            setOpen(false);
          }}
          data-testid="link-view-all-notifications"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View All Notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
