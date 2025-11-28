import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, MessageSquare, AlertCircle, Megaphone, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ticket_created":
      case "ticket_updated":
      case "ticket_assigned":
        return <ClipboardList className="h-4 w-4 text-blue-500" />;
      case "ticket_comment":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "announcement":
        return <Megaphone className="h-4 w-4 text-purple-500" />;
      case "task_assigned":
      case "task_due":
        return <ClipboardList className="h-4 w-4 text-orange-500" />;
      case "approval_required":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (notification.isRead === "no") {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on type
    if (notification.relatedType === "ticket" && notification.relatedId) {
      setLocation(`/help-desk?ticket=${notification.relatedId}`);
    }
    
    setOpen(false);
  };

  const count = unreadCount?.count || 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
                  {getNotificationIcon(notification.type)}
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
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-sm text-primary"
              onClick={() => {
                setLocation("/help-desk");
                setOpen(false);
              }}
              data-testid="link-view-all-notifications"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Help Desk
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
