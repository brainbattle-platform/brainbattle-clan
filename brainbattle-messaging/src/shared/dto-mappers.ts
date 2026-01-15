/**
 * Frontend DTOs matching Flutter api_contract.md
 */

export interface UserLiteDto {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  isActiveNow?: boolean;
  lastActiveAt?: string; // ISO8601
}

export interface AttachmentDto {
  id: string;
  type: 'image' | 'file' | 'link';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  sizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
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
 * Convert a date value to ISO8601 string in Vietnam timezone (UTC+7)
 * Example: 2026-01-14T22:20:20.661+07:00
 */
export function toVietnamISOString(value: Date | string | number | undefined | null): string {
  if (!value) return new Date(0).toISOString().replace('Z', '+07:00');
  const date = value instanceof Date ? value : new Date(value);
  const offsetMs = 7 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + offsetMs);
  return local.toISOString().replace('Z', '+07:00');
}

/**
 * Map user to UserLiteDto
 */
export function toUserLiteDto(user: any): UserLiteDto {
  const id = user.id || user.userId;
  const displayName = user.displayName || user.name || user.username || id;
  return {
    id,
    handle: user.handle || id,
    displayName,
    avatarUrl: user.avatarUrl,
    isActiveNow: user.isActiveNow,
    lastActiveAt: user.lastActiveAt
      ? toVietnamISOString(user.lastActiveAt)
      : undefined,
  };
}

/**
 * Map attachment to AttachmentDto
 */
export function toAttachmentDto(att: any): AttachmentDto {
  let type: 'image' | 'file' | 'link' = 'file';
  if (att.kind === 'image') type = 'image';
  else if (att.kind === 'link') type = 'link';

  return {
    id: att.id,
    type,
    url: att.url || att.objectKey,
    thumbnailUrl: att.thumbnailUrl || undefined,
    fileName: att.fileName || undefined,
    sizeBytes: att.size ?? att.sizeBytes ?? undefined,
    mimeType: att.mime || att.mimeType || undefined,
    width: att.width,
    height: att.height,
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
    createdAt: toVietnamISOString(msg.createdAt),
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
    lastMessageAt: toVietnamISOString(params.lastMessageAt),
    unreadCount: params.unreadCount,
    avatarUrl: params.avatarUrl,
    seenBySummary: params.seenBySummary,
  };
}
