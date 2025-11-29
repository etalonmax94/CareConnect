import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { ChatRoom, ChatMessage, ChatRoomParticipant, Staff, UserRole, User, ChatMessageReaction, ChatMessageRead } from "@shared/schema";
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
  Reply,
  Forward,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  Play,
  Download,
  Lock,
  Unlock,
  ArchiveRestore,
  Pin,
  PinOff,
  Bell,
  BellOff,
  ChevronRight,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Diamond,
  PartyPopper,
  Eye,
  FileText,
  FolderOpen,
  Mic,
  Square,
  Pause,
  Clock,
  Calendar,
  FileCode,
  BookTemplate,
  CheckCheck,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  mp4Url?: string;
  width: number;
  height: number;
  size?: number;
}

interface GifSearchResult {
  results: GiphyGif[];
  next?: string;
}

interface ChatAttachment {
  id: string;
  messageId: string;
  type: "image" | "video" | "gif" | "document";
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  thumbnailKey?: string;
  width?: number;
  height?: number;
  duration?: number;
  gifUrl?: string;
}

interface WebSocketMessage {
  type: "message" | "typing" | "read" | "presence" | "join" | "leave" | "error" | "pinUpdate";
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
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterByRole, setFilterByRole] = useState<string>("all");
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [selectedForwardRooms, setSelectedForwardRooms] = useState<string[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [activeMentions, setActiveMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(0);
  const [manageMembersRoomId, setManageMembersRoomId] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberStaffId, setNewMemberStaffId] = useState<string>("");
  const [messageReactions, setMessageReactions] = useState<Record<string, ChatMessageReaction[]>>({});
  const [messageReads, setMessageReads] = useState<Record<string, ChatMessageRead[]>>({});
  const [messageDeliveries, setMessageDeliveries] = useState<Record<string, Array<{ staffId: string; staffName: string; deliveredAt: string }>>>({});
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<"settings" | "media">("settings");
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Message scheduling state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleContent, setScheduleContent] = useState("");
  
  // Advanced message search state (with filters)
  const [showAdvancedSearchDialog, setShowAdvancedSearchDialog] = useState(false);
  const [advancedSearchQuery, setAdvancedSearchQuery] = useState("");
  const [searchSender, setSearchSender] = useState<string>("all");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchMediaType, setSearchMediaType] = useState<string>("all");
  const [advancedSearchResults, setAdvancedSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Chat templates state
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; content: string }>>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load chat templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem("chat_templates");
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch {
        setTemplates([]);
      }
    }
  }, []);

  const { data: authData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const currentUser = authData?.user;
  const isAppAdmin = currentUser?.roles?.some((role: string) => 
    ["admin", "director", "operations_manager", "clinical_manager", "developer"].includes(role.toLowerCase())
  ) || false;

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoomWithParticipants[]>({
    queryKey: ["/api/chat/rooms"],
    enabled: !!currentUser,
  });

  // Fetch archived rooms (admin only)
  const { data: archivedRooms = [] } = useQuery<ChatRoomWithParticipants[]>({
    queryKey: ["/api/chat/rooms/archived"],
    enabled: !!currentUser && isAppAdmin,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch clients to get their photos for client chats
  const { data: clients = [] } = useQuery<{ id: string; photo?: string | null }[]>({
    queryKey: ["/api/clients"],
    select: (data: any[]) => data.map(c => ({ id: c.id, photo: c.photo })),
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const isRoomAdmin = selectedRoom?.participants.find(p => p.staffId === currentUser?.id)?.role === "admin";

  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "messages"],
    enabled: !!selectedRoomId,
  });

  const { data: gifSearchResults = { results: [] }, isFetching: gifSearchLoading } = useQuery<GifSearchResult>({
    queryKey: ["/api/chat/gifs/search", gifSearchQuery],
    enabled: showGifPicker && !!selectedRoomId && gifSearchQuery.length >= 2,
    staleTime: 60000,
  });

  const { data: trendingGifs = { results: [] } } = useQuery<GifSearchResult>({
    queryKey: ["/api/chat/gifs/trending"],
    enabled: showGifPicker && !!selectedRoomId && gifSearchQuery.length < 2,
    staleTime: 60000,
  });

  const displayedGifs = gifSearchQuery.length >= 2 ? gifSearchResults.results : trendingGifs.results;

  // Fetch media for room gallery (photos and documents only)
  interface RoomMediaItem {
    id: string;
    messageId: string;
    type: "image" | "video" | "file";
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    thumbnailKey?: string;
    width?: number;
    height?: number;
    expiresAt?: Date;
    createdAt: Date;
    senderName: string;
  }
  
  const { data: roomMedia = [], isLoading: mediaLoading } = useQuery<RoomMediaItem[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "media"],
    enabled: !!selectedRoomId && showRoomSettings && settingsTab === "media",
  });

  // Fetch reactions for all displayed messages
  useEffect(() => {
    if (messages.length === 0) return;
    const messageIds = messages.map(m => m.id);
    apiRequest("POST", "/api/chat/messages/batch/reactions", { messageIds })
      .then(res => res.json())
      .then((reactions: Record<string, ChatMessageReaction[]>) => {
        setMessageReactions(reactions);
      }).catch(console.error);
  }, [messages]);

  // Fetch deliveries for all displayed messages
  useEffect(() => {
    if (messages.length === 0) return;
    const messageIds = messages.map(m => m.id);
    apiRequest("POST", "/api/chat/messages/batch/deliveries", { messageIds })
      .then(res => res.json())
      .then((deliveries: Record<string, Array<{ staffId: string; staffName: string; deliveredAt: string }>>) => {
        setMessageDeliveries(deliveries);
      }).catch(console.error);
  }, [messages]);

  // Mark messages as delivered when viewing
  useEffect(() => {
    if (messages.length === 0 || !selectedRoomId || !currentUser) return;
    
    // Filter out own messages and get IDs of messages to mark as delivered
    const otherUsersMessages = messages
      .filter(m => m.senderId !== currentUser.id)
      .map(m => m.id);
    
    if (otherUsersMessages.length === 0) return;

    // Mark as delivered
    apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/messages/deliver`, { 
      messageIds: otherUsersMessages 
    }).catch(console.error);
  }, [messages, selectedRoomId, currentUser]);

  // Add/remove reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await apiRequest("POST", `/api/chat/messages/${messageId}/reactions`, { emoji });
      return await res.json();
    },
    onSuccess: () => {
      // Refetch reactions
      if (messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        apiRequest("POST", "/api/chat/messages/batch/reactions", { messageIds })
          .then(res => res.json())
          .then((reactions: Record<string, ChatMessageReaction[]>) => {
            setMessageReactions(reactions);
          });
      }
    }
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await apiRequest("DELETE", `/api/chat/messages/${messageId}/reactions/${emoji}`);
      return await res.json();
    },
    onSuccess: () => {
      if (messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        apiRequest("POST", "/api/chat/messages/batch/reactions", { messageIds })
          .then(res => res.json())
          .then((reactions: Record<string, ChatMessageReaction[]>) => {
            setMessageReactions(reactions);
          });
      }
    }
  });

  // Toggle reaction (add if not exists, remove if exists)
  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    const existingReactions = messageReactions[messageId] || [];
    const userReaction = existingReactions.find(r => r.staffId === currentUser?.id && r.emoji === emoji);
    
    if (userReaction) {
      removeReactionMutation.mutate({ messageId, emoji });
    } else {
      addReactionMutation.mutate({ messageId, emoji });
    }
  }, [messageReactions, currentUser?.id, addReactionMutation, removeReactionMutation]);

  // Fetch read receipts for all displayed messages (batch) when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    const ownMessageIds = messages
      .filter(m => m.senderId === currentUser?.id && !m.isDeleted)
      .map(m => m.id);
    if (ownMessageIds.length === 0) return;
    
    apiRequest("POST", "/api/chat/messages/batch/reads", { messageIds: ownMessageIds })
      .then(res => res.json())
      .then((reads: Record<string, ChatMessageRead[]>) => {
        setMessageReads(reads);
      }).catch(console.error);
  }, [messages, currentUser?.id]);

  // Fetch read receipts for a message on hover (fallback for non-batched)
  const fetchMessageReads = useCallback(async (messageId: string) => {
    if (messageReads[messageId]) return; // Already fetched
    try {
      const res = await apiRequest("GET", `/api/chat/messages/${messageId}/reads`);
      const reads = await res.json() as ChatMessageRead[];
      setMessageReads(prev => ({ ...prev, [messageId]: reads }));
    } catch (error) {
      console.error("Failed to fetch read receipts:", error);
    }
  }, [messageReads]);
  
  useEffect(() => {
    setShowGifPicker(false);
    setGifSearchQuery("");
    setMessageSearchQuery("");
    setCurrentSearchResultIndex(0);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${currentUser.id}&userName=${encodeURIComponent(currentUser.displayName || currentUser.email)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Mark the current user as online immediately
      if (currentUser?.id) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(currentUser.id);
          return newSet;
        });
      }
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
      case "pinUpdate":
        // Refresh messages when pin state changes
        if (data.roomId) {
          queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", data.roomId, "messages"] });
        }
        break;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track which messages have been marked as read to avoid redundant API calls
  const markedAsReadRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (selectedRoomId && currentUser && messages.length > 0) {
      // Mark room as read (updates lastReadAt for participant)
      apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/read`);
      
      // Mark individual messages as read for read receipts
      // Only mark messages from other users that haven't been marked yet
      const messagesToMark = messages
        .filter(m => 
          m.senderId !== currentUser.id && 
          !m.isDeleted && 
          !markedAsReadRef.current.has(m.id)
        )
        .map(m => m.id);
      
      if (messagesToMark.length > 0) {
        apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/messages/read`, { messageIds: messagesToMark })
          .then(() => {
            // Track successfully marked messages
            messagesToMark.forEach(id => markedAsReadRef.current.add(id));
          })
          .catch(err => console.error("Failed to mark messages as read:", err));
      }
    }
  }, [selectedRoomId, currentUser, messages]);
  
  // Reset marked-as-read tracking when room changes
  useEffect(() => {
    markedAsReadRef.current = new Set();
  }, [selectedRoomId]);

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
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setMessageText(value);
    
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
      setShowMentionPopover(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionPopover(false);
      setMentionQuery("");
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    sendTypingIndicator(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const getFilteredMentionStaff = (): Array<{ id: string; name: string; role?: string; isAllMention?: boolean }> => {
    if (!selectedRoom) return [];
    
    const participantIds = selectedRoom.participants.map(p => p.staffId);
    const filteredStaff = staff
      .filter(s => 
        participantIds.includes(s.id) && 
        s.id !== currentUser?.id &&
        s.name?.toLowerCase().includes(mentionQuery)
      )
      .slice(0, 5)
      .map(s => ({ id: s.id, name: s.name, role: s.role || undefined }));
    
    // Add @all option for group chats (more than 2 participants)
    const isGroupChat = selectedRoom.type === "group" || selectedRoom.participants.length > 2;
    if (isGroupChat && "all".includes(mentionQuery)) {
      return [
        { id: "all", name: "all", role: "Notify everyone", isAllMention: true },
        ...filteredStaff
      ];
    }
    
    return filteredStaff;
  };

  // Get messages that match search query
  const searchResults = messageSearchQuery.trim().length > 0
    ? messages
        .map((msg, idx) => ({
          message: msg,
          index: idx,
          matches: msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()) || false
        }))
        .filter(item => item.matches)
    : [];

  // Auto-scroll to current search result
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchResultIndex >= 0) {
      const currentMessageId = searchResults[currentSearchResultIndex]?.message.id;
      if (currentMessageId) {
        setTimeout(() => {
          const element = document.querySelector(`[data-testid="message-${currentMessageId}"]`);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [currentSearchResultIndex, searchResults]);

  // Get color for sender name based on hash of sender ID
  const getSenderNameColor = (senderId: string): string => {
    // Vibrant, diverse color palette (avoiding yellow tones)
    const colors = [
      "text-blue-600 dark:text-blue-400",           // Blue
      "text-purple-600 dark:text-purple-400",       // Purple
      "text-pink-600 dark:text-pink-400",           // Pink
      "text-indigo-600 dark:text-indigo-400",       // Indigo
      "text-rose-600 dark:text-rose-400",           // Rose
      "text-cyan-600 dark:text-cyan-400",           // Cyan
      "text-teal-600 dark:text-teal-400",           // Teal
      "text-emerald-600 dark:text-emerald-400",     // Emerald
      "text-green-600 dark:text-green-400",         // Green
      "text-violet-600 dark:text-violet-400",       // Violet
      "text-fuchsia-600 dark:text-fuchsia-400",     // Fuchsia
      "text-red-600 dark:text-red-400",             // Red
      "text-sky-600 dark:text-sky-400",             // Sky Blue
      "text-lime-600 dark:text-lime-400",           // Lime
    ];

    let hash = 0;
    for (let i = 0; i < senderId.length; i++) {
      hash = ((hash << 5) - hash) + senderId.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleMentionSelect = (selectedStaff: { id: string; name: string; isAllMention?: boolean }) => {
    const textBeforeMention = messageText.slice(0, mentionCursorPos).replace(/@\w*$/, "");
    const textAfterMention = messageText.slice(mentionCursorPos);
    const newText = `${textBeforeMention}@${selectedStaff.name} ${textAfterMention}`;
    
    setMessageText(newText);
    
    if (selectedStaff.isAllMention) {
      // For @all, add all participants except current user to mentions
      const allParticipants = selectedRoom?.participants
        .filter(p => p.staffId !== currentUser?.id)
        .map(p => ({ id: p.staffId, name: p.staffName })) || [];
      setActiveMentions(prev => {
        const newMentions = [...prev];
        allParticipants.forEach(participant => {
          if (!newMentions.find(m => m.id === participant.id)) {
            newMentions.push(participant);
          }
        });
        return newMentions;
      });
    } else {
      setActiveMentions(prev => {
        if (prev.find(m => m.id === selectedStaff.id)) return prev;
        return [...prev, { id: selectedStaff.id, name: selectedStaff.name }];
      });
    }
    
    setShowMentionPopover(false);
    setMentionQuery("");
    messageInputRef.current?.focus();
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentionPopover) return;
    
    const filteredStaff = getFilteredMentionStaff();
    if (filteredStaff.length === 0) return;
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredStaff.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredStaff.length - 1
        );
        break;
      case "Enter":
        if (showMentionPopover && filteredStaff[selectedMentionIndex]) {
          e.preventDefault();
          handleMentionSelect(filteredStaff[selectedMentionIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowMentionPopover(false);
        break;
    }
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
    mutationFn: async (data: { content: string; replyToId?: string; replyToSenderId?: string; replyToSenderName?: string; replyToPreview?: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && selectedRoomId) {
        wsRef.current.send(JSON.stringify({
          type: "message",
          roomId: selectedRoomId,
          ...data
        }));
        return { success: true };
      } else {
        const response = await apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/messages`, data);
        return response.json();
      }
    },
    onSuccess: () => {
      setMessageText("");
      setReplyToMessage(null);
      sendTypingIndicator(false);
      refetchMessages();
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const forwardMessageMutation = useMutation({
    mutationFn: async (data: { messageId: string; targetRoomIds: string[] }) => {
      const results = await Promise.all(
        data.targetRoomIds.map(async (roomId) => {
          const response = await apiRequest("POST", `/api/chat/messages/${data.messageId}/forward`, { targetRoomId: roomId });
          return response.json();
        })
      );
      return results;
    },
    onSuccess: () => {
      setShowForwardDialog(false);
      setForwardingMessage(null);
      setSelectedForwardRooms([]);
      toast({ title: "Message forwarded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to forward message", variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("DELETE", `/api/chat/messages/${messageId}`);
      return response.json();
    },
    onSuccess: () => {
      refetchMessages();
      toast({ title: "Message deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("POST", `/api/chat/messages/${messageId}/pin`);
      return response.json();
    },
    onSuccess: (data: { isPinned: boolean }) => {
      refetchMessages();
      toast({ title: data.isPinned ? "Message pinned" : "Message unpinned" });
    },
    onError: () => {
      toast({ title: "Failed to update pin status", variant: "destructive" });
    },
  });

  const scheduleMessageMutation = useMutation({
    mutationFn: async ({ content, scheduledAt }: { content: string; scheduledAt: string }) => {
      if (!selectedRoomId) throw new Error("No room selected");
      const response = await apiRequest("POST", `/api/chat/rooms/${selectedRoomId}/scheduled`, {
        content,
        scheduledAt,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowScheduleDialog(false);
      setScheduleContent("");
      setScheduleDate("");
      setScheduleTime("");
      toast({ title: "Message scheduled successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoomId, "scheduled"] });
    },
    onError: () => {
      toast({ title: "Failed to schedule message", variant: "destructive" });
    },
  });

  const cancelScheduledMutation = useMutation({
    mutationFn: async (scheduledId: string) => {
      const response = await apiRequest("DELETE", `/api/chat/scheduled/${scheduledId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Scheduled message cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoomId, "scheduled"] });
    },
    onError: () => {
      toast({ title: "Failed to cancel scheduled message", variant: "destructive" });
    },
  });

  // Query for scheduled messages
  const { data: scheduledMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/chat/rooms", selectedRoomId, "scheduled"],
    enabled: !!selectedRoomId && !!currentUser,
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ file, roomId }: { file: File; roomId: string }) => {
      if (!roomId) throw new Error("No room selected");
      
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/chat/rooms/${roomId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchMessages();
      toast({ title: "Media uploaded" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to upload media", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const sendGifMutation = useMutation({
    mutationFn: async ({ gif, roomId }: { gif: GiphyGif; roomId: string }) => {
      if (!roomId) throw new Error("No room selected");
      
      const response = await apiRequest("POST", `/api/chat/rooms/${roomId}/messages`, {
        content: gif.title || "GIF",
        messageType: "gif",
        attachmentUrl: gif.url,
        attachmentName: gif.title || "GIF",
        attachmentType: "gif",
      });
      return response.json();
    },
    onSuccess: () => {
      setShowGifPicker(false);
      setGifSearchQuery("");
      refetchMessages();
    },
    onError: () => {
      toast({ title: "Failed to send GIF", variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRoomId) return;
    
    const file = files[0];
    const maxSize = file.type.startsWith("video/") ? 60 * 1024 * 1024 : 15 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum size is ${file.type.startsWith("video/") ? "60MB" : "15MB"}`,
        variant: "destructive",
      });
      return;
    }
    
    uploadAttachmentMutation.mutate({ file, roomId: selectedRoomId });
    e.target.value = "";
  };

  const handleGifSelect = (gif: GiphyGif) => {
    if (!selectedRoomId) return;
    sendGifMutation.mutate({ gif, roomId: selectedRoomId });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedRoomId) return;
    
    const messageData: { 
      content: string; 
      replyToId?: string; 
      replyToSenderId?: string; 
      replyToSenderName?: string; 
      replyToPreview?: string;
      mentions?: Array<{ id: string; name: string }>;
    } = {
      content: messageText.trim()
    };
    
    if (replyToMessage) {
      messageData.replyToId = replyToMessage.id;
      messageData.replyToSenderId = replyToMessage.senderId;
      messageData.replyToSenderName = replyToMessage.senderName || "Unknown";
      messageData.replyToPreview = replyToMessage.content?.substring(0, 100) || "";
    }
    
    if (activeMentions.length > 0) {
      const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
      const messageMentions: string[] = [];
      let match;
      while ((match = mentionPattern.exec(messageText)) !== null) {
        messageMentions.push(match[1].toLowerCase());
      }
      const validMentions = activeMentions.filter(m => 
        messageMentions.some(mention => m.name.toLowerCase().startsWith(mention))
      );
      if (validMentions.length > 0) {
        messageData.mentions = validMentions;
      }
    }
    
    sendMessageMutation.mutate(messageData);
    setActiveMentions([]);
  };

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyToMessage(message);
  };

  const handleScheduleMessage = () => {
    if (!scheduleContent.trim() || !scheduleDate || !scheduleTime) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduledAt <= new Date()) {
      toast({ title: "Scheduled time must be in the future", variant: "destructive" });
      return;
    }
    
    scheduleMessageMutation.mutate({
      content: scheduleContent.trim(),
      scheduledAt: scheduledAt.toISOString(),
    });
  };

  const openScheduleDialog = () => {
    // Pre-fill with current message text if any
    if (messageText.trim()) {
      setScheduleContent(messageText.trim());
    }
    setShowScheduleDialog(true);
  };

  const handleAdvancedSearch = async () => {
    if (!selectedRoomId) return;
    
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (advancedSearchQuery.trim()) params.append("q", advancedSearchQuery.trim());
      if (searchSender && searchSender !== "all") params.append("senderId", searchSender);
      if (searchDateFrom) params.append("dateFrom", searchDateFrom);
      if (searchDateTo) params.append("dateTo", searchDateTo);
      if (searchMediaType && searchMediaType !== "all") params.append("mediaType", searchMediaType);
      
      const response = await fetch(`/api/chat/rooms/${selectedRoomId}/search?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Search failed");
      }
      
      const results = await response.json();
      setAdvancedSearchResults(results);
    } catch (error) {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const clearAdvancedSearchFilters = () => {
    setAdvancedSearchQuery("");
    setSearchSender("all");
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchMediaType("all");
    setAdvancedSearchResults([]);
  };

  const jumpToMessage = (messageId: string) => {
    setShowAdvancedSearchDialog(false);
    // Scroll to the message
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("bg-yellow-100", "dark:bg-yellow-900/30");
        setTimeout(() => {
          messageElement.classList.remove("bg-yellow-100", "dark:bg-yellow-900/30");
        }, 2000);
      }
    }, 100);
  };

  // Template management functions
  const saveTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      toast({ title: "Please fill in both name and content", variant: "destructive" });
      return;
    }
    
    let updatedTemplates;
    if (editingTemplateId) {
      updatedTemplates = templates.map(t => 
        t.id === editingTemplateId 
          ? { ...t, name: newTemplateName.trim(), content: newTemplateContent.trim() }
          : t
      );
    } else {
      const newTemplate = {
        id: Date.now().toString(),
        name: newTemplateName.trim(),
        content: newTemplateContent.trim(),
      };
      updatedTemplates = [...templates, newTemplate];
    }
    
    setTemplates(updatedTemplates);
    localStorage.setItem("chat_templates", JSON.stringify(updatedTemplates));
    setNewTemplateName("");
    setNewTemplateContent("");
    setEditingTemplateId(null);
    toast({ title: editingTemplateId ? "Template updated" : "Template saved" });
  };

  const deleteTemplate = (id: string) => {
    const updatedTemplates = templates.filter(t => t.id !== id);
    setTemplates(updatedTemplates);
    localStorage.setItem("chat_templates", JSON.stringify(updatedTemplates));
    toast({ title: "Template deleted" });
  };

  const useTemplate = (content: string) => {
    setMessageText(content);
    setShowTemplatesMenu(false);
    messageInputRef.current?.focus();
  };

  const editTemplate = (template: { id: string; name: string; content: string }) => {
    setEditingTemplateId(template.id);
    setNewTemplateName(template.name);
    setNewTemplateContent(template.content);
  };

  const saveCurrentAsTemplate = () => {
    if (messageText.trim()) {
      setNewTemplateContent(messageText.trim());
      setShowTemplatesDialog(true);
    } else {
      toast({ title: "Type a message first to save as template", variant: "destructive" });
    }
  };

  const handleForwardMessage = (message: ChatMessage) => {
    setForwardingMessage(message);
    setShowForwardDialog(true);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const canDeleteMessage = (message: ChatMessage) => {
    if (!currentUser) return false;
    const isOwn = message.senderId === currentUser.id;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    
    // Admins can delete any message within 24 hours
    if (isAppAdmin) {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      return messageAge < twentyFourHours;
    }
    
    // Regular users can only delete their own messages within 2 minutes
    if (!isOwn) return false;
    const twoMinutes = 2 * 60 * 1000;
    return messageAge < twoMinutes;
  };

  const handleExportChat = () => {
    if (!selectedRoom || !messages.length) {
      toast({ title: "No messages to export", variant: "destructive" });
      return;
    }
    
    const roomName = getRoomDisplayName(selectedRoom);
    const exportDate = format(new Date(), "yyyy-MM-dd HH:mm");
    
    let content = `Chat Export: ${roomName}\n`;
    content += `Exported on: ${exportDate}\n`;
    content += `Messages: ${messages.length}\n`;
    content += `${"=".repeat(50)}\n\n`;
    
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    sortedMessages.forEach(msg => {
      const timestamp = format(new Date(msg.createdAt), "MMM d, yyyy HH:mm");
      const sender = msg.senderName;
      const isDeleted = msg.deletedAt !== null;
      
      if (isDeleted) {
        content += `[${timestamp}] ${sender}: [Message deleted]\n`;
      } else if (msg.messageType === "gif") {
        content += `[${timestamp}] ${sender}: [GIF: ${(msg as any).attachmentName || "GIF"}]\n`;
      } else if (msg.messageType === "image") {
        content += `[${timestamp}] ${sender}: [Image: ${(msg as any).attachmentName || "Image"}]\n`;
      } else if (msg.messageType === "video") {
        content += `[${timestamp}] ${sender}: [Video: ${(msg as any).attachmentName || "Video"}]\n`;
      } else if (msg.messageType === "voice") {
        content += `[${timestamp}] ${sender}: [Voice message]\n`;
      } else if (msg.messageType === "file") {
        content += `[${timestamp}] ${sender}: [File: ${(msg as any).attachmentName || "File"}]\n`;
      } else {
        content += `[${timestamp}] ${sender}: ${msg.content}\n`;
      }
    });
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${roomName.replace(/[^a-z0-9]/gi, "-")}-${format(new Date(), "yyyyMMdd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "Chat exported successfully" });
  };

  // Voice recording functions
  const startRecording = async () => {
    if (!selectedRoomId) {
      toast({ title: "Select a chat first", variant: "destructive" });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ 
        title: "Microphone access denied", 
        description: "Please allow microphone access to record voice messages",
        variant: "destructive" 
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };
  
  const sendVoiceMessage = async () => {
    if (!audioBlob || !selectedRoomId) return;
    
    const formData = new FormData();
    formData.append("audio", audioBlob, `voice-${Date.now()}.webm`);
    formData.append("duration", recordingDuration.toString());
    
    try {
      const response = await fetch(`/api/chat/rooms/${selectedRoomId}/voice`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Failed to send voice message");
      
      setAudioBlob(null);
      setRecordingDuration(0);
      refetchMessages();
      toast({ title: "Voice message sent" });
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast({ title: "Failed to send voice message", variant: "destructive" });
    }
  };
  
  const formatRecordingDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionPopover) {
      handleMentionKeyDown(e);
      if (["ArrowDown", "ArrowUp", "Escape"].includes(e.key)) return;
      if (e.key === "Enter" && getFilteredMentionStaff().length > 0) return;
    }
    
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

  // Get avatar URL for a chat room - prioritizes room avatar, then client photo for client chats, then staff photo for direct chats
  const getRoomAvatarUrl = (room: ChatRoomWithParticipants): string | undefined => {
    // If room has a custom avatar set, use it
    if (room.avatarUrl) {
      return room.avatarUrl;
    }
    
    // For direct message chats, show the other participant's profile photo
    if (room.type === "direct") {
      const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.id);
      if (otherParticipant?.staffAvatarUrl) {
        return otherParticipant.staffAvatarUrl;
      }
    }
    
    // For client chats, try to get the client's photo
    if (room.type === "client" && room.clientId) {
      const client = clients.find(c => c.id === room.clientId);
      if (client?.photo) {
        return client.photo;
      }
    }
    
    // No avatar available - will use fallback
    return undefined;
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

  const getTypingInfo = () => {
    if (!selectedRoomId) return null;
    const roomTyping = typingUsers.get(selectedRoomId);
    if (!roomTyping || roomTyping.size === 0) return null;
    
    const typingParticipants = Array.from(roomTyping)
      .filter(id => id !== currentUser?.id)
      .map(id => {
        const participant = selectedRoom?.participants.find(p => p.staffId === id);
        return {
          id,
          name: participant?.staffName?.split(" ")[0] || "Someone",
          fullName: participant?.staffName || "Someone",
          avatar: participant?.staffAvatarUrl
        };
      });
    
    if (typingParticipants.length === 0) return null;
    
    const text = typingParticipants.length === 1 
      ? `${typingParticipants[0].name} is typing...`
      : `${typingParticipants.map(p => p.name).join(", ")} are typing...`;
    
    return { participants: typingParticipants, text };
  };
  
  const getTypingText = () => {
    const info = getTypingInfo();
    return info?.text || null;
  };

  // Filter rooms based on active tab and search, then sort with pinned first
  const filteredRooms = (activeTab === "archived" ? archivedRooms : rooms)
    .filter(room => {
      const matchesSearch = !searchQuery || getRoomDisplayName(room).toLowerCase().includes(searchQuery.toLowerCase());

      // For archived tab, only show archived rooms (archivedRooms array already filtered)
      if (activeTab === "archived") return matchesSearch;

      // For other tabs, apply type filtering
      if (activeTab === "all") return matchesSearch;
      if (activeTab === "client") return room.type === "client" && matchesSearch;
      if (activeTab === "direct") return room.type === "direct" && matchesSearch;
      if (activeTab === "group") return (room.type === "group" || room.type === "announcement") && matchesSearch;

      return matchesSearch;
    })
    .sort((a, b) => {
      // Get current user's participant info for pinned status
      const aPinned = a.participants.find(p => p.staffId === currentUser?.id)?.isPinned === "yes";
      const bPinned = b.participants.find(p => p.staffId === currentUser?.id)?.isPinned === "yes";
      
      // Pinned rooms first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Then sort by last message time (most recent first)
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

  // Pin/mute mutations
  const pinMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest("POST", `/api/chat/rooms/${roomId}/pin`);
      return response as unknown as { isPinned: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ 
        title: data.isPinned ? "Chat pinned" : "Chat unpinned",
        description: data.isPinned ? "This chat will appear at the top" : "Chat unpinned from top"
      });
    },
    onError: () => {
      toast({ title: "Failed to update pin status", variant: "destructive" });
    }
  });

  const muteMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest("POST", `/api/chat/rooms/${roomId}/mute`);
      return response as unknown as { isMuted: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ 
        title: data.isMuted ? "Chat muted" : "Chat unmuted",
        description: data.isMuted ? "You won't receive notifications" : "Notifications enabled"
      });
    },
    onError: () => {
      toast({ title: "Failed to update mute status", variant: "destructive" });
    }
  });

  const archiveChatMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return await apiRequest("POST", `/api/chat/rooms/${roomId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms/archived"] });
      toast({ 
        title: "Chat archived",
        description: "This chat has been archived"
      });
      if (selectedRoomId === manageMembersRoomId) {
        setSelectedRoomId(null);
      }
    },
    onError: () => {
      toast({ title: "Failed to archive chat", variant: "destructive" });
    }
  });

  const unarchiveChatMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return await apiRequest("POST", `/api/chat/rooms/${roomId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms/archived"] });
      toast({ 
        title: "Chat restored",
        description: "This chat has been restored from archive"
      });
    },
    onError: () => {
      toast({ title: "Failed to restore chat", variant: "destructive" });
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ roomId, staffId, staffName, staffEmail }: { roomId: string; staffId: string; staffName: string; staffEmail?: string }) => {
      return await apiRequest("POST", `/api/chat/rooms/${roomId}/participants`, {
        staffId,
        staffName,
        staffEmail,
        role: "member"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({ title: "Member added successfully" });
      setShowAddMemberDialog(false);
      setNewMemberStaffId("");
    },
    onError: () => {
      toast({ title: "Failed to add member", variant: "destructive" });
    }
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

  const renderMessageContent = (content: string, isOwn: boolean) => {
    const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = mentionPattern.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      const mentionName = match[1];
      const isAllMention = mentionName.toLowerCase() === "all";
      const mentionedStaff = !isAllMention ? staff.find(s => 
        s.name?.toLowerCase() === mentionName.toLowerCase() ||
        s.name?.toLowerCase().startsWith(mentionName.toLowerCase())
      ) : null;
      
      parts.push(
        <span 
          key={`mention-${keyIndex++}`}
          className={`font-medium ${
            isOwn 
              ? "text-primary-foreground bg-primary-foreground/20 rounded px-0.5" 
              : "text-primary bg-primary/20 rounded px-0.5"
          }`}
          data-testid={isAllMention ? "mention-all" : (mentionedStaff ? `mention-${mentionedStaff.id}` : undefined)}
        >
          @{mentionName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

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
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background" data-testid="chat-page">
      {/* Sidebar - Conversation List */}
      <div className={`${selectedRoomId && isMobileView ? "hidden" : "flex"} w-full md:w-80 lg:w-96 flex-col h-full overflow-hidden bg-card md:border-r z-20 relative`}>
        {/* Header - Fixed at top */}
        <div className="shrink-0 bg-card border-b">
          <div className="px-4 pt-4 pb-3 md:px-5 md:pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Messages</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Team communication</p>
              </div>
              <div className="flex items-center gap-1">
                {isAppAdmin && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="rounded-full h-10 w-10"
                    onClick={() => setShowCustomChatDialog(true)}
                    title="Create Custom Chat"
                    data-testid="button-admin-create-chat"
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90" data-testid="button-new-chat">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
                data-testid="input-search-chats"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 pb-3 md:px-5">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`w-full h-9 p-1 bg-muted/50 rounded-xl grid gap-0.5 ${isAppAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <TabsTrigger value="all" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
                <TabsTrigger value="client" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Clients
                </TabsTrigger>
                <TabsTrigger value="direct" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <UserIcon className="h-3 w-3 mr-1" />
                  Direct
                </TabsTrigger>
                <TabsTrigger value="group" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="h-3 w-3 mr-1" />
                  Teams
                </TabsTrigger>
                {isAppAdmin && (
                  <TabsTrigger value="archived" className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Conversation List - Scrollable area that fills remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
          {roomsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading chats...</p>
              </div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold mb-1">No conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a new conversation with your team
              </p>
              <Button onClick={() => setShowNewChatDialog(true)} className="rounded-lg px-5">
                <Plus className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
            </div>
          ) : (
            <div className="p-2">
              {filteredRooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                const otherParticipant = room.participants.find(p => p.staffId !== currentUser?.id);
                const isOnline = room.type === "direct" && otherParticipant && onlineUsers.has(otherParticipant.staffId);
                const myParticipant = room.participants.find(p => p.staffId === currentUser?.id);
                const isPinned = myParticipant?.isPinned === "yes";
                const isMuted = myParticipant?.isMuted === "yes";
                
                return (
                  <div
                    key={room.id}
                    className={`group relative flex items-center gap-3 p-3 mb-1.5 cursor-pointer rounded-xl transition-colors ${
                      isSelected 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                    data-testid={`chat-room-${room.id}`}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                    }}
                  >
                    {/* Pin indicator */}
                    {isPinned && (
                      <div className="absolute -top-1 -left-1 z-10">
                        <div className="bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                          <Pin className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    )}
                    
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 shadow-sm">
                        <AvatarImage src={getRoomAvatarUrl(room)} alt={getRoomDisplayName(room)} />
                        <AvatarFallback className={`${getRoomBgColor(room)} text-sm font-medium`}>
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
                          <span className={`font-medium truncate ${isSelected ? "text-primary" : ""}`}>
                            {getRoomDisplayName(room)}
                          </span>
                          {isMuted && (
                            <BellOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {room.lastMessageAt && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: false })}
                            </span>
                          )}
                          
                          {/* Actions dropdown - visible on hover */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pinMutation.mutate(room.id);
                                }}
                                data-testid={`pin-chat-${room.id}`}
                              >
                                {isPinned ? (
                                  <>
                                    <PinOff className="h-4 w-4 mr-2" />
                                    Unpin chat
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4 mr-2" />
                                    Pin to top
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  muteMutation.mutate(room.id);
                                }}
                                data-testid={`mute-chat-${room.id}`}
                              >
                                {isMuted ? (
                                  <>
                                    <Bell className="h-4 w-4 mr-2" />
                                    Unmute
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="h-4 w-4 mr-2" />
                                    Mute notifications
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              {/* Member management - only for group/client/announcement chats */}
                              {(room.type === "group" || room.type === "client" || room.type === "announcement") && (
                                <>
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setManageMembersRoomId(room.id);
                                      setShowAddMemberDialog(true);
                                    }}
                                    data-testid={`add-member-${room.id}`}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add member
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRoomId(room.id);
                                      setShowRoomSettings(true);
                                    }}
                                    data-testid={`manage-members-${room.id}`}
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage members
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {/* Archive/Restore chat - only for admins */}
                              {isAppAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  {room.isArchived === "yes" ? (
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unarchiveChatMutation.mutate(room.id);
                                      }}
                                      className="text-green-600 dark:text-green-400"
                                      data-testid={`restore-chat-${room.id}`}
                                    >
                                      <ArchiveRestore className="h-4 w-4 mr-2" />
                                      Restore chat
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Are you sure you want to archive this chat? This action can be undone by an administrator.")) {
                                          archiveChatMutation.mutate(room.id);
                                        }
                                      }}
                                      className="text-orange-600 dark:text-orange-400"
                                      data-testid={`archive-chat-${room.id}`}
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive chat
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {room.lastMessagePreview && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {room.lastMessagePreview}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {room.type === "client" && room.clientName && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-2 rounded-md font-normal">
                            {room.clientName}
                          </Badge>
                        )}
                        {(room.type === "group" || room.type === "announcement") && (
                          <span className="text-[11px] text-muted-foreground">
                            {room.participants.length} members
                          </span>
                        )}
                        {room.isAnnouncement === "yes" && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-2 rounded-md font-normal bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                            <Megaphone className="h-2.5 w-2.5 mr-1" />
                            Broadcast
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Chevron indicator */}
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                  </div>
                );
              })}
            </div>
          )}
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${!selectedRoomId && isMobileView ? "hidden" : "flex"} flex-1 flex-col h-full overflow-hidden bg-muted/30`}>
        {selectedRoom ? (
          <>
            {/* Chat Header - Premium Design */}
            <div className="shrink-0 z-10 flex items-center justify-between px-3 py-3 md:px-5 md:py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden rounded-full shrink-0 min-w-[44px] min-h-[44px]"
                  onClick={() => setSelectedRoomId(null)}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 md:h-11 md:w-11 shadow-sm shrink-0">
                  <AvatarImage src={getRoomAvatarUrl(selectedRoom)} alt={getRoomDisplayName(selectedRoom)} />
                  <AvatarFallback className={`${getRoomBgColor(selectedRoom)} text-sm font-medium`}>
                    {getRoomAvatar(selectedRoom)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {getRoomIcon(selectedRoom)}
                    <h2 className="font-semibold truncate">{getRoomDisplayName(selectedRoom)}</h2>
                  </div>
                  {selectedRoom.type === "client" && selectedRoom.clientName && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        Care Team for {selectedRoom.clientName}
                      </p>
                      {selectedRoom.clientId && (
                        <div className="flex items-center gap-1 ml-2">
                          <Link to={`/clients/${selectedRoom.clientId}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs rounded-lg hover-elevate">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Profile
                            </Button>
                          </Link>
                          <Link to={`/clients/${selectedRoom.clientId}/care-plan`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs rounded-lg hover-elevate">
                              <FileText className="h-3 w-3 mr-1" />
                              Care Plan
                            </Button>
                          </Link>
                          <Link to={`/clients/${selectedRoom.clientId}/documents`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs rounded-lg hover-elevate">
                              <FolderOpen className="h-3 w-3 mr-1" />
                              Docs
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  {(selectedRoom.type === "group" || selectedRoom.type === "announcement") && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRoom.participants.length} members
                    </p>
                  )}
                  {selectedRoom.type === "direct" && (
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        onlineUsers.has(selectedRoom.participants.find(p => p.staffId !== currentUser?.id)?.staffId || "") 
                          ? "bg-green-500" 
                          : "bg-muted-foreground/40"
                      }`} />
                      <p className="text-xs text-muted-foreground">
                        {onlineUsers.has(selectedRoom.participants.find(p => p.staffId !== currentUser?.id)?.staffId || "") 
                          ? "Online" 
                          : "Offline"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* More Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full shrink-0 min-w-[44px] min-h-[44px]"
                      data-testid="button-chat-options"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAppAdmin && (
                      <>
                        <DropdownMenuItem onClick={handleExportChat} data-testid="button-export-chat">
                          <Download className="h-4 w-4 mr-2" />
                          Export Chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setShowAdvancedSearchDialog(true)} data-testid="menu-advanced-search">
                      <Search className="h-4 w-4 mr-2" />
                      Advanced Search
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {(isRoomAdmin || isAppAdmin) && selectedRoom.type !== "direct" && (
                <Sheet open={showRoomSettings} onOpenChange={setShowRoomSettings}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full shrink-0 min-w-[44px] min-h-[44px]" data-testid="button-room-settings">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                      <SheetTitle>Chat Settings</SheetTitle>
                      <SheetDescription>
                        Manage this chat room
                      </SheetDescription>
                    </SheetHeader>
                    
                    <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as "settings" | "media")} className="mt-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="settings">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </TabsTrigger>
                        <TabsTrigger value="media">
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Media
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="settings" className="mt-4">
                        <div className="space-y-6">
                      {/* Chat Avatar */}
                      <div className="space-y-3">
                        <Label>Chat Photo</Label>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 shadow-md">
                            <AvatarImage src={getRoomAvatarUrl(selectedRoom)} alt={getRoomDisplayName(selectedRoom)} />
                            <AvatarFallback className={`${getRoomBgColor(selectedRoom)} text-lg font-medium`}>
                              {getRoomAvatar(selectedRoom)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              id="chat-avatar-upload"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedRoom) {
                                  const formData = new FormData();
                                  formData.append("avatar", file);
                                  try {
                                    const response = await fetch(`/api/chat/rooms/${selectedRoom.id}/avatar`, {
                                      method: "POST",
                                      body: formData,
                                      credentials: "include",
                                    });
                                    if (response.ok) {
                                      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
                                      toast({ title: "Chat photo updated" });
                                    } else {
                                      toast({ title: "Failed to upload photo", variant: "destructive" });
                                    }
                                  } catch (err) {
                                    toast({ title: "Failed to upload photo", variant: "destructive" });
                                  }
                                }
                                e.target.value = "";
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById("chat-avatar-upload")?.click()}
                              data-testid="button-upload-chat-avatar"
                            >
                              <ImageIcon className="h-4 w-4 mr-2" />
                              {selectedRoom.avatarUrl ? "Change Photo" : "Upload Photo"}
                            </Button>
                            {selectedRoom.avatarUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/chat/rooms/${selectedRoom.id}/avatar`, {
                                      method: "DELETE",
                                      credentials: "include",
                                    });
                                    if (response.ok) {
                                      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
                                      toast({ title: "Chat photo removed" });
                                    }
                                  } catch (err) {
                                    toast({ title: "Failed to remove photo", variant: "destructive" });
                                  }
                                }}
                                data-testid="button-remove-chat-avatar"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                        {selectedRoom.type === "client" && !selectedRoom.avatarUrl && (
                          <p className="text-xs text-muted-foreground">
                            Using client's profile photo. Upload a custom photo to override.
                          </p>
                        )}
                      </div>

                      <Separator />

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
                      </TabsContent>
                      
                      <TabsContent value="media" className="mt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Shared photos and documents (30-day retention)
                            </p>
                          </div>
                          
                          {mediaLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : roomMedia.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium">No media shared yet</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Photos and documents shared in this chat will appear here
                              </p>
                            </div>
                          ) : (
                            <ScrollArea className="h-[400px]">
                              {/* Photos Section */}
                              {roomMedia.filter(m => m.type === "image").length > 0 && (
                                <div className="mb-6">
                                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Photos ({roomMedia.filter(m => m.type === "image").length})
                                  </h4>
                                  <div className="grid grid-cols-3 gap-2">
                                    {roomMedia.filter(m => m.type === "image").map(media => (
                                      <a
                                        key={media.id}
                                        href={media.storageKey}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative aspect-square rounded-xl overflow-hidden border hover:opacity-90 transition-opacity group"
                                      >
                                        <img
                                          src={media.thumbnailKey || media.storageKey}
                                          alt={media.fileName}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs p-2">
                                          <Download className="h-4 w-4 mb-1" />
                                          <span className="truncate w-full text-center">{media.fileName}</span>
                                          <span className="text-[10px] text-white/70">
                                            {format(new Date(media.createdAt), "MMM d, yyyy")}
                                          </span>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Documents Section */}
                              {roomMedia.filter(m => m.type === "file").length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Documents ({roomMedia.filter(m => m.type === "file").length})
                                  </h4>
                                  <div className="space-y-2">
                                    {roomMedia.filter(m => m.type === "file").map(media => (
                                      <a
                                        key={media.id}
                                        href={media.storageKey}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                                      >
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                          <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{media.fileName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {(media.fileSize / 1024).toFixed(1)} KB • {media.senderName} • {format(new Date(media.createdAt), "MMM d, yyyy")}
                                          </p>
                                        </div>
                                        <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                            </ScrollArea>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Messages Area - Premium Design */}
            <ScrollArea className="flex-1 min-h-0 px-3 py-4 md:px-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="h-20 w-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-4">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-medium mb-1">No messages yet</h3>
                  <p className="text-sm text-muted-foreground max-w-[200px]">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...messages].reverse().map((message, index, arr) => {
                    const isOwn = message.senderId === currentUser?.id;
                    const showAvatar = index === 0 || arr[index - 1]?.senderId !== message.senderId;
                    const isDeleted = message.deletedAt !== null;
                    const isForwarded = !!(message as any).forwardedFromMessageId;
                    const isReply = !!(message as any).replyToId;
                    const isSearchMatch = searchResults.some(r => r.message.id === message.id);
                    const isCurrentSearchResult = isSearchMatch && searchResults[currentSearchResultIndex]?.message.id === message.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`group flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${isCurrentSearchResult ? "bg-yellow-200/40 dark:bg-yellow-900/20 rounded-lg px-2 py-1 -mx-2" : ""}`}
                        data-testid={`message-${message.id}`}
                      >
                        {!isOwn && showAvatar ? (
                          <Avatar className="h-8 w-8 shadow-sm shrink-0">
                            <AvatarFallback className="text-xs font-medium bg-muted">
                              {message.senderName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : !isOwn ? (
                          <div className="w-8 shrink-0" />
                        ) : null}
                        
                        <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && (
                            <p className={`text-xs font-bold mb-1 ml-1 ${getSenderNameColor(message.senderId)}`}>
                              {message.senderName}
                            </p>
                          )}
                          
                          {message.isPinned === "yes" && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mb-1 ml-1">
                              <Pin className="h-2.5 w-2.5" />
                              <span>Pinned</span>
                            </div>
                          )}
                          
                          {isForwarded && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 ml-1">
                              <Forward className="h-2.5 w-2.5" />
                              <span>Forwarded</span>
                            </div>
                          )}
                          
                          {isReply && (message as any).replyToPreview && (
                            <div 
                              className={`text-[11px] px-3 py-1.5 rounded-xl mb-1 border-l-2 ${
                                isOwn 
                                  ? "bg-slate-300 dark:bg-slate-600 border-slate-400 text-foreground" 
                                  : "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                              }`}
                            >
                              <p className="font-medium">{(message as any).replyToSenderName}</p>
                              <p className="truncate max-w-[180px] text-muted-foreground">{(message as any).replyToPreview}</p>
                            </div>
                          )}
                          
                          <div className="flex items-end gap-1" title={isDeleted && (message as any).deletedByName ? `Deleted by ${(message as any).deletedByName} on ${format(new Date((message as any).deletedAt), 'MMM d, yyyy HH:mm')}` : undefined}>
                            <div
                              className={`rounded-xl shadow-sm ${
                                isDeleted
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic px-4 py-2.5"
                                  : (message as any).attachmentUrl && ((message as any).messageType === "gif" || (message as any).messageType === "image" || (message as any).messageType === "video")
                                    ? "overflow-hidden p-1"
                                    : isForwarded
                                      ? "bg-green-100 dark:bg-green-900/30 text-foreground rounded-bl-md px-4 py-2.5"
                                      : isOwn
                                        ? "bg-white dark:bg-slate-200 text-black dark:text-black rounded-br-md px-4 py-2.5"
                                        : "bg-blue-500 dark:bg-blue-600 text-white rounded-bl-md px-4 py-2.5"
                              }`}
                            >
                              {isDeleted ? (
                                <div className="flex flex-col gap-0.5">
                                  <p className="text-sm flex items-center gap-1.5">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    This message was deleted
                                  </p>
                                  <p className="text-xs text-muted-foreground/80">
                                    by {(message as any).deletedByName || 'someone'} {(message as any).deletedAt && `on ${format(new Date((message as any).deletedAt), 'MMM d, yyyy HH:mm')}`}
                                  </p>
                                </div>
                              ) : (message as any).attachmentUrl && (message as any).messageType === "gif" ? (
                                <img 
                                  src={(message as any).attachmentUrl} 
                                  alt={(message as any).attachmentName || "GIF"}
                                  className="max-w-[280px] max-h-[200px] rounded-xl object-contain"
                                  loading="lazy"
                                  data-testid={`gif-message-${message.id}`}
                                />
                              ) : (message as any).attachmentUrl && (message as any).messageType === "image" ? (
                                <img 
                                  src={(message as any).attachmentUrl} 
                                  alt={(message as any).attachmentName || "Image"}
                                  className="max-w-[280px] max-h-[300px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  loading="lazy"
                                  onClick={() => window.open((message as any).attachmentUrl, '_blank')}
                                  data-testid={`image-message-${message.id}`}
                                />
                              ) : (message as any).attachmentUrl && (message as any).messageType === "video" ? (
                                <video 
                                  src={(message as any).attachmentUrl} 
                                  controls
                                  className="max-w-[280px] max-h-[200px] rounded-xl"
                                  data-testid={`video-message-${message.id}`}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              ) : (message as any).attachmentUrl && (message as any).messageType === "file" ? (
                                <a 
                                  href={(message as any).attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-[14px] hover:underline"
                                  data-testid={`file-message-${message.id}`}
                                >
                                  <Paperclip className="h-4 w-4" />
                                  {(message as any).attachmentName || "Download file"}
                                </a>
                              ) : (message as any).attachmentUrl && (message as any).messageType === "voice" ? (
                                <div className="flex items-center gap-3 py-1" data-testid={`voice-message-${message.id}`}>
                                  <div className={`p-2 rounded-full ${isOwn ? "bg-white/20" : "bg-primary/10"}`}>
                                    <Mic className={`h-4 w-4 ${isOwn ? "text-white" : "text-primary"}`} />
                                  </div>
                                  <audio 
                                    src={(message as any).attachmentUrl} 
                                    controls
                                    className="h-8 max-w-[200px]"
                                  >
                                    Your browser does not support the audio tag.
                                  </audio>
                                </div>
                              ) : (
                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                                  {renderMessageContent(message.content || "", isOwn)}
                                </p>
                              )}
                            </div>

                            {!isDeleted && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="rounded-full h-7 w-7"
                                      data-testid={`button-message-actions-${message.id}`}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-48">
                                    {/* Reactions Submenu */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger data-testid={`button-react-${message.id}`}>
                                        <Heart className="h-4 w-4 mr-2" />
                                        React
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="p-2">
                                        <div className="flex items-center gap-1">
                                          {[
                                            { emoji: "heart", icon: Heart, color: "text-red-500 hover:text-red-600", label: "Love" },
                                            { emoji: "thumbsup", icon: ThumbsUp, color: "text-blue-500 hover:text-blue-600", label: "Like" },
                                            { emoji: "thumbsdown", icon: ThumbsDown, color: "text-orange-500 hover:text-orange-600", label: "Dislike" },
                                            { emoji: "diamond", icon: Diamond, color: "text-cyan-500 hover:text-cyan-600", label: "Valuable" },
                                            { emoji: "party", icon: PartyPopper, color: "text-yellow-500 hover:text-yellow-600", label: "Celebrate" },
                                          ].map(({ emoji, icon: Icon, color, label }) => {
                                            const reactions = messageReactions[message.id] || [];
                                            const hasReacted = reactions.some(r => r.staffId === currentUser?.id && r.emoji === emoji);
                                            return (
                                              <Tooltip key={emoji}>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 rounded-full ${hasReacted ? "bg-muted ring-2 ring-primary/30" : ""} ${color}`}
                                                    onClick={() => handleToggleReaction(message.id, emoji)}
                                                    data-testid={`button-reaction-${emoji}-${message.id}`}
                                                  >
                                                    <Icon className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                  <p className="text-xs">{label}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            );
                                          })}
                                        </div>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleReplyToMessage(message)}
                                      data-testid={`button-reply-${message.id}`}
                                    >
                                      <Reply className="h-4 w-4 mr-2" />
                                      Reply
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleForwardMessage(message)}
                                      data-testid={`button-forward-${message.id}`}
                                    >
                                      <Forward className="h-4 w-4 mr-2" />
                                      Forward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => pinMessageMutation.mutate(message.id)}
                                      data-testid={`button-pin-${message.id}`}
                                    >
                                      {message.isPinned === "yes" ? (
                                        <>
                                          <PinOff className="h-4 w-4 mr-2" />
                                          Unpin
                                        </>
                                      ) : (
                                        <>
                                          <Pin className="h-4 w-4 mr-2" />
                                          Pin
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    {canDeleteMessage(message) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => handleDeleteMessage(message.id)}
                                          data-testid={`button-delete-${message.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                          
                          {/* Display Reactions */}
                          {!isDeleted && messageReactions[message.id]?.length > 0 && (() => {
                            const reactions = messageReactions[message.id];
                            const grouped = reactions.reduce((acc, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = [];
                              acc[r.emoji].push(r);
                              return acc;
                            }, {} as Record<string, ChatMessageReaction[]>);
                            
                            const emojiIcons: Record<string, typeof Heart> = {
                              heart: Heart, thumbsup: ThumbsUp, thumbsdown: ThumbsDown,
                              diamond: Diamond, party: PartyPopper
                            };
                            const emojiColors: Record<string, string> = {
                              heart: "text-red-500", thumbsup: "text-blue-500", thumbsdown: "text-orange-500",
                              diamond: "text-cyan-500", party: "text-yellow-500"
                            };
                            
                            return (
                              <div className={`flex items-center gap-1 mt-1 flex-wrap ${isOwn ? "justify-end" : ""}`}>
                                {Object.entries(grouped).map(([emoji, reactionList]) => {
                                  const Icon = emojiIcons[emoji] || Heart;
                                  const hasUserReacted = reactionList.some(r => r.staffId === currentUser?.id);
                                  return (
                                    <Tooltip key={emoji}>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-6 px-2 py-0 rounded-full text-xs ${hasUserReacted ? "bg-muted border border-primary/30" : "bg-muted/50"}`}
                                          onClick={() => handleToggleReaction(message.id, emoji)}
                                          data-testid={`reaction-count-${emoji}-${message.id}`}
                                        >
                                          <Icon className={`h-3 w-3 mr-1 ${emojiColors[emoji]}`} />
                                          <span className="font-medium">{reactionList.length}</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[200px]">
                                        <p className="text-xs">{reactionList.map(r => r.staffName).join(", ")}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          
                          <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? "justify-end" : ""}`}>
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatMessageDate(message.createdAt)}
                            </span>
                            {message.isEdited === "yes" && (
                              <span className="text-[10px] text-muted-foreground/70">(edited)</span>
                            )}
                            {/* Delivery & Read Status Indicator */}
                            {isOwn && (() => {
                              const deliveries = messageDeliveries[message.id] || [];
                              const reads = messageReads[message.id] || [];
                              const hasDeliveries = deliveries.length > 0;
                              const hasReads = reads.length > 0;
                              
                              // Status: sent (single check) -> delivered (double check) -> read (blue double check)
                              let statusIcon;
                              let statusText;
                              let statusColor;
                              
                              if (hasReads) {
                                statusIcon = <CheckCheck className="h-3.5 w-3.5" />;
                                statusText = `Read by ${reads.length}`;
                                statusColor = "text-blue-500";
                              } else if (hasDeliveries) {
                                statusIcon = <CheckCheck className="h-3.5 w-3.5" />;
                                statusText = `Delivered to ${deliveries.length}`;
                                statusColor = "text-muted-foreground/70";
                              } else {
                                statusIcon = <Check className="h-3.5 w-3.5" />;
                                statusText = "Sent";
                                statusColor = "text-muted-foreground/50";
                              }
                              
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      className={`inline-flex items-center cursor-pointer ${statusColor}`}
                                      onMouseEnter={() => fetchMessageReads(message.id)}
                                      data-testid={`delivery-status-${message.id}`}
                                    >
                                      {statusIcon}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px]">
                                    <div className="text-xs space-y-2">
                                      <div className="flex items-center gap-1.5">
                                        <Check className="h-3 w-3 text-muted-foreground" />
                                        <span>Sent</span>
                                      </div>
                                      {hasDeliveries && (
                                        <div>
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <CheckCheck className="h-3 w-3" />
                                            <span className="font-medium">Delivered to:</span>
                                          </div>
                                          <p className="pl-4.5 text-muted-foreground">
                                            {deliveries.map(d => d.staffName).join(", ")}
                                          </p>
                                        </div>
                                      )}
                                      {hasReads && (
                                        <div>
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <CheckCheck className="h-3 w-3 text-blue-500" />
                                            <span className="font-medium">Read by:</span>
                                          </div>
                                          <p className="pl-4.5 text-muted-foreground">
                                            {reads.map(r => r.staffName).join(", ")}
                                          </p>
                                        </div>
                                      )}
                                      {!hasDeliveries && !hasReads && (
                                        <p className="text-muted-foreground">Waiting for delivery...</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
              
              {/* Typing Indicator with Avatars */}
              {(() => {
                const typingInfo = getTypingInfo();
                if (!typingInfo) return null;
                const extraCount = typingInfo.participants.length - 3;
                return (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 ml-2" data-testid="typing-indicator">
                    <div className="flex -space-x-2">
                      {typingInfo.participants.slice(0, 3).map(p => (
                        <Avatar key={p.id} className="h-5 w-5 border-2 border-background shadow-sm">
                          <AvatarImage src={p.avatar ?? undefined} alt={p.fullName} />
                          <AvatarFallback className="text-[8px] bg-muted">
                            {p.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {extraCount > 0 && (
                        <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium">
                          +{extraCount}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-1">
                      <div className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                      </div>
                      <span>{typingInfo.text}</span>
                    </div>
                  </div>
                );
              })()}
            </ScrollArea>

            {/* Message Input - Premium Design */}
            <div className="shrink-0 p-3 md:p-4 bg-background border-t shadow-lg">
              {/* Reply Preview */}
              {replyToMessage && (
                <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5 mb-3 border-l-4 border-primary">
                  <div className="flex items-center gap-3 min-w-0">
                    <Reply className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary">Replying to {replyToMessage.senderName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {replyToMessage.content?.substring(0, 50)}
                        {(replyToMessage.content?.length || 0) > 50 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full shrink-0"
                    onClick={() => setReplyToMessage(null)}
                    data-testid="button-cancel-reply"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              
              {/* Input Row */}
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={!selectedRoomId}
                  data-testid="input-file-upload"
                />
                
                {/* Attachment Buttons - Touch-friendly for mobile */}
                <div className="flex items-center shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full min-w-[44px] min-h-[44px]"
                    onClick={() => selectedRoomId && fileInputRef.current?.click()}
                    disabled={!selectedRoomId || uploadAttachmentMutation.isPending}
                    data-testid="button-attach-file"
                    title={!selectedRoomId ? "Select a chat first" : "Attach file"}
                  >
                    {uploadAttachmentMutation.isPending ? (
                      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full min-w-[44px] min-h-[44px]"
                    onClick={() => selectedRoomId && setShowGifPicker(true)}
                    disabled={!selectedRoomId || sendGifMutation.isPending}
                    data-testid="button-gif-picker"
                    title={!selectedRoomId ? "Select a chat first" : "Send GIF"}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  {/* Templates Dropdown */}
                  <DropdownMenu open={showTemplatesMenu} onOpenChange={setShowTemplatesMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full min-w-[44px] min-h-[44px]"
                        disabled={!selectedRoomId}
                        data-testid="button-templates"
                        title={!selectedRoomId ? "Select a chat first" : "Message templates"}
                      >
                        <FileCode className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {templates.length === 0 ? (
                        <div className="px-3 py-4 text-center text-muted-foreground">
                          <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No templates yet</p>
                          <p className="text-xs">Save common messages for quick access</p>
                        </div>
                      ) : (
                        templates.map((template) => (
                          <DropdownMenuItem
                            key={template.id}
                            onClick={() => useTemplate(template.content)}
                            className="flex items-start gap-2 py-2"
                            data-testid={`template-item-${template.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{template.content}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowTemplatesDialog(true)}
                        data-testid="button-manage-templates"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Templates
                      </DropdownMenuItem>
                      {messageText.trim() && (
                        <DropdownMenuItem
                          onClick={saveCurrentAsTemplate}
                          data-testid="button-save-as-template"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Save Current as Template
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Message Input Field */}
                <div className="relative flex-1">
                  <Input
                    ref={messageInputRef}
                    placeholder={replyToMessage ? "Type your reply..." : "Type a message..."}
                    value={messageText}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyPress}
                    className="w-full bg-muted/40 border-0 rounded-full focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-message"
                  />
                  {/* Mentions Popover - Premium Design */}
                  {showMentionPopover && getFilteredMentionStaff().length > 0 && (
                    <div 
                      className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border/50 rounded-xl shadow-xl z-50 max-h-[220px] overflow-y-auto"
                      data-testid="mention-popover"
                    >
                      <div className="p-2">
                        <p className="text-[11px] text-muted-foreground px-2 py-1.5 font-medium uppercase tracking-wide">Mention</p>
                        {getFilteredMentionStaff().map((member, index) => (
                          <div
                            key={member.id}
                            onClick={() => handleMentionSelect(member)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                              index === selectedMentionIndex 
                                ? "bg-primary/10 text-foreground" 
                                : "hover:bg-muted/50"
                            }`}
                            data-testid={`mention-option-${member.id}`}
                          >
                            {member.isAllMention ? (
                              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                            ) : (
                              <Avatar className="h-8 w-8 shadow-sm">
                                <AvatarFallback className="text-xs font-medium bg-muted">
                                  {member.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.isAllMention ? "@all - Everyone" : member.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{member.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Voice Recording Controls */}
                {isRecording ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full">
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm font-medium text-destructive">
                        {formatRecordingDuration(recordingDuration)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full min-w-[44px] min-h-[44px]"
                      onClick={cancelRecording}
                      data-testid="button-cancel-recording"
                      title="Cancel recording"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      className="rounded-full shrink-0 shadow-sm min-w-[44px] min-h-[44px] bg-destructive hover:bg-destructive/90"
                      onClick={stopRecording}
                      data-testid="button-stop-recording"
                      title="Stop recording"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                ) : audioBlob ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {formatRecordingDuration(recordingDuration)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full min-w-[44px] min-h-[44px]"
                      onClick={cancelRecording}
                      data-testid="button-discard-recording"
                      title="Discard recording"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      className="rounded-full shrink-0 shadow-sm min-w-[44px] min-h-[44px]"
                      onClick={sendVoiceMessage}
                      data-testid="button-send-voice"
                      title="Send voice message"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Schedule Message Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full shrink-0 min-w-[44px] min-h-[44px]"
                      onClick={openScheduleDialog}
                      disabled={!selectedRoomId}
                      data-testid="button-schedule-message"
                      title={!selectedRoomId ? "Select a chat first" : "Schedule message"}
                    >
                      <Clock className="h-5 w-5" />
                    </Button>
                    {/* Voice Recording Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full shrink-0 min-w-[44px] min-h-[44px]"
                      onClick={startRecording}
                      disabled={!selectedRoomId}
                      data-testid="button-start-recording"
                      title={!selectedRoomId ? "Select a chat first" : "Record voice message"}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                    {/* Send Button - Touch-friendly for mobile */}
                    <Button
                      size="icon"
                      className="rounded-full shrink-0 shadow-sm min-w-[44px] min-h-[44px]"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty State - Premium Design */
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center px-6 max-w-md">
              <div className="h-24 w-24 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
              <p className="text-muted-foreground mb-6">
                Choose a chat from the list or start a new conversation with your team
              </p>
              <Button onClick={() => setShowNewChatDialog(true)} className="rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Direct Message Dialog - Premium Design */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">New Message</DialogTitle>
            <DialogDescription>
              Start a conversation with a team member
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[350px] -mx-4 px-4">
            <div className="space-y-1">
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
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors"
                    data-testid={`staff-option-${member.id}`}
                  >
                    <Avatar className="h-10 w-10 shadow-sm">
                      <AvatarFallback className="text-sm font-medium bg-muted">{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.role}</p>
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

      {/* Forward Message Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={(open) => {
        setShowForwardDialog(open);
        if (!open) {
          setForwardingMessage(null);
          setSelectedForwardRooms([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5" />
              Forward Message
            </DialogTitle>
            <DialogDescription>
              Select one or more chats to forward this message to
            </DialogDescription>
          </DialogHeader>
          
          {forwardingMessage && (
            <div className="bg-muted rounded-lg p-3 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Message from {forwardingMessage.senderName}</p>
              <p className="text-sm">{forwardingMessage.content?.substring(0, 150)}{(forwardingMessage.content?.length || 0) > 150 ? "..." : ""}</p>
            </div>
          )}
          
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {rooms
                .filter(room => room.id !== selectedRoomId)
                .map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedForwardRooms(prev =>
                        prev.includes(room.id)
                          ? prev.filter(id => id !== room.id)
                          : [...prev, room.id]
                      );
                    }}
                    data-testid={`forward-room-${room.id}`}
                  >
                    <Checkbox
                      checked={selectedForwardRooms.includes(room.id)}
                      onCheckedChange={(checked) => {
                        setSelectedForwardRooms(prev =>
                          checked
                            ? [...prev, room.id]
                            : prev.filter(id => id !== room.id)
                        );
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={getRoomBgColor(room)}>
                        {getRoomAvatar(room)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getRoomDisplayName(room)}</p>
                      {room.type !== "direct" && (
                        <p className="text-xs text-muted-foreground">
                          {room.participants.length} members
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForwardDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (forwardingMessage && selectedForwardRooms.length > 0) {
                  forwardMessageMutation.mutate({
                    messageId: forwardingMessage.id,
                    targetRoomIds: selectedForwardRooms
                  });
                }
              }}
              disabled={selectedForwardRooms.length === 0 || forwardMessageMutation.isPending}
              data-testid="button-confirm-forward"
            >
              <Forward className="h-4 w-4 mr-2" />
              Forward to {selectedForwardRooms.length} chat{selectedForwardRooms.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GIF Picker Dialog - Premium Design */}
      <Dialog open={showGifPicker} onOpenChange={(open) => {
        setShowGifPicker(open);
        if (!open) {
          setGifSearchQuery("");
        }
      }}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              Send a GIF
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for GIFs..."
                value={gifSearchQuery}
                onChange={(e) => setGifSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-muted/40 border-0 rounded-xl focus-visible:ring-1"
                data-testid="input-gif-search"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                {gifSearchQuery.length >= 2 
                  ? `Results for "${gifSearchQuery}"`
                  : "Trending"}
              </div>
            </div>
            
            {/* GIF Grid */}
            <ScrollArea className="h-[320px] -mx-2 px-2">
              {gifSearchLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">Loading GIFs...</p>
                  </div>
                </div>
              ) : displayedGifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {gifSearchQuery.length >= 2 
                      ? "No GIFs found. Try a different search."
                      : "GIF service not available"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {displayedGifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleGifSelect(gif)}
                      className="relative group rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all shadow-sm"
                      data-testid={`gif-${gif.id}`}
                    >
                      <img
                        src={gif.previewUrl}
                        alt={gif.title}
                        className="w-full h-28 object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/90 dark:bg-black/90 px-3 py-1 rounded-full">
                          <span className="text-foreground text-xs font-medium">Send</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <p className="text-xs text-center text-muted-foreground">
              Powered by GIPHY
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={(open) => {
        setShowAddMemberDialog(open);
        if (!open) {
          setManageMembersRoomId(null);
          setNewMemberStaffId("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Member
            </DialogTitle>
            <DialogDescription>
              Select a team member to add to this chat
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[350px] py-4">
            <div className="space-y-2">
              {(() => {
                const managedRoom = rooms.find(r => r.id === manageMembersRoomId);
                const existingParticipantIds = managedRoom?.participants.map(p => p.staffId) || [];
                const availableStaff = staff.filter(s => 
                  s.isActive === "yes" && 
                  !existingParticipantIds.includes(s.id)
                );
                
                if (availableStaff.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium">All team members are already in this chat</p>
                    </div>
                  );
                }
                
                return availableStaff.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      newMemberStaffId === member.id 
                        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => setNewMemberStaffId(member.id)}
                    data-testid={`add-member-staff-${member.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {member.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.role}</p>
                    </div>
                    {newMemberStaffId === member.id && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                ));
              })()}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const selectedStaff = staff.find(s => s.id === newMemberStaffId);
                if (selectedStaff && manageMembersRoomId) {
                  addMemberMutation.mutate({
                    roomId: manageMembersRoomId,
                    staffId: selectedStaff.id,
                    staffName: selectedStaff.name || "Unknown",
                    staffEmail: selectedStaff.email || undefined
                  });
                }
              }}
              disabled={!newMemberStaffId || addMemberMutation.isPending}
              data-testid="button-confirm-add-member"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Message Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Message
            </DialogTitle>
            <DialogDescription>
              Schedule a message to be sent at a specific time
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-content">Message</Label>
              <Textarea
                id="schedule-content"
                placeholder="Type your message..."
                value={scheduleContent}
                onChange={(e) => setScheduleContent(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-schedule-content"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-schedule-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  data-testid="input-schedule-time"
                />
              </div>
            </div>

            {/* Show scheduled messages for this room */}
            {scheduledMessages.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Pending Scheduled Messages</Label>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2">
                    {scheduledMessages
                      .filter((m: any) => m.status === "pending")
                      .map((scheduled: any) => (
                        <div 
                          key={scheduled.id} 
                          className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                          data-testid={`scheduled-message-${scheduled.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{scheduled.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(scheduled.scheduledAt).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8"
                            onClick={() => cancelScheduledMutation.mutate(scheduled.id)}
                            disabled={cancelScheduledMutation.isPending}
                            data-testid={`cancel-scheduled-${scheduled.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowScheduleDialog(false);
                setScheduleContent("");
                setScheduleDate("");
                setScheduleTime("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleMessage}
              disabled={!scheduleContent.trim() || !scheduleDate || !scheduleTime || scheduleMessageMutation.isPending}
              data-testid="button-confirm-schedule"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Message Search Dialog */}
      <Dialog open={showAdvancedSearchDialog} onOpenChange={setShowAdvancedSearchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Message Search
            </DialogTitle>
            <DialogDescription>
              Search messages with filters for sender, date range, and content type
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Text</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-query"
                  placeholder="Search in messages..."
                  value={advancedSearchQuery}
                  onChange={(e) => setAdvancedSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-advanced-search-query"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-sender">Sender</Label>
                <Select value={searchSender} onValueChange={setSearchSender}>
                  <SelectTrigger id="search-sender" data-testid="select-search-sender">
                    <SelectValue placeholder="All senders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All senders</SelectItem>
                    {selectedRoom?.participants.map((p) => (
                      <SelectItem key={p.staffId} value={p.staffId}>
                        {p.staffName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search-media-type">Content Type</Label>
                <Select value={searchMediaType} onValueChange={setSearchMediaType}>
                  <SelectTrigger id="search-media-type" data-testid="select-search-media-type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="text">Text only</SelectItem>
                    <SelectItem value="media">Media (images, videos, voice)</SelectItem>
                    <SelectItem value="files">Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-date-from">From Date</Label>
                <Input
                  id="search-date-from"
                  type="date"
                  value={searchDateFrom}
                  onChange={(e) => setSearchDateFrom(e.target.value)}
                  data-testid="input-search-date-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-date-to">To Date</Label>
                <Input
                  id="search-date-to"
                  type="date"
                  value={searchDateTo}
                  onChange={(e) => setSearchDateTo(e.target.value)}
                  data-testid="input-search-date-to"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleAdvancedSearch}
                disabled={isSearching}
                className="flex-1"
                data-testid="button-run-search"
              >
                {isSearching ? (
                  <>Searching...</>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearAdvancedSearchFilters}
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            </div>

            {/* Search Results */}
            {advancedSearchResults.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Found {advancedSearchResults.length} messages</Label>
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-2">
                    {advancedSearchResults.map((msg) => (
                      <div 
                        key={msg.id}
                        className="flex items-start gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => jumpToMessage(msg.id)}
                        data-testid={`search-result-${msg.id}`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {msg.senderName?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{msg.senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {msg.content || (msg.messageType !== "text" ? `[${msg.messageType}]` : "")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {advancedSearchResults.length === 0 && advancedSearchQuery && !isSearching && (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Templates Management Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={(open) => {
        setShowTemplatesDialog(open);
        if (!open) {
          setEditingTemplateId(null);
          setNewTemplateName("");
          setNewTemplateContent("");
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Message Templates
            </DialogTitle>
            <DialogDescription>
              Create and manage reusable message templates for quick responses
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Add/Edit Template Form */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {editingTemplateId ? "Edit Template" : "New Template"}
                </Label>
                {editingTemplateId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setNewTemplateName("");
                      setNewTemplateContent("");
                    }}
                    className="h-7 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel Edit
                  </Button>
                )}
              </div>
              <Input
                placeholder="Template name (e.g., 'Greeting')"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                data-testid="input-template-name"
              />
              <Textarea
                placeholder="Template content (e.g., 'Hello! How can I help you today?')"
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-template-content"
              />
              <Button
                onClick={saveTemplate}
                disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                className="w-full"
                data-testid="button-save-template"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingTemplateId ? "Update Template" : "Save Template"}
              </Button>
            </div>
            
            {/* Templates List */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Your Templates ({templates.length})</Label>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-start gap-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                        data-testid={`template-${template.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {template.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => editTemplate(template)}
                            data-testid={`edit-template-${template.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteTemplate(template.id)}
                            data-testid={`delete-template-${template.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {templates.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <FileCode className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No templates yet</p>
                <p className="text-sm">Create templates for messages you send frequently</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
