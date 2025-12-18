import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_PUBLISHER') private readonly redisPublisher: Redis,
  ) {}

  async follow(me: string, userId: string) {
    if (me === userId) throw new BadRequestException('cannot follow self');

    const exists = await this.prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: me, followeeId: userId } },
    });
    if (exists) return { ok: true };

    await this.prisma.follow.create({
      data: { followerId: me, followeeId: userId },
    });

    await this.redisPublisher.publish(
      'core.follow.events',
      JSON.stringify({
        event: 'user.followed',
        data: {
          followerId: me,
          followeeId: userId,
          followedAt: new Date().toISOString(),
        },
      }),
    );

    return { ok: true };
  }

  async unfollow(me: string, userId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId: me, followeeId: userId },
    });

    await this.redisPublisher.publish(
      'core.follow.events',
      JSON.stringify({
        event: 'user.unfollowed',
        data: {
          followerId: me,
          unfollowedId: userId,
        },
      }),
    );

    return { ok: true };
  }

  async isMutual(me: string, userId: string) {
    const a = await this.prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: me, followeeId: userId } },
    });
    const b = await this.prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: userId, followeeId: me } },
    });

    return { mutual: !!(a && b) };
  }

  async block(me: string, userId: string) {
    await this.prisma.block.create({
      data: { blockerId: me, blockeeId: userId },
    });
    return { ok: true };
  }

  async unblock(me: string, userId: string) {
    await this.prisma.block.delete({
      where: { blockerId_blockeeId: { blockerId: me, blockeeId: userId } },
    });
    return { ok: true };
  }

  async isBlocked(a: string, b: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockeeId: b },
          { blockerId: b, blockeeId: a },
        ],
      },
    });
    return !!block;
  }
}
