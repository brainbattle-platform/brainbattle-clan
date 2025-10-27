// src/gateway/chat.gateway.ts
import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtWsGuard } from '../common/jwt.ws-guard';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../rate/rl.service';
import { Prisma } from '@prisma/client';

// CHỈ import kiểu cho isolatedModules
import type { AuthSocket, JoinPayload, SendMessagePayload, TypingPayload } from './chat.types';

const mapKind = (k?: string) => { switch ((k ?? 'text').toLowerCase()) { case 'image': return 'IMAGE'; case 'video': return 'VIDEO'; case 'file': return 'FILE'; case 'system': return 'SYSTEM'; default: return 'TEXT'; } };

@WebSocketGateway({ namespace: '/dm', cors: { origin: true, credentials: true } })
@UseGuards(JwtWsGuard)
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() io!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rl: RateLimitService,
  ) {}

  // Kết nối mới: set presence
  async handleConnection(client: AuthSocket) {
    const uid = client.user?.id;
    if (!uid) return; // guard sẽ reject từ trước, đây để an toàn
    await this.rl.setPresence(uid, true);
    client.on('disconnect', async () => {
      await this.rl.setPresence(uid, false);
    });
  }

  // Tham gia 1 thread (room)
  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: JoinPayload,
  ) {
    const uid = client.user!.id;
    const { threadId } = payload;

    const part = await this.prisma.dMParticipant.findUnique({
      where: { threadId_userId: { threadId, userId: uid } },
    });
    if (!part) {
      client.emit('system.error', { code: 'NOT_PARTICIPANT' });
      return;
    }

    client.join(`thread:${threadId}`);
    client.emit('joined', { threadId });
  }

  // Rời room
  @SubscribeMessage('leave')
  async leave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: JoinPayload,
  ) {
    client.leave(`thread:${payload.threadId}`);
    client.emit('left', { threadId: payload.threadId });
  }

  // Typing indicator
  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() p: TypingPayload,
  ) {
    const uid = client.user!.id;
    client.to(`thread:${p.threadId}`).emit('typing', {
      userId: uid,
      isTyping: p.isTyping,
    });
  }

  // Gửi tin nhắn
  @SubscribeMessage('message.send')
  async send(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() p: SendMessagePayload,
  ) {
    const uid = client.user!.id;

    // Rate-limit theo user + thread
    const bucket = `thread:${p.threadId}`;
    if (!(await this.rl.allow(uid, bucket))) {
      client.emit('system.error', { code: 'RATE_LIMITED' });
      return;
    }

    // Phải là participant
    const ok = await this.prisma.dMParticipant.findUnique({
      where: { threadId_userId: { threadId: p.threadId, userId: uid } },
    });
    if (!ok) {
      client.emit('system.error', { code: 'NOT_PARTICIPANT' });
      return;
    }

    // Lưu message
    const msg = await this.prisma.dMMessage.create({
      data: {
        threadId: p.threadId,
        senderId: uid,
        kind: mapKind(p.kind),
        content: p.content ?? null,
        attachment: p.attachment ?? null,
      },
    });

    const room = `thread:${p.threadId}`;
    // Fan-out message + delivered receipt
    this.io.to(room).emit('message.new', {
      message: msg,
      clientMsgId: p.clientMsgId,
    });
    this.io.to(room).emit('receipt.delivered', {
      threadId: p.threadId,
      messageId: msg.id,
      senderId: uid,
    });
  }

  // Đánh dấu đọc
  @SubscribeMessage('message.read')
  async markRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { threadId: string; messageId: string },
  ) {
    const uid = client.user!.id;

    await this.prisma.dMParticipant.update({
      where: { threadId_userId: { threadId: payload.threadId, userId: uid } },
      data: { lastReadId: payload.messageId },
    });

    client.to(`thread:${payload.threadId}`).emit('receipt.read', {
      userId: uid,
      messageId: payload.messageId,
    });
  }
}
