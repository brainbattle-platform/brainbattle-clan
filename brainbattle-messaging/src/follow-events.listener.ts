import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ThreadsService } from './threads/threads.service';
import { CoreClient } from './core/core.client';

@Injectable()
export class FollowEventsListener implements OnModuleInit {
  private subscriber: Redis;

  constructor(
    private readonly threadsService: ThreadsService,
    private readonly coreClient: CoreClient,
  ) {
    // reuse same redis URL as RL service
    const redisUrl = process.env.REDIS_URL ?? 'redis://redis:6379';
    this.subscriber = new Redis(redisUrl);
  }

  onModuleInit() {
    this.subscriber.subscribe('core.follow.events', () => {
      console.log('[Messaging] Listening to core.follow.events');
    });

    this.subscriber.on('message', async (_, message) => {
      try {
        const event = JSON.parse(message);

        // 1) FOLLOW EVENT
        if (event.event === 'user.followed') {
          const { followerId, followeeId } = event.data;

          // Ask core if mutual follow
          const result = await this.coreClient.isMutual(followerId, followeeId);

          if (result.mutual) {
            await this.threadsService.createOneToOneIfNotExists(
              followerId,
              followeeId,
            );
          }
        }

        // 2) UNFOLLOW EVENT
        if (event.event === 'user.unfollowed') {
          const { followerId, unfollowedId } = event.data;

          await this.threadsService.disableOneToOneThread(
            followerId,
            unfollowedId,
          );
        }
      } catch (err) {
        console.error('Error processing follow event:', err);
      }
    });
  }
}
