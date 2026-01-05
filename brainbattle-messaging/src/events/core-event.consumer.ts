import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AnyCoreEvent, BB_EVENT_CHANNEL } from './core-events';
import { ConversationsService } from '../conversations/conversations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEmitter } from '../realtime/realtime.emitter';

@Injectable()
export class CoreEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(CoreEventConsumer.name);

  constructor(
    @Inject('REDIS_SUBSCRIBER') private readonly sub: Redis,
    private readonly conversations: ConversationsService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeEmitter,
  ) { }

  async onModuleInit() {
    await this.sub.subscribe(BB_EVENT_CHANNEL);
    this.logger.log(`Subscribed to ${BB_EVENT_CHANNEL}`);

    this.sub.on('message', async (_channel, message) => {
      try {
        const evt = JSON.parse(message) as AnyCoreEvent;
        await this.handle(evt);
      } catch (e: any) {
        this.logger.warn(`Bad event message: ${e?.message ?? e}`);
      }
    });
  }

  private async handle(evt: AnyCoreEvent) {
    this.logger.log(
      `[EVENT] ${evt.type} from ${evt.source}`,
      JSON.stringify(evt.data),
    );
    switch (evt.type) {
      case 'social.follow.mutual': {
        const { userAId, userBId } = evt.data;

        const conversationId = await this.conversations.ensureDmForUsers(userAId, userBId);

        const notiA = await this.notifications.create(userAId, 'MUTUAL_FOLLOW', {
          peerId: userBId,
          conversationId,
        });
        this.realtime.emitToUser(userAId, 'notification.new', notiA);

        this.realtime.emitToUser(userAId, 'dm.ready', { conversationId, peerId: userBId });
        this.realtime.emitToUser(userBId, 'dm.ready', { conversationId, peerId: userAId });

        return;
      }


      case 'clan.created': {
        const { clanId, leaderId } = evt.data;
        await this.conversations.ensureClanConversation(clanId, leaderId);
        return;
      }

      case 'clan.member.joined': {
        const { clanId, userId } = evt.data;
        await this.conversations.upsertClanMember(clanId, userId);
        return;
      }

      case 'clan.member.left': {
        const { clanId, userId } = evt.data;
        await this.conversations.markClanMemberLeft(clanId, userId);
        return;
      }

      case 'clan.member.banned': {
        const { clanId, userId } = evt.data;
        await this.conversations.markClanMemberLeft(clanId, userId);
        return;
      }
      case 'social.follow.created': {
        const { followerId, followeeId } = evt.data;

        const noti = await this.notifications.create(
          followeeId,
          'FOLLOW_CREATED',
          { followerId },
        );

        this.realtime.emitToUser(followeeId, 'notification.new', noti);
        return;
      }


      default:
        return;
    }
  }
}
