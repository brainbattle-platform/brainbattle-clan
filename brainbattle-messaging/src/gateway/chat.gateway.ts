// src/gateway/chat.gateway.ts
import { OnGatewayInit } from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
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
import { JwtWsGuard } from '../common/jwt.ws-guard_local';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../rate/rl.service';
import { Prisma, MessageKind } from '@prisma/client';

// chỉ import kiểu (isolatedModules)
import type { AuthSocket, JoinPayload, SendMessagePayload, TypingPayload } from './chat.types';

const mapKind = (k?: string): MessageKind => {
  switch ((k ?? 'text').toLowerCase()) {
    case 'image': return MessageKind.IMAGE;
    case 'video': return MessageKind.VIDEO;
    case 'file': return MessageKind.FILE;
    case 'system': return MessageKind.SYSTEM;
    default: return MessageKind.TEXT;
  }
};


@WebSocketGateway({ namespace: '/dm', cors: { origin: true, credentials: true } })
@UseGuards(JwtWsGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() io!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rl: RateLimitService,
  ) { }

  // Presence
  async handleConnection(client: AuthSocket) {
    const uid = client.user?.id;
    if (!uid) return;
    await this.rl.setPresence(uid, true);
    client.on('disconnect', async () => {
      await this.rl.setPresence(uid, false);
    });
  }

  // Join thread room
  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: JoinPayload) {
    const uid = client.user!.id;
    const { threadId } = payload;

    const part = await this.prisma.dMParticipant.findUnique({
      where: { threadId_userId: { threadId, userId: uid } },
    });
    if (!part) return client.emit('system.error', { code: 'NOT_PARTICIPANT' });

    client.join(`thread:${threadId}`);
    client.emit('joined', { threadId, serverTime: Date.now() });
  }

  // Leave thread room
  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: JoinPayload) {
    client.leave(`thread:${payload.threadId}`);
    client.emit('left', { threadId: payload.threadId, serverTime: Date.now() });
  }

  // Typing
  @SubscribeMessage('typing')
  async typing(@ConnectedSocket() client: AuthSocket, @MessageBody() p: TypingPayload) {
    const uid = client.user!.id;
    client.to(`thread:${p.threadId}`).emit('typing', { userId: uid, isTyping: p.isTyping, serverTime: Date.now() });
  }

  // Send message (+ delivered receipts)
  @SubscribeMessage('message.send')
  async send(@ConnectedSocket() client: AuthSocket, @MessageBody() p: SendMessagePayload) {
    const uid = client.user!.id;

    // Rate-limit per user/thread
    if (!(await this.rl.allow(uid, `thread:${p.threadId}`))) {
      return client.emit('system.error', { code: 'RATE_LIMITED' });
    }

    // Must be participant
    const ok = await this.prisma.dMParticipant.findUnique({
      where: { threadId_userId: { threadId: p.threadId, userId: uid } },
    });
    if (!ok) return client.emit('system.error', { code: 'NOT_PARTICIPANT' });

    // Basic payload validation: text phải có content; media/file cần attachment
    const k = mapKind(p.kind);
    if (k === MessageKind.TEXT && !p.content?.trim()) {
      return client.emit('system.error', { code: 'EMPTY_TEXT' });
    }
    if (k !== MessageKind.TEXT && !p.attachment) {
      return client.emit('system.error', { code: 'MISSING_ATTACHMENT' });
    }

    // Save message
    const msg = await this.prisma.dMMessage.create({
      data: {
        threadId: p.threadId,
        senderId: uid,
        kind: k,
        content: p.content ?? null,
        attachment: p.attachment ?? null,
      },
    });

    const room = `thread:${p.threadId}`;

    // Create delivered receipts for all other participants
    const participants = await this.prisma.dMParticipant.findMany({
      where: { threadId: p.threadId },
      select: { userId: true },
    });
    const others = participants.filter(u => u.userId !== uid);
    if (others.length) {
      await this.prisma.dMReceipt.createMany({
        data: others.map(o => ({ messageId: msg.id, userId: o.userId })),
        skipDuplicates: true,
      });
    }

    // Broadcast message + delivered event
    this.io.to(room).emit('message.new', { message: msg, clientMsgId: p.clientMsgId, serverTime: Date.now() });
    this.io.to(room).emit('receipt.delivered', { threadId: p.threadId, messageId: msg.id, senderId: uid, serverTime: Date.now() });
  }

  // Mark read (update participant checkpoint + receipt.readAt)
  @SubscribeMessage('message.read')
  async markRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { threadId: string; messageId: string },
  ) {
    const uid = client.user!.id;

    // Ensure participant
    const part = await this.prisma.dMParticipant.findUnique({
      where: { threadId_userId: { threadId: payload.threadId, userId: uid } },
      select: { userId: true },
    });
    if (!part) return client.emit('system.error', { code: 'NOT_PARTICIPANT' });

    // Update lastReadId checkpoint
    await this.prisma.dMParticipant.update({
      where: { threadId_userId: { threadId: payload.threadId, userId: uid } },
      data: { lastReadId: payload.messageId },
    });

    // Upsert read receipt
    await this.prisma.dMReceipt.upsert({
      where: { messageId_userId: { messageId: payload.messageId, userId: uid } },
      update: { readAt: new Date() },
      create: { messageId: payload.messageId, userId: uid, readAt: new Date() },
    });

    client.to(`thread:${payload.threadId}`).emit('receipt.read', {
      userId: uid,
      messageId: payload.messageId,
      serverTime: Date.now(),
    });
  }

  @SubscribeMessage('message.update')
  async wsEdit(@ConnectedSocket() client: AuthSocket, @MessageBody() p: { messageId: string; content: string }) {
    const uid = client.user!.id;
    const msg = await this.prisma.dMMessage.findUnique({ where: { id: p.messageId } });
    if (!msg) return client.emit('system.error', { code: 'NOT_FOUND' });
    if (msg.senderId !== uid) return client.emit('system.error', { code: 'NOT_PERMITTED' });
    if (msg.deletedAt) return client.emit('system.error', { code: 'DELETED' });

    const updated = await this.prisma.dMMessage.update({
      where: { id: msg.id },
      data: { content: p.content, editedAt: new Date() },
    });
    this.io.to(`thread:${msg.threadId}`).emit('message.updated', { message: updated, serverTime: Date.now() });
  }

  @SubscribeMessage('message.delete')
  async wsDelete(@ConnectedSocket() client: AuthSocket, @MessageBody() p: { messageId: string }) {
    const uid = client.user!.id;
    const msg = await this.prisma.dMMessage.findUnique({ where: { id: p.messageId } });
    if (!msg) return client.emit('system.error', { code: 'NOT_FOUND' });
    if (msg.senderId !== uid) return client.emit('system.error', { code: 'NOT_PERMITTED' });

    const deleted = await this.prisma.dMMessage.update({
      where: { id: msg.id },
      data: {
        deletedAt: new Date(),
        deletedBy: uid,
        content: null,
        attachment: Prisma.DbNull,   // ⬅️ thay vì null
      },
    });
    this.io.to(`thread:${msg.threadId}`).emit('message.deleted', {
      id: deleted.id, threadId: msg.threadId, serverTime: Date.now()
    });

  }

  // thêm lifecycle afterInit
  async afterInit(server: Server) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6381';
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    server.adapter(createAdapter(pubClient, subClient));
    // (tuỳ chọn) log:
    // console.log('[WS] Redis adapter attached');
  }

}
