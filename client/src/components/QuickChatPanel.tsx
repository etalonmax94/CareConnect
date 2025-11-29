import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Users,
  User as UserIcon,
  Briefcase,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { ChatRoom, ChatMessage, Staff } from "@shared/schema";

interface ChatRoomWithParticipants extends Omit<ChatRoom, 'clientName' | 'lastMessageAt' | 'lastMessagePreview' | 'clientId' | 'avatarUrl'> {
  participants: Array<{
    id: string;
    staffId: string;
    staffName: string;
    role: string;
    joinedAt: Date | null;
  }>;
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | null;
  clientName?: string | null;
  unreadCount?: number;
  avatarUrl?: string | null;
  clientId?: string | null;
}

interface QuickChatPanelProps {
  userId: string;
  userName: string;
}

interface WebSocketMessage {
  type: "message" | "typing" | "presence" | "read";
  roomId?: string;
  userId?: string;
  message?: any;
  isTyping?: boolean;
  status?: "online" | "offline";
}

export default function QuickChatPanel({ userId, userName }: QuickChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
      case "read":
        queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
        break;
    }
  }, []);

  useEffect(() => {
    if (!userId || !isOpen) {
      setTypingUsers(new Map());
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${userId}&userName=${encodeURIComponent(userName)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("QuickChat WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error("QuickChat WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("QuickChat WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [userId, userName, isOpen, handleWebSocketMessage]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedRoomId) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        roomId: selectedRoomId,
        userId: userId,
        isTyping
      }));
    }
  }, [selectedRoomId, userId]);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoomWithParticipants[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: isOpen,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    enabled: !!selectedRoomId && isOpen,
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, roomId }: { content: string; roomId: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "message",
          roomId,
          content,
          messageType: "text",
        }));
        return { success: true };
      } else {
        const response = await apiRequest("POST", `/api/chat/rooms/${roomId}/messages`, {
          content,
          messageType: "text",
        });
        return response.json();
      }
    },
    onSuccess: () => {
      setMessageText("");
      sendTypingIndicator(false);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoomId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send",
        description: error.message || "Could not send message",
        variant: "destructive",
      });
    },
  });

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

  const getTypingText = () => {
    if (!selectedRoomId) return null;
    const roomTyping = typingUsers.get(selectedRoomId);
    if (!roomTyping || roomTyping.size === 0) return null;
    
    const typingNames = Array.from(roomTyping)
      .filter(id => id !== userId)
      .map(id => {
        const participant = selectedRoom?.participants.find(p => p.staffId === id);
        return participant?.staffName?.split(" ")[0] || "Someone";
      });
    
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
    return `${typingNames.join(", ")} are typing...`;
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedRoomId) return;
    sendMessageMutation.mutate({ content: messageText.trim(), roomId: selectedRoomId });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoomDisplayName = (room: ChatRoomWithParticipants) => {
    if (room.name) return room.name;
    if (room.type === "direct") {
      const otherParticipant = room.participants.find(p => p.staffId !== userId);
      return otherParticipant?.staffName || "Direct Message";
    }
    return room.type === "client" ? `Client: ${room.clientName || "Unknown"}` : "Group Chat";
  };

  const getRoomIcon = (room: ChatRoomWithParticipants) => {
    switch (room.type) {
      case "direct": return <UserIcon className="h-3 w-3 text-muted-foreground" />;
      case "group": return <Users className="h-3 w-3 text-muted-foreground" />;
      case "client": return <Briefcase className="h-3 w-3 text-muted-foreground" />;
      case "announcement": return <Megaphone className="h-3 w-3 text-muted-foreground" />;
      default: return <MessageSquare className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getRoomAvatarUrl = (room: ChatRoomWithParticipants) => {
    if (room.avatarUrl) return room.avatarUrl;
    if (room.type === "client" && room.clientId) {
      const client = clients.find(c => c.id === room.clientId);
      if (client?.profilePhotoUrl) return client.profilePhotoUrl;
    }
    return null;
  };

  const getRoomAvatarFallback = (room: ChatRoomWithParticipants) => {
    if (room.type === "direct") {
      const otherParticipant = room.participants.find(p => p.staffId !== userId);
      return otherParticipant?.staffName?.charAt(0).toUpperCase() || "?";
    }
    return room.name?.charAt(0).toUpperCase() || "C";
  };

  const unreadCount = rooms.reduce((count, room) => {
    return count + (room.unreadCount || 0);
  }, 0);

  const formatMessageDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday ? format(d, "h:mm a") : format(d, "MMM d, h:mm a");
  };

  const handleOpenFullChat = () => {
    setIsOpen(false);
    if (selectedRoomId) {
      setLocation(`/chat?room=${selectedRoomId}`);
    } else {
      setLocation("/chat");
    }
  };

  const handleBackToRooms = () => {
    setSelectedRoomId(null);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setSelectedRoomId(null);
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hidden md:flex"
          data-testid="button-quick-chat"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
              data-testid="badge-unread-messages"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {!selectedRoomId ? (
          <>
            <DropdownMenuLabel className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-0" />
            
            {roomsLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                {rooms.slice(0, 15).map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover-elevate transition-colors"
                    data-testid={`quick-chat-room-${room.id}`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={getRoomAvatarUrl(room) || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {getRoomAvatarFallback(room)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          {getRoomIcon(room)}
                          <span className="font-medium text-sm truncate">
                            {getRoomDisplayName(room)}
                          </span>
                        </div>
                        {room.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {room.lastMessagePreview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {room.lastMessagePreview}
                        </p>
                      )}
                    </div>
                    {(room.unreadCount || 0) > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 text-[10px] rounded-full shrink-0">
                        {room.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </ScrollArea>
            )}
            
            <DropdownMenuSeparator className="my-0" />
            <div 
              className="flex items-center justify-center gap-1 py-2.5 text-sm text-primary cursor-pointer hover-elevate"
              onClick={handleOpenFullChat}
              data-testid="link-open-full-chat"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open Full Chat</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 border-b">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleBackToRooms}
                data-testid="button-quick-chat-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-7 w-7">
                <AvatarImage src={selectedRoom ? getRoomAvatarUrl(selectedRoom) || undefined : undefined} />
                <AvatarFallback className="bg-muted text-xs">
                  {selectedRoom ? getRoomAvatarFallback(selectedRoom) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {selectedRoom ? getRoomDisplayName(selectedRoom) : "Chat"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleOpenFullChat}
                data-testid="button-open-full-chat"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>

            <ScrollArea className="h-[240px] p-3">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...messages].reverse().slice(-20).map((message) => {
                    const isOwn = message.senderId === userId;
                    const isDeleted = message.deletedAt !== null;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] ${isOwn ? "text-right" : "text-left"}`}>
                          {!isOwn && (
                            <p className="text-[9px] text-muted-foreground mb-0.5 px-1">
                              {message.senderName?.split(" ")[0]}
                            </p>
                          )}
                          <div
                            className={`rounded-xl px-2.5 py-1.5 text-xs ${
                              isDeleted
                                ? "bg-muted/30 text-muted-foreground italic"
                                : isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                            }`}
                          >
                            {isDeleted ? (
                              <p className="text-[10px]">Deleted</p>
                            ) : (message as any).attachmentUrl && (message as any).messageType === "gif" ? (
                              <img 
                                src={(message as any).attachmentUrl} 
                                alt="GIF"
                                className="max-w-[120px] max-h-[100px] rounded"
                                loading="lazy"
                              />
                            ) : (message as any).attachmentUrl && (message as any).messageType === "image" ? (
                              <img 
                                src={(message as any).attachmentUrl} 
                                alt="Image"
                                className="max-w-[120px] max-h-[100px] rounded"
                                loading="lazy"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                          </div>
                          <p className="text-[8px] text-muted-foreground mt-0.5 px-1">
                            {formatMessageDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-2 border-t">
              {getTypingText() && (
                <p className="text-[10px] text-muted-foreground mb-1.5 px-1 animate-pulse">
                  {getTypingText()}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyPress}
                  className="flex-1 h-8 text-xs bg-muted/40 border-0 rounded-full px-3"
                  data-testid="input-quick-message"
                />
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full shrink-0"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-quick-send"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
