import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ChatRoom, ChatRoomParticipant } from "@shared/schema";
import {
  MessageSquare,
  Search,
  Filter,
  Lock,
  Unlock,
  Archive,
  ArchiveRestore,
  Trash2,
  Users,
  Hash,
  User as UserIcon,
  MoreVertical,
  Shield,
  Briefcase,
  Megaphone,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChatRoomWithDetails extends ChatRoom {
  participantCount: number;
  participants: ChatRoomParticipant[];
}

interface AdminDashboardResponse {
  rooms: ChatRoomWithDetails[];
  total: number;
  limit: number;
  offset: number;
}

export default function AdminChat() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lockedFilter, setLockedFilter] = useState<string>("all");
  const [archivedFilter, setArchivedFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const pageSize = 20;

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (lockedFilter !== "all") params.set("isLocked", lockedFilter);
    if (archivedFilter !== "all") params.set("isArchived", archivedFilter);
    params.set("limit", pageSize.toString());
    params.set("offset", (currentPage * pageSize).toString());
    return params.toString();
  };

  const { data: dashboardData, isLoading, refetch } = useQuery<AdminDashboardResponse>({
    queryKey: ["/api/chat/admin/dashboard", searchQuery, typeFilter, statusFilter, lockedFilter, archivedFilter, currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/chat/admin/dashboard?${buildQueryParams()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
  });

  const lockRoomMutation = useMutation({
    mutationFn: async ({ roomId, lock }: { roomId: string; lock: boolean }) => {
      const endpoint = lock ? "lock" : "unlock";
      const response = await apiRequest("PATCH", `/api/chat/rooms/${roomId}/${endpoint}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/admin/dashboard"] });
      toast({ title: "Room updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update room", variant: "destructive" });
    },
  });

  const archiveRoomMutation = useMutation({
    mutationFn: async ({ roomId, archive }: { roomId: string; archive: boolean }) => {
      const endpoint = archive ? "archive" : "unarchive";
      const response = await apiRequest("PATCH", `/api/chat/rooms/${roomId}/${endpoint}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/admin/dashboard"] });
      toast({ title: "Room updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update room", variant: "destructive" });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest("DELETE", `/api/chat/rooms/${roomId}`);
      return response.json();
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
      setSelectedRoom(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/admin/dashboard"] });
      toast({ title: "Room deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete room", variant: "destructive" });
    },
  });

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case "direct":
        return <UserIcon className="h-4 w-4" />;
      case "group":
        return <Users className="h-4 w-4" />;
      case "client":
        return <Briefcase className="h-4 w-4" />;
      case "announcement":
        return <Megaphone className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case "direct":
        return "Direct";
      case "group":
        return "Group";
      case "client":
        return "Client";
      case "announcement":
        return "Announcement";
      default:
        return type;
    }
  };

  const getStatusBadge = (room: ChatRoomWithDetails) => {
    if (room.deletedAt) {
      return <Badge variant="destructive">Deleted</Badge>;
    }
    if (room.archivedAt) {
      return <Badge variant="secondary">Archived</Badge>;
    }
    if (room.isLocked) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Locked</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const handleExport = () => {
    const rooms = dashboardData?.rooms || [];
    const csvData = rooms.map(room => ({
      id: room.id,
      name: room.name || "Unnamed",
      type: room.type,
      participants: room.participantCount,
      status: room.deletedAt ? "Deleted" : room.archivedAt ? "Archived" : room.isLocked ? "Locked" : "Active",
      createdAt: room.createdAt ? format(new Date(room.createdAt), "yyyy-MM-dd HH:mm") : "",
    }));
    
    const headers = ["ID", "Name", "Type", "Participants", "Status", "Created At"];
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => [row.id, `"${row.name}"`, row.type, row.participants, row.status, row.createdAt].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-rooms-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil((dashboardData?.total || 0) / pageSize);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Chat Administration
          </h1>
          <p className="text-muted-foreground">
            Manage all chat rooms, lifecycle controls, and audit activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter chat rooms by type, status, and more</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-type-all">All Types</SelectItem>
                <SelectItem value="direct" data-testid="select-type-direct">Direct</SelectItem>
                <SelectItem value="group" data-testid="select-type-group">Group</SelectItem>
                <SelectItem value="client" data-testid="select-type-client">Client</SelectItem>
                <SelectItem value="announcement" data-testid="select-type-announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-status-all">All Status</SelectItem>
                <SelectItem value="active" data-testid="select-status-active">Active</SelectItem>
                <SelectItem value="archived" data-testid="select-status-archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lockedFilter} onValueChange={(v) => { setLockedFilter(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-locked">
                <SelectValue placeholder="Locked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-locked-all">All</SelectItem>
                <SelectItem value="true" data-testid="select-locked-true">Locked</SelectItem>
                <SelectItem value="false" data-testid="select-locked-false">Unlocked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={archivedFilter} onValueChange={(v) => { setArchivedFilter(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-archived">
                <SelectValue placeholder="Archived" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-archived-all">All</SelectItem>
                <SelectItem value="true" data-testid="select-archived-true">Archived</SelectItem>
                <SelectItem value="false" data-testid="select-archived-false">Not Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Chat Rooms</CardTitle>
            <CardDescription>
              {dashboardData?.total || 0} total rooms
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !dashboardData?.rooms.length ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No chat rooms found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.rooms.map((room) => (
                    <TableRow key={room.id} data-testid={`row-room-${room.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {room.name?.charAt(0).toUpperCase() || "#"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{room.name || "Unnamed Room"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {room.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoomTypeIcon(room.type)}
                          <span>{getRoomTypeLabel(room.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{room.participantCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(room)}</TableCell>
                      <TableCell>
                        {room.createdAt ? format(new Date(room.createdAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${room.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {room.isLocked ? (
                              <DropdownMenuItem
                                onClick={() => lockRoomMutation.mutate({ roomId: room.id, lock: false })}
                                data-testid={`button-unlock-${room.id}`}
                              >
                                <Unlock className="h-4 w-4 mr-2" />
                                Unlock Room
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => lockRoomMutation.mutate({ roomId: room.id, lock: true })}
                                data-testid={`button-lock-${room.id}`}
                              >
                                <Lock className="h-4 w-4 mr-2" />
                                Lock Room
                              </DropdownMenuItem>
                            )}
                            {room.archivedAt ? (
                              <DropdownMenuItem
                                onClick={() => archiveRoomMutation.mutate({ roomId: room.id, archive: false })}
                                data-testid={`button-unarchive-${room.id}`}
                              >
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Unarchive Room
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => archiveRoomMutation.mutate({ roomId: room.id, archive: true })}
                                data-testid={`button-archive-${room.id}`}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive Room
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedRoom(room);
                                setShowDeleteDialog(true);
                              }}
                              data-testid={`button-delete-${room.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Room
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, dashboardData.total)} of {dashboardData.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(p => p - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage(p => p + 1)}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Chat Room
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRoom?.name || "this room"}"? This action cannot be undone. All messages and attachments will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRoom && deleteRoomMutation.mutate(selectedRoom.id)}
              disabled={deleteRoomMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRoomMutation.isPending ? "Deleting..." : "Delete Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
