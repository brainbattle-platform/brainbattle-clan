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

type SendPayload = { conversationId: string; content: string };
type JoinPayload = { conversationId: string };

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
  ) {}

  @UseGuards(WsJwtGuard)
  handleConnection(client: Socket) {
    const user = client.data.user;
    this.logger.log(`socket connected: ${client.id} user=${user?.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('conversation.join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const me = client.data.user?.id as string;
    await this.conversations.requireMember(body.conversationId, me);
    await client.join(body.conversationId);
    return { ok: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message.send')
  async send(@ConnectedSocket() client: Socket, @MessageBody() body: SendPayload) {
    const me = client.data.user?.id as string;
    const msg = await this.messages.send(body.conversationId, me, body.content);

    // Broadcast to room
    this.server.to(body.conversationId).emit('message.new', msg);
    return { ok: true, messageId: msg.id };
  }
}
