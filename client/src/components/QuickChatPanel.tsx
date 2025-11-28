import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageSquare,
  Send,
  X,
  ArrowLeft,
  Users,
  User as UserIcon,
  Briefcase,
  Megaphone,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatRoom, ChatMessage, User, Staff } from "@shared/schema";

interface ChatRoomWithParticipants extends Omit<ChatRoom, 'clientName' | 'lastMessageAt' | 'lastMessagePreview'> {
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
}

interface QuickChatPanelProps {
  userId: string;
  userName: string;
}

export default function QuickChatPanel({ userId, userName }: QuickChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoomWithParticipants[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: isOpen,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    enabled: !!selectedRoomId && isOpen,
    refetchInterval: isOpen && selectedRoomId ? 3000 : false,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, roomId }: { content: string; roomId: string }) => {
      const response = await apiRequest("POST", `/api/chat/rooms/${roomId}/messages`, {
        content,
        messageType: "text",
      });
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
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
      case "direct": return <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />;
      case "group": return <Users className="h-3.5 w-3.5 text-muted-foreground" />;
      case "client": return <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />;
      case "announcement": return <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRoomAvatar = (room: ChatRoomWithParticipants) => {
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
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
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[440px] p-0 flex flex-col"
        data-testid="quick-chat-panel"
      >
        {!selectedRoomId ? (
          <>
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
              {roomsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="py-2">
                  {rooms.slice(0, 20).map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      data-testid={`quick-chat-room-${room.id}`}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-muted text-sm">
                          {getRoomAvatar(room)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
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
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRoomId(null)}
                data-testid="button-quick-chat-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-sm">
                  {selectedRoom ? getRoomAvatar(selectedRoom) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {selectedRoom ? getRoomDisplayName(selectedRoom) : "Chat"}
                </h3>
                {selectedRoom && (selectedRoom.type === "group" || selectedRoom.type === "announcement") && (
                  <p className="text-xs text-muted-foreground">
                    {selectedRoom.participants.length} members
                  </p>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...messages].reverse().map((message) => {
                    const isOwn = message.senderId === userId;
                    const isDeleted = message.deletedAt !== null;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] ${isOwn ? "text-right" : "text-left"}`}>
                          {!isOwn && (
                            <p className="text-[10px] text-muted-foreground mb-1">
                              {message.senderName}
                            </p>
                          )}
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm ${
                              isDeleted
                                ? "bg-muted/30 text-muted-foreground italic"
                                : isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                            }`}
                          >
                            {isDeleted ? (
                              <p className="text-xs">Deleted</p>
                            ) : (message as any).attachmentUrl && (message as any).messageType === "gif" ? (
                              <img 
                                src={(message as any).attachmentUrl} 
                                alt="GIF"
                                className="max-w-[200px] max-h-[150px] rounded-lg"
                                loading="lazy"
                              />
                            ) : (message as any).attachmentUrl && (message as any).messageType === "image" ? (
                              <img 
                                src={(message as any).attachmentUrl} 
                                alt="Image"
                                className="max-w-[200px] max-h-[200px] rounded-lg"
                                loading="lazy"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
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

            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-muted/40 border-0 rounded-full"
                  data-testid="input-quick-message"
                />
                <Button
                  size="icon"
                  className="rounded-full shrink-0"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  data-testid="button-quick-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
