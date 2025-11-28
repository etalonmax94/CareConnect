import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatRoom, ChatMessage, ChatRoomParticipant, Staff } from "@shared/schema";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  User,
  MoreVertical,
  Phone,
  Video,
  Settings,
  ArrowLeft,
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  X,
  Hash,
  Circle,
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
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [isMobileView, setIsMobileView] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: currentUser } = useQuery<{ user: { id: string; displayName: string; email: string } }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoomWithParticipants[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!currentUser?.user,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    enabled: !!selectedRoomId,
  });

  useEffect(() => {
    if (!currentUser?.user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${currentUser.user.id}&userName=${encodeURIComponent(currentUser.user.displayName || currentUser.user.email)}`;
    
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
  }, [currentUser?.user]);

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
    if (selectedRoomId && currentUser?.user) {
      apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/read`);
    }
  }, [selectedRoomId, currentUser?.user, messages]);

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
    mutationFn: async (data: { name: string; participants: { staffId: string; staffName: string }[] }) => {
      const response = await apiRequest("POST", "/api/chat/rooms/group", data);
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoomId(room.id);
      setShowGroupDialog(false);
      setGroupName("");
      setSelectedParticipants([]);
      toast({ title: "Group created" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
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
    if (room.type === "group" || room.type === "client") {
      return room.name || "Group Chat";
    }
    const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.user?.id);
    return otherParticipant?.staffName || "Direct Message";
  };

  const getRoomAvatar = (room: ChatRoomWithParticipants) => {
    if (room.type === "group") {
      return room.name?.charAt(0).toUpperCase() || "G";
    }
    const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.user?.id);
    return otherParticipant?.staffName?.charAt(0).toUpperCase() || "?";
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
      .filter(id => id !== currentUser?.user?.id)
      .map(id => {
        const participant = selectedRoom?.participants.find(p => p.staffId === id);
        return participant?.staffName?.split(" ")[0] || "Someone";
      });
    
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
    return `${typingNames.join(", ")} are typing...`;
  };

  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    const name = getRoomDisplayName(room).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const activeStaff = staff.filter(s => s.isActive === "yes");

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background" data-testid="chat-page">
      <div className={`${selectedRoomId && isMobileView ? "hidden" : "flex"} w-full md:w-80 lg:w-96 flex-col border-r`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold" data-testid="text-chat-title">Messages</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-new-chat">
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowNewChatDialog(true)} data-testid="menu-new-direct">
                  <User className="h-4 w-4 mr-2" />
                  New Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowGroupDialog(true)} data-testid="menu-new-group">
                  <Users className="h-4 w-4 mr-2" />
                  New Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-chats"
            />
          </div>
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
                const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.user?.id);
                const isOnline = otherParticipant && onlineUsers.has(otherParticipant.staffId);
                
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
                        <AvatarFallback className={room.type === "group" ? "bg-primary text-primary-foreground" : ""}>
                          {getRoomAvatar(room)}
                        </AvatarFallback>
                      </Avatar>
                      {room.type === "direct" && isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{getRoomDisplayName(room)}</span>
                        {room.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {room.lastMessagePreview && (
                        <p className="text-sm text-muted-foreground truncate">
                          {room.lastMessagePreview}
                        </p>
                      )}
                      {room.type === "group" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Users className="h-3 w-3" />
                          <span>{room.participants.length} members</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className={`${!selectedRoomId && isMobileView ? "hidden" : "flex"} flex-1 flex-col md:flex`}>
        {selectedRoom ? (
          <>
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
                  <AvatarFallback className={selectedRoom.type === "group" ? "bg-primary text-primary-foreground" : ""}>
                    {getRoomAvatar(selectedRoom)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{getRoomDisplayName(selectedRoom)}</h2>
                  {selectedRoom.type === "group" && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRoom.participants.length} members
                    </p>
                  )}
                  {selectedRoom.type === "direct" && (
                    <p className="text-xs text-muted-foreground">
                      {onlineUsers.has(selectedRoom.participants.find(p => p.staffId !== currentUser?.user?.id)?.staffId || "") 
                        ? "Online" 
                        : "Offline"}
                    </p>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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
                    const isOwn = message.senderId === currentUser?.user?.id;
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
                .filter(s => s.id !== currentUser?.user?.id)
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
                  .filter(s => s.id !== currentUser?.user?.id)
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
                      <span>{member.name}</span>
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
    </div>
  );
}
