import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatRoom, ChatMessage, ChatRoomParticipant, Staff, UserRole, User } from "@shared/schema";
import { USER_ROLES } from "@shared/schema";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  User as UserIcon,
  MoreVertical,
  Settings,
  ArrowLeft,
  Hash,
  UserPlus,
  Crown,
  Shield,
  Archive,
  Megaphone,
  Briefcase,
  Filter,
  X,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ChatRoomWithParticipants extends ChatRoom {
  participants: ChatRoomParticipant[];
}

interface WebSocketMessage {
  type: "message" | "typing" | "read" | "presence" | "join" | "leave" | "error";
  roomId?: string;
  message?: ChatMessage;
  userId?: string;
  userName?: string;
  isTyping?: boolean;
  status?: "online" | "offline";
}

export default function Chat() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showCustomChatDialog, setShowCustomChatDialog] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterByRole, setFilterByRole] = useState<string>("all");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: authData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const currentUser = authData?.user;
  const isAppAdmin = currentUser?.roles?.some((role: string) => 
    ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
  ) || false;

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoomWithParticipants[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!currentUser,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const isRoomAdmin = selectedRoom?.participants.find(p => p.staffId === currentUser?.id)?.role === "admin";

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    enabled: !!selectedRoomId,
  });

  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${currentUser.id}&userName=${encodeURIComponent(currentUser.displayName || currentUser.email)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case "message":
        if (data.message) {
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", data.roomId, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
        }
        break;
      case "typing":
        if (data.roomId && data.userId) {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            const roomTyping = newMap.get(data.roomId!) || new Set();
            if (data.isTyping) {
              roomTyping.add(data.userId!);
            } else {
              roomTyping.delete(data.userId!);
            }
            newMap.set(data.roomId!, roomTyping);
            return newMap;
          });
        }
        break;
      case "presence":
        if (data.userId) {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (data.status === "online") {
              newSet.add(data.userId!);
            } else {
              newSet.delete(data.userId!);
            }
            return newSet;
          });
        }
        break;
      case "read":
        queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
        break;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedRoomId && currentUser) {
      apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/read`);
    }
  }, [selectedRoomId, currentUser, messages]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedRoomId) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        roomId: selectedRoomId,
        isTyping
      }));
    }
  }, [selectedRoomId]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    sendTypingIndicator(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const createDirectRoomMutation = useMutation({
    mutationFn: async (data: { targetUserId: string; targetUserName: string; targetUserEmail?: string }) => {
      const response = await apiRequest("POST", "/api/chat/rooms/direct", data);
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoomId(room.id);
      setShowNewChatDialog(false);
      toast({ title: "Chat started" });
    },
    onError: () => {
      toast({ title: "Failed to start chat", variant: "destructive" });
    },
  });

  const createGroupRoomMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; participants: { staffId: string; staffName: string }[] }) => {
      const response = await apiRequest("POST", "/api/chat/rooms/group", data);
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoomId(room.id);
      setShowGroupDialog(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedParticipants([]);
      toast({ title: "Group created" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  const createCustomChatMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string; 
      participants: { staffId: string; staffName: string; staffEmail?: string }[];
      staffFilter?: { roles?: string[] };
      isAnnouncement?: string;
    }) => {
      const response = await apiRequest("POST", "/api/chat/rooms/custom", data);
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoomId(room.id);
      setShowCustomChatDialog(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedParticipants([]);
      setSelectedRoles([]);
      setIsAnnouncement(false);
      toast({ title: "Chat created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create chat", variant: "destructive" });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string }) => {
      const response = await apiRequest("PATCH", `/api/chat/rooms/${selectedRoomId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ title: "Chat updated" });
    },
    onError: () => {
      toast({ title: "Failed to update chat", variant: "destructive" });
    },
  });

  const updateParticipantRoleMutation = useMutation({
    mutationFn: async ({ staffId, role }: { staffId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/chat/rooms/${selectedRoomId}/participants/${staffId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ title: "Role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const archiveRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/archive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoomId(null);
      setShowRoomSettings(false);
      toast({ title: "Chat archived" });
    },
    onError: () => {
      toast({ title: "Failed to archive chat", variant: "destructive" });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (data: { staffId: string; staffName: string; staffEmail?: string }) => {
      const response = await apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/participants`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ title: "Member added" });
    },
    onError: () => {
      toast({ title: "Failed to add member", variant: "destructive" });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await apiRequest("DELETE", `/api/chat/rooms/${selectedRoomId}/participants/${staffId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ title: "Member removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && selectedRoomId) {
        wsRef.current.send(JSON.stringify({
          type: "message",
          roomId: selectedRoomId,
          content
        }));
        return { success: true };
      } else {
        const response = await apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/messages`, { content });
        return response.json();
      }
    },
    onSuccess: () => {
      setMessageText("");
      sendTypingIndicator(false);
      refetchMessages();
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedRoomId) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoomDisplayName = (room: ChatRoomWithParticipants) => {
    if (room.type === "group" || room.type === "client" || room.type === "announcement") {
      return room.name || "Group Chat";
    }
    const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.id);
    return otherParticipant?.staffName || "Direct Message";
  };

  const getRoomIcon = (room: ChatRoomWithParticipants) => {
    switch (room.type) {
      case "client":
        return <Briefcase className="h-4 w-4" />;
      case "announcement":
        return <Megaphone className="h-4 w-4" />;
      case "group":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoomAvatar = (room: ChatRoomWithParticipants) => {
    if (room.type === "group" || room.type === "announcement") {
      return room.name?.charAt(0).toUpperCase() || "G";
    }
    if (room.type === "client") {
      return room.clientName?.charAt(0).toUpperCase() || "C";
    }
    const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.id);
    return otherParticipant?.staffName?.charAt(0).toUpperCase() || "?";
  };

  const getRoomBgColor = (room: ChatRoomWithParticipants) => {
    switch (room.type) {
      case "client":
        return "bg-blue-500 text-white";
      case "announcement":
        return "bg-amber-500 text-white";
      case "group":
        return "bg-primary text-primary-foreground";
      default:
        return "";
    }
  };

  const formatMessageDate = (date: Date | string) => {
    const d = new Date(date);
    if (isToday(d)) {
      return format(d, "h:mm a");
    } else if (isYesterday(d)) {
      return "Yesterday " + format(d, "h:mm a");
    }
    return format(d, "MMM d, h:mm a");
  };

  const getTypingText = () => {
    if (!selectedRoomId) return null;
    const roomTyping = typingUsers.get(selectedRoomId);
    if (!roomTyping || roomTyping.size === 0) return null;
    
    const typingNames = Array.from(roomTyping)
      .filter(id => id !== currentUser?.id)
      .map(id => {
        const participant = selectedRoom?.participants.find(p => p.staffId === id);
        return participant?.staffName?.split(" ")[0] || "Someone";
      });
    
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
    return `${typingNames.join(", ")} are typing...`;
  };

  // Filter rooms based on active tab and search
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery || getRoomDisplayName(room).toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "client") return room.type === "client" && matchesSearch;
    if (activeTab === "direct") return room.type === "direct" && matchesSearch;
    if (activeTab === "group") return (room.type === "group" || room.type === "announcement") && matchesSearch;
    
    return matchesSearch;
  });

  // Filter staff based on role selection for custom chat
  const getFilteredStaff = () => {
    let filtered = staff.filter(s => s.isActive === "yes" && s.id !== currentUser?.id);
    
    if (filterByRole !== "all") {
      filtered = filtered.filter(s => s.role === filterByRole);
    }
    
    return filtered;
  };

  // Get staff filtered by selected roles for custom chat creation
  const getStaffByRoles = () => {
    if (selectedRoles.length === 0) return [];
    return staff.filter(s => 
      s.isActive === "yes" && 
      s.id !== currentUser?.id &&
      selectedRoles.includes(s.role || "")
    );
  };

  const activeStaff = staff.filter(s => s.isActive === "yes");

  const handleCreateCustomChat = () => {
    if (!groupName.trim()) {
      toast({ title: "Please enter a chat name", variant: "destructive" });
      return;
    }

    // Get participants - either from manual selection or role filter
    let participants: { staffId: string; staffName: string; staffEmail?: string }[] = [];
    
    if (selectedRoles.length > 0) {
      // Add all staff matching selected roles
      const roleStaff = getStaffByRoles();
      participants = roleStaff.map(s => ({
        staffId: s.id,
        staffName: s.name,
        staffEmail: s.email || undefined,
      }));
    } else if (selectedParticipants.length > 0) {
      // Add manually selected participants
      participants = selectedParticipants.map(id => {
        const s = staff.find(st => st.id === id);
        return {
          staffId: id,
          staffName: s?.name || "Unknown",
          staffEmail: s?.email || undefined,
        };
      });
    }

    if (participants.length === 0) {
      toast({ title: "Please select at least one member or role", variant: "destructive" });
      return;
    }

    createCustomChatMutation.mutate({
      name: groupName,
      description: groupDescription || undefined,
      participants,
      staffFilter: selectedRoles.length > 0 ? { roles: selectedRoles } : undefined,
      isAnnouncement: isAnnouncement ? "yes" : "no",
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background" data-testid="chat-page">
      {/* Sidebar */}
      <div className={`${selectedRoomId && isMobileView ? "hidden" : "flex"} w-full md:w-80 lg:w-96 flex-col border-r`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold" data-testid="text-chat-title">Messages</h1>
            <div className="flex items-center gap-2">
              {isAppAdmin && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setShowCustomChatDialog(true)}
                  title="Create Custom Chat"
                  data-testid="button-admin-create-chat"
                >
                  <Shield className="h-5 w-5" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-new-chat">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowNewChatDialog(true)} data-testid="menu-new-direct">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Direct Message
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGroupDialog(true)} data-testid="menu-new-group">
                    <Users className="h-4 w-4 mr-2" />
                    Group Chat
                  </DropdownMenuItem>
                  {isAppAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowCustomChatDialog(true)} data-testid="menu-custom-chat">
                        <Shield className="h-4 w-4 mr-2" />
                        Custom Team Chat
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-chats"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="client" className="text-xs">
                <Briefcase className="h-3 w-3 mr-1" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="direct" className="text-xs">
                <UserIcon className="h-3 w-3 mr-1" />
                Direct
              </TabsTrigger>
              <TabsTrigger value="group" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Teams
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          {roomsLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a new conversation with your team
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowNewChatDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.id);
                const isOnline = room.type === "direct" && otherParticipant && onlineUsers.has(otherParticipant.staffId);
                
                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setIsMobileView(true);
                    }}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover-elevate transition-colors ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    data-testid={`chat-room-${room.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={getRoomBgColor(room)}>
                          {getRoomAvatar(room)}
                        </AvatarFallback>
                      </Avatar>
                      {room.type === "direct" && isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {getRoomIcon(room)}
                          <span className="font-medium truncate">{getRoomDisplayName(room)}</span>
                        </div>
                        {room.lastMessageAt && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {room.lastMessagePreview && (
                        <p className="text-sm text-muted-foreground truncate">
                          {room.lastMessagePreview}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {room.type === "client" && room.clientName && (
                          <Badge variant="secondary" className="text-xs">
                            {room.clientName}
                          </Badge>
                        )}
                        {(room.type === "group" || room.type === "announcement") && (
                          <span className="text-xs text-muted-foreground">
                            {room.participants.length} members
                          </span>
                        )}
                        {room.isAnnouncement === "yes" && (
                          <Badge variant="outline" className="text-xs">
                            <Megaphone className="h-3 w-3 mr-1" />
                            Broadcast
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className={`${!selectedRoomId && isMobileView ? "hidden" : "flex"} flex-1 flex-col md:flex`}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => {
                    setSelectedRoomId(null);
                    setIsMobileView(false);
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={getRoomBgColor(selectedRoom)}>
                    {getRoomAvatar(selectedRoom)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    {getRoomIcon(selectedRoom)}
                    <h2 className="font-semibold">{getRoomDisplayName(selectedRoom)}</h2>
                  </div>
                  {selectedRoom.type === "client" && selectedRoom.clientName && (
                    <p className="text-xs text-muted-foreground">
                      Care Team for {selectedRoom.clientName}
                    </p>
                  )}
                  {(selectedRoom.type === "group" || selectedRoom.type === "announcement") && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRoom.participants.length} members
                    </p>
                  )}
                  {selectedRoom.type === "direct" && (
                    <p className="text-xs text-muted-foreground">
                      {onlineUsers.has(selectedRoom.participants.find(p => p.staffId !== currentUser?.id)?.staffId || "") 
                        ? "Online" 
                        : "Offline"}
                    </p>
                  )}
                </div>
              </div>
              
              {(isRoomAdmin || isAppAdmin) && selectedRoom.type !== "direct" && (
                <Sheet open={showRoomSettings} onOpenChange={setShowRoomSettings}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-room-settings">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Chat Settings</SheetTitle>
                      <SheetDescription>
                        Manage this chat room
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      {/* Room Name */}
                      <div className="space-y-2">
                        <Label>Chat Name</Label>
                        <Input
                          defaultValue={selectedRoom.name || ""}
                          onBlur={(e) => {
                            if (e.target.value !== selectedRoom.name) {
                              updateRoomMutation.mutate({ name: e.target.value });
                            }
                          }}
                          data-testid="input-edit-room-name"
                        />
                      </div>

                      {/* Members */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Members ({selectedRoom.participants.length})</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64">
                              <ScrollArea className="h-48">
                                {activeStaff
                                  .filter(s => !selectedRoom.participants.find(p => p.staffId === s.id))
                                  .map(s => (
                                    <DropdownMenuItem
                                      key={s.id}
                                      onClick={() => addParticipantMutation.mutate({
                                        staffId: s.id,
                                        staffName: s.name,
                                        staffEmail: s.email || undefined,
                                      })}
                                    >
                                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {s.name}
                                    </DropdownMenuItem>
                                  ))}
                              </ScrollArea>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <ScrollArea className="h-48 border rounded-md">
                          {selectedRoom.participants.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{p.staffName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{p.staffName}</p>
                                  {p.role === "admin" && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {p.staffId !== currentUser?.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {/* Only app admins can change participant roles */}
                                    {isAppAdmin && (
                                      <>
                                        {p.role === "member" ? (
                                          <DropdownMenuItem
                                            onClick={() => updateParticipantRoleMutation.mutate({
                                              staffId: p.staffId,
                                              role: "admin"
                                            })}
                                          >
                                            <Crown className="h-4 w-4 mr-2" />
                                            Make Admin
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            onClick={() => updateParticipantRoleMutation.mutate({
                                              staffId: p.staffId,
                                              role: "member"
                                            })}
                                          >
                                            <UserIcon className="h-4 w-4 mr-2" />
                                            Remove Admin
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => removeParticipantMutation.mutate(p.staffId)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Remove from Chat
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>

                      {/* Archive */}
                      <Separator />
                      <Button
                        variant="outline"
                        className="w-full text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to archive this chat?")) {
                            archiveRoomMutation.mutate();
                          }
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Chat
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-2">No messages yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...messages].reverse().map((message, index, arr) => {
                    const isOwn = message.senderId === currentUser?.id;
                    const showAvatar = index === 0 || arr[index - 1]?.senderId !== message.senderId;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        data-testid={`message-${message.id}`}
                      >
                        {!isOwn && showAvatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {message.senderName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : !isOwn ? (
                          <div className="w-8" />
                        ) : null}
                        
                        <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && showAvatar && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {message.senderName}
                            </p>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageDate(message.createdAt)}
                            </span>
                            {message.isEdited === "yes" && (
                              <span className="text-xs text-muted-foreground">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
              
              {getTypingText() && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <div className="flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                  </div>
                  <span>{getTypingText()}</span>
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
              <p className="text-muted-foreground mb-4">
                Choose a chat from the list or start a new one
              </p>
              <Button onClick={() => setShowNewChatDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Direct Message Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Start a conversation with a team member
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {activeStaff
                .filter(s => s.id !== currentUser?.id)
                .map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      createDirectRoomMutation.mutate({
                        targetUserId: member.id,
                        targetUserName: member.name,
                        targetUserEmail: member.email || undefined,
                      });
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer"
                    data-testid={`staff-option-${member.id}`}
                  >
                    <Avatar>
                      <AvatarFallback>{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Create a group chat with multiple team members
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                data-testid="input-group-name"
              />
            </div>
            
            <div>
              <Label>Select Members</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {activeStaff
                  .filter(s => s.id !== currentUser?.id)
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2"
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(member.id)}
                        onCheckedChange={(checked) => {
                          setSelectedParticipants(prev =>
                            checked
                              ? [...prev, member.id]
                              : prev.filter(id => id !== member.id)
                          );
                        }}
                        data-testid={`checkbox-member-${member.id}`}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{member.name}</span>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!groupName.trim()) {
                  toast({ title: "Please enter a group name", variant: "destructive" });
                  return;
                }
                if (selectedParticipants.length === 0) {
                  toast({ title: "Please select at least one member", variant: "destructive" });
                  return;
                }
                createGroupRoomMutation.mutate({
                  name: groupName,
                  participants: selectedParticipants.map(id => {
                    const s = staff.find(st => st.id === id);
                    return { staffId: id, staffName: s?.name || "Unknown" };
                  }),
                });
              }}
              disabled={createGroupRoomMutation.isPending}
              data-testid="button-create-group"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Team Chat Dialog (Admin Only) */}
      <Dialog open={showCustomChatDialog} onOpenChange={(open) => {
        setShowCustomChatDialog(open);
        if (!open) {
          setGroupName("");
          setGroupDescription("");
          setSelectedParticipants([]);
          setSelectedRoles([]);
          setIsAnnouncement(false);
          setFilterByRole("all");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Create Custom Team Chat
            </DialogTitle>
            <DialogDescription>
              Create a chat for specific teams, roles, or skill groups. 
              For example: Leadership Team, Nurses, Clinical Staff, etc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chat Name *</Label>
                <Input
                  placeholder="e.g., Leadership Team, Nurses Chat"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  data-testid="input-custom-chat-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="Brief description of this chat"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              <Checkbox
                checked={isAnnouncement}
                onCheckedChange={(checked) => setIsAnnouncement(checked as boolean)}
                data-testid="checkbox-announcement"
              />
              <div>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Megaphone className="h-4 w-4" />
                  Announcement Channel
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only admins can send messages. Use for important broadcasts.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Add Members by Role
              </Label>
              <p className="text-sm text-muted-foreground">
                Select roles to automatically add all staff with those roles
              </p>
              <div className="flex flex-wrap gap-2">
                {USER_ROLES.map((role) => (
                  <Badge
                    key={role.value}
                    variant={selectedRoles.includes(role.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedRoles(prev =>
                        prev.includes(role.value)
                          ? prev.filter(r => r !== role.value)
                          : [...prev, role.value]
                      );
                    }}
                    data-testid={`badge-role-${role.value}`}
                  >
                    {selectedRoles.includes(role.value) && <Check className="h-3 w-3 mr-1" />}
                    {role.label}
                  </Badge>
                ))}
              </div>
              {selectedRoles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {getStaffByRoles().length} staff members will be added
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Or Select Individual Staff</Label>
                <Select value={filterByRole} onValueChange={setFilterByRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {getFilteredStaff().map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2"
                  >
                    <Checkbox
                      checked={selectedParticipants.includes(member.id)}
                      onCheckedChange={(checked) => {
                        setSelectedParticipants(prev =>
                          checked
                            ? [...prev, member.id]
                            : prev.filter(id => id !== member.id)
                        );
                      }}
                      data-testid={`checkbox-custom-member-${member.id}`}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="font-medium">{member.name}</span>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
              {selectedParticipants.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedParticipants.length} individual staff selected
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomChatDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomChat}
              disabled={createCustomChatMutation.isPending}
              data-testid="button-create-custom-chat"
            >
              <Shield className="h-4 w-4 mr-2" />
              Create Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
