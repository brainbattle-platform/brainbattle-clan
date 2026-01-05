import { UseGuards, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../security/ws-jwt.guard';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeEmitter } from './realtime.emitter';

type JoinPayload = { conversationId: string };
type SendPayload = { conversationId: string; content: string; tempId?: string };

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/', // default
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly messages: MessagesService,
    private readonly conversations: ConversationsService,
    private readonly realtime: RealtimeEmitter,
  ) { }

  afterInit(server: Server) {
    this.realtime.bind(server);
  }

  @UseGuards(WsJwtGuard)
  handleConnection(client: Socket) {
    const user = client.data.user;
    const userId = user?.id as string | undefined;
    this.logger.log(`socket connected: ${client.id} user=${userId}`);

    if (userId) {
      client.join(`user:${userId}`);
    }
  }


  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('conversation.join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    try {
      const me = client.data.user?.id as string;
      await this.conversations.requireMember(body.conversationId, me);
      await client.join(body.conversationId);
      return { ok: true };
    } catch (err: any) {
      const code = err?.code ?? 'error';
      const message = err?.message ?? 'Internal error';
      this.logger.warn(`[ChatGateway] conversation.join failed: ${message}`);
      return { ok: false, code, message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message.send')
  async send(@ConnectedSocket() client: Socket, @MessageBody() body: SendPayload) {
    try {
      const me = client.data.user?.id as string;
      const msg = await this.messages.send(body.conversationId, me, body.content);

      client.emit('message.ack', {
        tempId: body.tempId ?? null,
        messageId: msg.id,
        createdAt: msg.createdAt,
        conversationId: body.conversationId,
      });

      this.server.to(body.conversationId).emit('message.new', msg);
      return { ok: true, messageId: msg.id };
    } catch (err: any) {
      const code = err?.code ?? 'error';
      const message = err?.message ?? 'Internal error';
      this.logger.warn(`[ChatGateway] message.send failed: ${message}`);

      // keep success ack payload unchanged; on error send consistent negative ack
      client.emit('message.ack', {
        tempId: body.tempId ?? null,
        ok: false,
        code,
        message,
        conversationId: body.conversationId,
      });

      return { ok: false, code, message };
    }
  }

}
