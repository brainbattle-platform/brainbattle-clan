import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeEmitter {
  private server?: Server;

  bind(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToConversation(conversationId: string, event: string, payload: any) {
    this.server?.to(conversationId).emit(event, payload);
  }
}
