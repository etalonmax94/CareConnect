import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  ClipboardList,
  Search,
  Filter,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Send,
  ArrowLeft,
  MoreVertical,
  UserPlus,
  CheckCheck,
  XCircle,
  Bug,
  Lightbulb,
  HelpCircle,
  Lock,
  Database,
  MoreHorizontal,
  Calendar,
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import type { SupportTicket, TicketComment, Staff } from "@shared/schema";

const TICKET_CATEGORIES = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-500" },
  { value: "feature_request", label: "Feature Request", icon: Lightbulb, color: "text-yellow-500" },
  { value: "question", label: "Question", icon: HelpCircle, color: "text-blue-500" },
  { value: "access_issue", label: "Access Issue", icon: Lock, color: "text-orange-500" },
  { value: "data_issue", label: "Data Issue", icon: Database, color: "text-purple-500" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-gray-500" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CircleDot }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: CircleDot },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", icon: Clock },
  waiting_response: { label: "Waiting Response", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", icon: MessageSquare },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300", icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

export default function HelpDesk() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const ticketIdFromUrl = new URLSearchParams(searchParams).get("ticket");
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketIdFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [newComment, setNewComment] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [, setLocation] = useLocation();

  // Update selected ticket when URL changes
  useEffect(() => {
    if (ticketIdFromUrl) {
      setSelectedTicketId(ticketIdFromUrl);
    }
  }, [ticketIdFromUrl]);

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: selectedTicket } = useQuery<SupportTicket>({
    queryKey: ["/api/tickets", selectedTicketId],
    enabled: !!selectedTicketId,
  });

  const { data: comments = [] } = useQuery<TicketComment[]>({
    queryKey: ["/api/tickets", selectedTicketId, "comments"],
    enabled: !!selectedTicketId,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ ticketId, assignedToId, assignedToName }: { ticketId: string; assignedToId: string; assignedToName: string }) => {
      return apiRequest("POST", `/api/tickets/${ticketId}/assign`, { assignedToId, assignedToName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      toast({ title: "Ticket assigned", description: "The ticket has been assigned successfully" });
      setShowAssignDialog(false);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ ticketId, resolutionNotes }: { ticketId: string; resolutionNotes: string }) => {
      return apiRequest("POST", `/api/tickets/${ticketId}/resolve`, { resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      toast({ title: "Ticket resolved!", description: "Great job resolving this issue" });
      setShowResolveDialog(false);
      setResolutionNotes("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return apiRequest("POST", `/api/tickets/${ticketId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      toast({ title: "Ticket closed", description: "The ticket has been closed" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      return apiRequest("POST", `/api/tickets/${ticketId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId, "comments"] });
      setNewComment("");
      toast({ title: "Comment added", description: "Your comment has been posted" });
    },
  });

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;

  const getCategoryIcon = (category: string) => {
    const cat = TICKET_CATEGORIES.find(c => c.value === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className={`h-4 w-4 ${cat.color}`} />;
    }
    return <HelpCircle className="h-4 w-4" />;
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setLocation(`/help-desk?ticket=${ticketId}`);
  };

  const handleBack = () => {
    setSelectedTicketId(null);
    setLocation("/help-desk");
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedTicketId && (
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Help Desk</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {selectedTicketId ? `Ticket #${selectedTicket?.ticketNumber}` : "Manage support tickets and issues"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - only show when no ticket selected */}
      {!selectedTicketId && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("open")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold">{openCount}</p>
                </div>
                <CircleDot className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("in_progress")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setStatusFilter("resolved")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold">{resolvedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Ticket List - hidden on mobile when ticket is selected */}
        <div className={`${selectedTicketId ? 'hidden lg:block' : ''} w-full lg:w-1/3 flex flex-col`}>
          {/* Search and Filters */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tickets"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ticket List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No tickets found</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "All caught up!"}
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const statusConfig = STATUS_CONFIG[ticket.status];
                  const priorityConfig = PRIORITY_CONFIG[ticket.priority];
                  
                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTicketId === ticket.id 
                          ? "border-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => handleSelectTicket(ticket.id)}
                      data-testid={`ticket-list-item-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(ticket.category)}
                          <span className="text-xs text-muted-foreground">#{ticket.ticketNumber}</span>
                        </div>
                        <Badge className={statusConfig.color} variant="secondary">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1 line-clamp-1">{ticket.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Badge className={priorityConfig.color} variant="secondary">
                            {priorityConfig.label}
                          </Badge>
                        </div>
                        <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Ticket Detail */}
        {selectedTicketId && selectedTicket && (
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(selectedTicket.category)}
                      <span className="text-sm text-muted-foreground">
                        #{selectedTicket.ticketNumber}
                      </span>
                      <Badge className={STATUS_CONFIG[selectedTicket.status]?.color}>
                        {STATUS_CONFIG[selectedTicket.status]?.label}
                      </Badge>
                      <Badge className={PRIORITY_CONFIG[selectedTicket.priority]?.color}>
                        {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{selectedTicket.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted by {selectedTicket.createdByName} on{" "}
                      {format(new Date(selectedTicket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-ticket-actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign to Staff
                      </DropdownMenuItem>
                      {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                        <DropdownMenuItem onClick={() => setShowResolveDialog(true)}>
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Mark as Resolved
                        </DropdownMenuItem>
                      )}
                      {selectedTicket.status === "resolved" && (
                        <DropdownMenuItem onClick={() => closeMutation.mutate(selectedTicket.id)}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Close Ticket
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Description */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  
                  {selectedTicket.errorCode && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground">Error Code</p>
                      <code className="text-sm bg-background px-2 py-1 rounded mt-1 inline-block">
                        {selectedTicket.errorCode}
                      </code>
                    </div>
                  )}
                  
                  {selectedTicket.pageUrl && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground">Page URL</p>
                      <p className="text-sm text-primary truncate">{selectedTicket.pageUrl}</p>
                    </div>
                  )}
                  
                  {selectedTicket.screenshots && (selectedTicket.screenshots as string[]).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Screenshots</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedTicket.screenshots as string[]).map((screenshot, index) => (
                          <a
                            key={index}
                            href={screenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned To */}
                {selectedTicket.assignedToName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned to:</span>
                    <span className="font-medium">{selectedTicket.assignedToName}</span>
                  </div>
                )}

                {/* Resolution Notes */}
                {selectedTicket.resolutionNotes && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Resolution
                      </span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {selectedTicket.resolutionNotes}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Resolved by {selectedTicket.resolvedByName} on{" "}
                      {selectedTicket.resolvedAt && format(new Date(selectedTicket.resolvedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Comments Section */}
                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-sm font-medium mb-3">
                    Comments ({comments.length})
                  </h3>
                  
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No comments yet
                        </p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {comment.authorName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.authorName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                                {comment.isInternal === "yes" && (
                                  <Badge variant="outline" className="text-xs">Internal</Badge>
                                )}
                              </div>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Add Comment */}
                  {selectedTicket.status !== "closed" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="resize-none"
                        rows={2}
                        data-testid="input-new-comment"
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (newComment.trim()) {
                            commentMutation.mutate({
                              ticketId: selectedTicket.id,
                              content: newComment.trim(),
                            });
                          }
                        }}
                        disabled={!newComment.trim() || commentMutation.isPending}
                        data-testid="button-submit-comment"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State when no ticket selected on desktop */}
        {!selectedTicketId && (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">Select a ticket</p>
              <p className="text-sm text-muted-foreground/70">
                Click on a ticket to view details and respond
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              Select a staff member to assign this ticket to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff members available
              </p>
            ) : (
              staff.filter(member => member.fullName).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => {
                    if (selectedTicketId) {
                      assignMutation.mutate({
                        ticketId: selectedTicketId,
                        assignedToId: member.userId || member.id,
                        assignedToName: member.fullName || "Unknown",
                      });
                    }
                  }}
                  data-testid={`assign-staff-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(member.fullName || "??").split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Add resolution notes to help the user understand what was done
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="resolution">Resolution Notes</Label>
            <Textarea
              id="resolution"
              placeholder="Describe how this issue was resolved..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              className="mt-2"
              data-testid="input-resolution-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTicketId) {
                  resolveMutation.mutate({
                    ticketId: selectedTicketId,
                    resolutionNotes,
                  });
                }
              }}
              disabled={resolveMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
