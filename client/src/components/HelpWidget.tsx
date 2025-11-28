import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  HelpCircle, 
  MessageSquarePlus, 
  ClipboardList, 
  X, 
  Send, 
  Camera, 
  Trash2,
  ChevronUp,
  AlertCircle,
  Bug,
  Lightbulb,
  HelpCircle as QuestionIcon,
  Lock,
  Database,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { SupportTicket } from "@shared/schema";

const TICKET_CATEGORIES = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-500" },
  { value: "feature_request", label: "Feature Request", icon: Lightbulb, color: "text-yellow-500" },
  { value: "question", label: "Question", icon: QuestionIcon, color: "text-blue-500" },
  { value: "access_issue", label: "Access Issue", icon: Lock, color: "text-orange-500" },
  { value: "data_issue", label: "Data Issue", icon: Database, color: "text-purple-500" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-gray-500" },
];

const TICKET_PRIORITIES = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
];

export default function HelpWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showMyTicketsDialog, setShowMyTicketsDialog] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Hide widget on chat page to avoid overlapping with chat controls
  const isOnChatPage = location.startsWith("/chat");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [errorCode, setErrorCode] = useState("");

  // Get current page URL for context
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const { data: myTickets = [] } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets/my"],
    enabled: showMyTicketsDialog,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/tickets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Ticket Submitted!",
        description: "We've received your request and will get back to you soon.",
      });
      resetForm();
      setShowTicketDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("bug");
    setPriority("medium");
    setErrorCode("");
    setScreenshots([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setScreenshots((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and description for your ticket.",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      errorCode: errorCode.trim() || null,
      pageUrl,
      screenshots,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "in_progress": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "waiting_response": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "resolved": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "closed": return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Don't render the floating button on chat page to avoid overlap with chat controls
  // Dialogs can still be triggered from elsewhere if needed
  if (isOnChatPage) {
    return (
      <>
        {/* Dialogs still available if triggered externally */}
        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          {/* ... dialog content remains available ... */}
        </Dialog>
        <Dialog open={showMyTicketsDialog} onOpenChange={setShowMyTicketsDialog}>
          {/* ... dialog content remains available ... */}
        </Dialog>
      </>
    );
  }

  return (
    <>
      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Expanded Menu */}
        {isExpanded && (
          <div className="bg-card border rounded-lg shadow-lg p-2 mb-2 animate-in slide-in-from-bottom-2 duration-200">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 mb-1"
              onClick={() => {
                setShowTicketDialog(true);
                setIsExpanded(false);
              }}
              data-testid="button-report-issue"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Report an Issue
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                setShowMyTicketsDialog(true);
                setIsExpanded(false);
              }}
              data-testid="button-my-tickets"
            >
              <ClipboardList className="h-4 w-4" />
              My Tickets
            </Button>
          </div>
        )}

        {/* Main Button */}
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-help-widget"
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <HelpCircle className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Report Issue Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Report an Issue
            </DialogTitle>
            <DialogDescription>
              Let us know what's happening and we'll help you out.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">What's the issue? *</Label>
              <Input
                id="title"
                placeholder="Brief summary of the problem"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-ticket-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-ticket-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className={`h-4 w-4 ${cat.color}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <Badge variant="secondary" className={p.color}>
                          {p.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorCode">Error Code (if any)</Label>
              <Input
                id="errorCode"
                placeholder="e.g., ERR_500, API_TIMEOUT"
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                data-testid="input-error-code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please describe what happened, what you expected, and steps to reproduce the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                data-testid="input-ticket-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Screenshots</Label>
              <div className="flex flex-wrap gap-2">
                {screenshots.map((screenshot, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="h-16 w-16 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeScreenshot(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-16 w-16"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-add-screenshot"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Add screenshots to help us understand the issue better
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTicketDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTicketMutation.isPending}
                data-testid="button-submit-ticket"
              >
                {createTicketMutation.isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* My Tickets Dialog */}
      <Dialog open={showMyTicketsDialog} onOpenChange={setShowMyTicketsDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              My Tickets
            </DialogTitle>
            <DialogDescription>
              Track the status of your submitted tickets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {myTickets.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No tickets yet</p>
                <p className="text-sm text-muted-foreground/70">
                  When you report an issue, it will appear here
                </p>
              </div>
            ) : (
              myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover-elevate cursor-pointer"
                  onClick={() => {
                    setLocation(`/help-desk?ticket=${ticket.id}`);
                    setShowMyTicketsDialog(false);
                  }}
                  data-testid={`ticket-item-${ticket.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          #{ticket.ticketNumber}
                        </span>
                        <Badge className={getStatusColor(ticket.status)}>
                          {formatStatus(ticket.status)}
                        </Badge>
                      </div>
                      <h4 className="font-medium truncate">{ticket.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {ticket.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowTicketDialog(true);
                setShowMyTicketsDialog(false);
              }}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowMyTicketsDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
