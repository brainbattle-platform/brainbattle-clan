import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AnyCoreEvent, BB_EVENT_CHANNEL } from './core-events';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class CoreEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(CoreEventConsumer.name);

  constructor(
    @Inject('REDIS_SUBSCRIBER') private readonly sub: Redis,
    private readonly conversations: ConversationsService,
  ) {}

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
    switch (evt.type) {
      case 'social.follow.mutual': {
        const { userAId, userBId } = evt.data;
        await this.conversations.ensureDmForUsers(userAId, userBId);
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

      default:
        return;
    }
  }
}
