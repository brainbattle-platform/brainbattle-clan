// src/gateway/chat.types.ts
import { Socket } from 'socket.io';

export interface AuthSocket extends Socket {
  user?: { id: string; email?: string };
}

export type SendMessagePayload = {
  threadId: string;
  kind?: 'text'|'image'|'video'|'file'|'system';
  content?: string;
  attachment?: any;
  clientMsgId?: string;
};
export type JoinPayload = { threadId: string };
export type TypingPayload = { threadId: string; isTyping: boolean };
