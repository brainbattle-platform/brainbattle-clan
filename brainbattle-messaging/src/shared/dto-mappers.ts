/**
 * Frontend DTOs matching Flutter api_contract.md
 */

export interface UserLiteDto {
  id: string;
  name: string;
  avatarUrl?: string;
  isActiveNow?: boolean;
  lastActiveAt?: string; // ISO8601
}

export interface AttachmentDto {
  id: string;
  type: 'image' | 'file' | 'link' | 'video';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface MessageDto {
  id: string;
  sender: UserLiteDto;
  text?: string;
  attachments: AttachmentDto[];
  createdAt: string; // ISO8601
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy: string[];
}

export interface ThreadDto {
  id: string;
  title: string;
  isClan: boolean;
  memberCount: number;
  participants: UserLiteDto[];
  lastMessagePreview: string;
  lastMessageAt: string; // ISO8601
  unreadCount: number;
  avatarUrl?: string;
  seenBySummary?: string;
}

/**
 * Map user to UserLiteDto
 */
export function toUserLiteDto(user: any): UserLiteDto {
  return {
    id: user.id || user.userId,
    name: user.name || user.username || `User ${(user.id || '').slice(0, 4)}`,
    avatarUrl: user.avatarUrl,
    isActiveNow: user.isActiveNow,
    lastActiveAt: user.lastActiveAt
      ? typeof user.lastActiveAt === 'string'
        ? user.lastActiveAt
        : user.lastActiveAt.toISOString()
      : undefined,
  };
}

/**
 * Map attachment to AttachmentDto
 */
export function toAttachmentDto(att: any): AttachmentDto {
  return {
    id: att.id,
    type: att.type || 'file',
    url: att.url,
    thumbnailUrl: att.thumbnailUrl,
    fileName: att.fileName,
    sizeBytes: att.sizeBytes,
    mimeType: att.mimeType,
  };
}

/**
 * Map message to MessageDto
 */
export function toMessageDto(msg: any, sender?: any, readBy: string[] = []): MessageDto {
  const senderData = msg.sender || sender || { id: msg.senderId, name: 'Unknown' };

  return {
    id: msg.id,
    sender: toUserLiteDto(senderData),
    text: msg.content || msg.text,
    attachments: (msg.attachments || []).map(toAttachmentDto),
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    status: 'delivered',
    readBy,
  };
}

/**
 * Map conversation to ThreadDto
 */
export function toThreadDto(params: {
  id: string;
  title: string;
  isClan: boolean;
  memberCount: number;
  participants: any[];
  lastMessagePreview: string;
  lastMessageAt: Date | string;
  unreadCount: number;
  avatarUrl?: string;
  seenBySummary?: string;
}): ThreadDto {
  return {
    id: params.id,
    title: params.title,
    isClan: params.isClan,
    memberCount: params.memberCount,
    participants: params.participants.map(toUserLiteDto),
    lastMessagePreview: params.lastMessagePreview,
    lastMessageAt:
      params.lastMessageAt instanceof Date
        ? params.lastMessageAt.toISOString()
        : params.lastMessageAt,
    unreadCount: params.unreadCount,
    avatarUrl: params.avatarUrl,
    seenBySummary: params.seenBySummary,
  };
}
