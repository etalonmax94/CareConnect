import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { storage } from "./storage";

interface WebSocketClient extends WebSocket {
  userId?: string;
  userName?: string;
  isAlive?: boolean;
}

interface ChatMessage {
  type: "message" | "typing" | "read" | "presence" | "join" | "leave";
  roomId?: string;
  content?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  userId?: string;
  isTyping?: boolean;
  status?: "online" | "offline";
}

const clients = new Map<string, Set<WebSocketClient>>();
const typingUsers = new Map<string, Set<string>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws/chat"
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WebSocketClient;
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  wss.on("connection", async (ws: WebSocketClient, req: IncomingMessage) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");
    const userName = url.searchParams.get("userName");

    if (!userId) {
      ws.close(4001, "User ID required");
      return;
    }

    ws.userId = userId;
    ws.userName = userName || "Unknown User";

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);

    broadcastPresence(userId, "online");

    ws.on("message", async (data) => {
      try {
        const message: ChatMessage = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.on("close", () => {
      const userClients = clients.get(userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          clients.delete(userId);
          broadcastPresence(userId, "offline");
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return wss;
}

async function handleMessage(ws: WebSocketClient, message: ChatMessage) {
  switch (message.type) {
    case "message":
      await handleChatMessage(ws, message);
      break;
    case "typing":
      handleTyping(ws, message);
      break;
    case "read":
      await handleReadReceipt(ws, message);
      break;
    case "join":
      await handleJoinRoom(ws, message);
      break;
    case "leave":
      handleLeaveRoom(ws, message);
      break;
  }
}

async function handleChatMessage(ws: WebSocketClient, message: ChatMessage) {
  if (!message.roomId || !message.content || !ws.userId) return;

  try {
    const chatMessage = await storage.createChatMessage({
      roomId: message.roomId,
      senderId: ws.userId,
      senderName: ws.userName || "Unknown",
      content: message.content,
      messageType: "text"
    });

    const participants = await storage.getChatRoomParticipants(message.roomId);
    
    const broadcastMessage = {
      type: "message",
      roomId: message.roomId,
      message: chatMessage
    };

    for (const participant of participants) {
      const userClients = clients.get(participant.staffId);
      if (userClients) {
        userClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(broadcastMessage));
          }
        });
      }
    }

    clearTyping(message.roomId, ws.userId);
  } catch (error) {
    console.error("Error handling chat message:", error);
    ws.send(JSON.stringify({ type: "error", message: "Failed to send message" }));
  }
}

function handleTyping(ws: WebSocketClient, message: ChatMessage) {
  if (!message.roomId || !ws.userId) return;

  const roomTyping = typingUsers.get(message.roomId) || new Set();
  
  if (message.isTyping) {
    roomTyping.add(ws.userId);
  } else {
    roomTyping.delete(ws.userId);
  }
  
  typingUsers.set(message.roomId, roomTyping);

  broadcastToRoom(message.roomId, {
    type: "typing",
    roomId: message.roomId,
    userId: ws.userId,
    userName: ws.userName,
    isTyping: message.isTyping
  }, ws.userId);
}

async function handleReadReceipt(ws: WebSocketClient, message: ChatMessage) {
  if (!message.roomId || !ws.userId) return;

  try {
    await storage.updateLastRead(message.roomId, ws.userId);
    
    broadcastToRoom(message.roomId, {
      type: "read",
      roomId: message.roomId,
      userId: ws.userId
    });
  } catch (error) {
    console.error("Error updating read receipt:", error);
  }
}

async function handleJoinRoom(ws: WebSocketClient, message: ChatMessage) {
  if (!message.roomId || !ws.userId) return;
  
  broadcastToRoom(message.roomId, {
    type: "join",
    roomId: message.roomId,
    userId: ws.userId,
    userName: ws.userName
  }, ws.userId);
}

function handleLeaveRoom(ws: WebSocketClient, message: ChatMessage) {
  if (!message.roomId || !ws.userId) return;

  clearTyping(message.roomId, ws.userId);
  
  broadcastToRoom(message.roomId, {
    type: "leave",
    roomId: message.roomId,
    userId: ws.userId,
    userName: ws.userName
  }, ws.userId);
}

function clearTyping(roomId: string, userId: string) {
  const roomTyping = typingUsers.get(roomId);
  if (roomTyping) {
    roomTyping.delete(userId);
  }
}

export async function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  try {
    const participants = await storage.getChatRoomParticipants(roomId);
    
    for (const participant of participants) {
      if (excludeUserId && participant.staffId === excludeUserId) continue;
      
      const userClients = clients.get(participant.staffId);
      if (userClients) {
        userClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    }
  } catch (error) {
    console.error("Error broadcasting to room:", error);
  }
}

function broadcastPresence(userId: string, status: "online" | "offline") {
  const message = {
    type: "presence",
    userId,
    status
  };

  clients.forEach((userClients, clientUserId) => {
    userClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
}

export function getOnlineUsers(): string[] {
  return Array.from(clients.keys());
}

export function isUserOnline(userId: string): boolean {
  return clients.has(userId) && (clients.get(userId)?.size || 0) > 0;
}

// ============================================
// NOTIFICATION BROADCASTING
// ============================================

interface NotificationPayload {
  id: string;
  type: string;
  priority?: string;
  title: string;
  message: string;
  relatedType?: string | null;
  relatedId?: string | null;
  linkUrl?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export async function broadcastNotification(userId: string, notification: NotificationPayload): Promise<boolean> {
  const userClients = clients.get(userId);
  
  if (!userClients || userClients.size === 0) {
    return false;
  }

  const message = {
    type: "notification",
    notification
  };

  let delivered = false;
  userClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      delivered = true;
    }
  });

  if (delivered) {
    try {
      await storage.markNotificationAsDelivered(notification.id, "websocket");
      // Also send updated unread count
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      broadcastUnreadCountUpdate(userId, unreadCount);
    } catch (error) {
      console.error("Error marking notification as delivered:", error);
    }
  }

  return delivered;
}

export async function broadcastNotificationToMultiple(userIds: string[], notification: NotificationPayload): Promise<number> {
  let deliveredCount = 0;
  
  for (const userId of userIds) {
    const delivered = await broadcastNotification(userId, notification);
    if (delivered) {
      deliveredCount++;
    }
  }
  
  return deliveredCount;
}

export function broadcastNotificationUpdate(userId: string, notificationId: string, update: { isRead?: string; isArchived?: string }): void {
  const userClients = clients.get(userId);
  
  if (!userClients) return;

  const message = {
    type: "notification_update",
    notificationId,
    update
  };

  userClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

export function broadcastUnreadCountUpdate(userId: string, count: number): void {
  const userClients = clients.get(userId);
  
  if (!userClients) return;

  const message = {
    type: "unread_count",
    count
  };

  userClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
