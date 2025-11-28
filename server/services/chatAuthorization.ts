import { storage } from "../storage";
import type { ChatRoom, ChatRoomParticipant, Staff } from "@shared/schema";

export type ChatAction = 
  | "view_room" 
  | "send_message" 
  | "delete_own_message"
  | "delete_any_message"
  | "edit_message"
  | "upload_media"
  | "forward_message"
  | "reply_to_message"
  | "lock_room"
  | "unlock_room"
  | "archive_room"
  | "unarchive_room"
  | "delete_room"
  | "manage_participants"
  | "view_audit_log"
  | "create_direct_chat"
  | "create_group_chat";

export type ChatPermissionResult = {
  allowed: boolean;
  reason?: string;
  requiresRoomAccess?: boolean;
  requiresAdmin?: boolean;
};

export type UserContext = {
  userId: string;
  userName: string;
  roles: string[];
  email?: string;
};

const ADMIN_ROLES = [
  "admin", 
  "super_admin", 
  "director", 
  "operations_manager", 
  "clinical_manager",
  "senior_manager",
  "regional_manager",
  "compliance_officer"
];
const MANAGER_ROLES = [
  "admin", 
  "super_admin", 
  "director", 
  "operations_manager", 
  "clinical_manager",
  "senior_manager",
  "regional_manager",
  "compliance_officer",
  "manager", 
  "team_leader",
  "case_manager",
  "service_manager"
];

export class ChatAuthorizationService {
  // Public helper to check if user has admin or manager privileges
  isPrivilegedUser(user: UserContext): boolean {
    return this.hasManagerRole(user.roles);
  }

  async checkPermission(
    action: ChatAction,
    user: UserContext,
    roomId?: string,
    targetMessageId?: string
  ): Promise<ChatPermissionResult> {
    const isAdmin = this.hasAdminRole(user.roles);
    const isManager = this.hasManagerRole(user.roles);

    switch (action) {
      case "view_room":
        return this.checkViewRoom(user, roomId);

      case "send_message":
        return this.checkSendMessage(user, roomId);

      case "delete_own_message":
        return this.checkDeleteOwnMessage(user, roomId, targetMessageId);

      case "delete_any_message":
        return this.checkDeleteAnyMessage(user, roomId);

      case "edit_message":
        return this.checkEditMessage(user, roomId, targetMessageId);

      case "upload_media":
        return this.checkUploadMedia(user, roomId);

      case "forward_message":
        return this.checkForwardMessage(user, roomId, targetMessageId);

      case "reply_to_message":
        return this.checkReplyToMessage(user, roomId);

      case "lock_room":
      case "unlock_room":
        return this.checkLockUnlockRoom(user, roomId);

      case "archive_room":
      case "unarchive_room":
        return this.checkArchiveRoom(user, roomId);

      case "delete_room":
        return this.checkDeleteRoom(user, roomId);

      case "manage_participants":
        return this.checkManageParticipants(user, roomId);

      case "view_audit_log":
        return this.checkViewAuditLog(user, roomId);

      case "create_direct_chat":
        return this.checkCreateDirectChat(user);

      case "create_group_chat":
        return this.checkCreateGroupChat(user);

      default:
        return { allowed: false, reason: "Unknown action" };
    }
  }

  private hasAdminRole(roles: string[]): boolean {
    return roles.some(role => ADMIN_ROLES.includes(role));
  }

  private hasManagerRole(roles: string[]): boolean {
    return roles.some(role => MANAGER_ROLES.includes(role));
  }

  private async getRoomContext(roomId: string): Promise<{
    room: ChatRoom | undefined;
    isLocked: boolean;
    isArchived: boolean;
    isDeleted: boolean;
  }> {
    const room = await storage.getChatRoomById(roomId);
    return {
      room,
      isLocked: room?.isLocked === "yes",
      isArchived: room?.isArchived === "yes",
      isDeleted: (room as any)?.isDeleted === "yes" || (room as any)?.status === "deleted"
    };
  }

  private async isParticipant(roomId: string, userId: string): Promise<boolean> {
    return storage.isRoomParticipant(roomId, userId);
  }

  private async isRoomAdmin(roomId: string, userId: string): Promise<boolean> {
    return storage.isRoomAdmin(roomId, userId);
  }

  private async checkViewRoom(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    if (this.hasAdminRole(user.roles)) {
      return { allowed: true };
    }

    const { room, isDeleted } = await this.getRoomContext(roomId);
    if (!room) {
      return { allowed: false, reason: "Room not found" };
    }

    if (isDeleted) {
      return { allowed: false, reason: "Room has been deleted" };
    }

    const isParticipant = await this.isParticipant(roomId, user.userId);
    if (!isParticipant) {
      return { 
        allowed: false, 
        reason: "You are not a participant in this room",
        requiresRoomAccess: true
      };
    }

    return { allowed: true };
  }

  private async checkSendMessage(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    const { room, isLocked, isArchived, isDeleted } = await this.getRoomContext(roomId);
    if (!room) {
      return { allowed: false, reason: "Room not found" };
    }

    if (isDeleted) {
      return { allowed: false, reason: "Cannot send messages to a deleted room" };
    }

    if (isArchived) {
      return { allowed: false, reason: "Cannot send messages to an archived room" };
    }

    if (isLocked) {
      if (this.hasAdminRole(user.roles)) {
        return { allowed: true };
      }
      return { allowed: false, reason: "This room is locked for messaging" };
    }

    const isParticipant = await this.isParticipant(roomId, user.userId);
    if (!isParticipant && !this.hasAdminRole(user.roles)) {
      return { 
        allowed: false, 
        reason: "You are not a participant in this room",
        requiresRoomAccess: true
      };
    }

    return { allowed: true };
  }

  private async checkDeleteOwnMessage(
    user: UserContext, 
    roomId?: string, 
    messageId?: string
  ): Promise<ChatPermissionResult> {
    if (!roomId || !messageId) {
      return { allowed: false, reason: "Room ID and Message ID are required" };
    }

    const { isDeleted } = await this.getRoomContext(roomId);
    if (isDeleted) {
      return { allowed: false, reason: "Cannot modify messages in a deleted room" };
    }

    const message = await storage.getChatMessageById(messageId);
    if (!message) {
      return { allowed: false, reason: "Message not found" };
    }

    if (message.senderId !== user.userId) {
      return { 
        allowed: false, 
        reason: "You can only delete your own messages",
        requiresAdmin: true
      };
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const maxDeleteWindow = 24 * 60 * 60 * 1000;

    if (messageAge > maxDeleteWindow) {
      return { 
        allowed: false, 
        reason: "Messages can only be deleted within 24 hours of sending" 
      };
    }

    return { allowed: true };
  }

  private async checkDeleteAnyMessage(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!this.hasAdminRole(user.roles)) {
      return { 
        allowed: false, 
        reason: "Only administrators can delete any message",
        requiresAdmin: true
      };
    }

    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    const { isDeleted } = await this.getRoomContext(roomId);
    if (isDeleted) {
      return { allowed: false, reason: "Cannot modify messages in a deleted room" };
    }

    return { allowed: true };
  }

  private async checkEditMessage(
    user: UserContext, 
    roomId?: string, 
    messageId?: string
  ): Promise<ChatPermissionResult> {
    if (!roomId || !messageId) {
      return { allowed: false, reason: "Room ID and Message ID are required" };
    }

    const { isLocked, isArchived, isDeleted } = await this.getRoomContext(roomId);
    if (isDeleted) {
      return { allowed: false, reason: "Cannot edit messages in a deleted room" };
    }

    if (isArchived) {
      return { allowed: false, reason: "Cannot edit messages in an archived room" };
    }

    if (isLocked && !this.hasAdminRole(user.roles)) {
      return { allowed: false, reason: "Cannot edit messages in a locked room" };
    }

    const message = await storage.getChatMessageById(messageId);
    if (!message) {
      return { allowed: false, reason: "Message not found" };
    }

    if (message.senderId !== user.userId) {
      return { 
        allowed: false, 
        reason: "You can only edit your own messages" 
      };
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const maxEditWindow = 15 * 60 * 1000;

    if (messageAge > maxEditWindow) {
      return { 
        allowed: false, 
        reason: "Messages can only be edited within 15 minutes of sending" 
      };
    }

    return { allowed: true };
  }

  private async checkUploadMedia(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    return this.checkSendMessage(user, roomId);
  }

  private async checkForwardMessage(
    user: UserContext, 
    sourceRoomId?: string, 
    targetRoomId?: string
  ): Promise<ChatPermissionResult> {
    if (!sourceRoomId) {
      return { allowed: false, reason: "Source room ID is required" };
    }

    const sourceCheck = await this.checkViewRoom(user, sourceRoomId);
    if (!sourceCheck.allowed) {
      return { 
        allowed: false, 
        reason: `Cannot forward from source room: ${sourceCheck.reason}` 
      };
    }

    if (targetRoomId) {
      const targetCheck = await this.checkSendMessage(user, targetRoomId);
      if (!targetCheck.allowed) {
        return { 
          allowed: false, 
          reason: `Cannot forward to target room: ${targetCheck.reason}` 
        };
      }
    }

    return { allowed: true };
  }

  private async checkReplyToMessage(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    return this.checkSendMessage(user, roomId);
  }

  private async checkLockUnlockRoom(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!this.hasAdminRole(user.roles)) {
      return { 
        allowed: false, 
        reason: "Only administrators can lock/unlock rooms",
        requiresAdmin: true
      };
    }

    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    const { room, isDeleted } = await this.getRoomContext(roomId);
    if (!room) {
      return { allowed: false, reason: "Room not found" };
    }

    if (isDeleted) {
      return { allowed: false, reason: "Cannot modify a deleted room" };
    }

    return { allowed: true };
  }

  private async checkArchiveRoom(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!this.hasManagerRole(user.roles)) {
      const isRoomAdminCheck = roomId ? await this.isRoomAdmin(roomId, user.userId) : false;
      if (!isRoomAdminCheck) {
        return { 
          allowed: false, 
          reason: "Only managers, administrators, or room admins can archive/unarchive rooms",
          requiresAdmin: true
        };
      }
    }

    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    const { room, isDeleted } = await this.getRoomContext(roomId);
    if (!room) {
      return { allowed: false, reason: "Room not found" };
    }

    if (isDeleted) {
      return { allowed: false, reason: "Cannot modify a deleted room" };
    }

    return { allowed: true };
  }

  private async checkDeleteRoom(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!this.hasAdminRole(user.roles)) {
      return { 
        allowed: false, 
        reason: "Only administrators can delete rooms",
        requiresAdmin: true
      };
    }

    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    const { room } = await this.getRoomContext(roomId);
    if (!room) {
      return { allowed: false, reason: "Room not found" };
    }

    return { allowed: true };
  }

  private async checkManageParticipants(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!roomId) {
      return { allowed: false, reason: "Room ID is required" };
    }

    const { room, isLocked, isArchived, isDeleted } = await this.getRoomContext(roomId);
    if (!room) {
      return { allowed: false, reason: "Room not found" };
    }

    if (isDeleted) {
      return { allowed: false, reason: "Cannot modify a deleted room" };
    }

    if (isArchived) {
      return { allowed: false, reason: "Cannot modify participants in an archived room" };
    }

    if (room.type === "client") {
      return { 
        allowed: false, 
        reason: "Client chat participants are managed automatically through staff assignments" 
      };
    }

    if (this.hasAdminRole(user.roles)) {
      return { allowed: true };
    }

    const isRoomAdminCheck = await this.isRoomAdmin(roomId, user.userId);
    if (isRoomAdminCheck) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: "Only room admins or system administrators can manage participants",
      requiresAdmin: true
    };
  }

  private async checkViewAuditLog(user: UserContext, roomId?: string): Promise<ChatPermissionResult> {
    if (!this.hasManagerRole(user.roles)) {
      return { 
        allowed: false, 
        reason: "Only managers and administrators can view audit logs",
        requiresAdmin: true
      };
    }

    return { allowed: true };
  }

  private async checkCreateDirectChat(user: UserContext): Promise<ChatPermissionResult> {
    return { allowed: true };
  }

  private async checkCreateGroupChat(user: UserContext): Promise<ChatPermissionResult> {
    return { allowed: true };
  }

  async canAccessClientChat(userId: string, userRoles: string[], clientId: string): Promise<boolean> {
    if (this.hasAdminRole(userRoles)) {
      return true;
    }

    const clientRoom = await storage.getClientChatRoom(clientId);
    if (!clientRoom) {
      return false;
    }

    return this.isParticipant(clientRoom.id, userId);
  }

  async hasClientAssignment(userId: string, clientId: string): Promise<boolean> {
    const assignments = await storage.getAssignmentsByClient(clientId);
    return assignments.some((a: { staffId: string }) => a.staffId === userId);
  }

  async getAccessibleClientIds(userId: string, userRoles: string[]): Promise<string[]> {
    if (this.hasAdminRole(userRoles) || this.hasManagerRole(userRoles)) {
      const clients = await storage.getActiveClients();
      return clients.map(c => c.id);
    }

    const rooms = await storage.getChatRooms(userId);
    const clientRooms = rooms.filter(r => r.type === "client" && r.clientId);
    return clientRooms.map(r => r.clientId as string);
  }

  async validateMediaUpload(
    user: UserContext, 
    roomId: string, 
    fileSize: number, 
    mimeType: string
  ): Promise<ChatPermissionResult> {
    const baseCheck = await this.checkUploadMedia(user, roomId);
    if (!baseCheck.allowed) {
      return baseCheck;
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(mimeType)) {
      return { 
        allowed: false, 
        reason: `File type ${mimeType} is not allowed. Allowed types: JPEG, PNG, GIF, WebP, MP4, WebM, MOV` 
      };
    }

    const isImage = allowedImageTypes.includes(mimeType);
    const isVideo = allowedVideoTypes.includes(mimeType);

    const maxImageSize = 15 * 1024 * 1024;
    const maxVideoSize = 60 * 1024 * 1024;

    if (isImage && fileSize > maxImageSize) {
      return { 
        allowed: false, 
        reason: `Image size exceeds limit. Maximum allowed: 15MB` 
      };
    }

    if (isVideo && fileSize > maxVideoSize) {
      return { 
        allowed: false, 
        reason: `Video size exceeds limit. Maximum allowed: 60MB` 
      };
    }

    return { allowed: true };
  }
}

export const chatAuthorizationService = new ChatAuthorizationService();
