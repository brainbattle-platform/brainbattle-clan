import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoreEventEmitter } from '../events/core-event.emitter';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CoreEventEmitter,
  ) { }

  /* ================= HELPERS ================= */

  private ensureNotSelf(me: string, other: string, code: string) {
    if (me === other) throw new BadRequestException(code);
  }

  private async ensureNotBlockedEitherWay(a: string, b: string) {
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockeeId: b },
          { blockerId: b, blockeeId: a },
        ],
      },
      select: { blockerId: true },
    });
    if (blocked) throw new ForbiddenException('blocked');
  }

  private async hasFollow(a: string, b: string) {
    const row = await this.prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: a, followeeId: b } },
      select: { followerId: true },
    });
    return !!row;
  }

  private async hasBlock(a: string, b: string) {
    const row = await this.prisma.block.findUnique({
      where: { blockerId_blockeeId: { blockerId: a, blockeeId: b } },
      select: { blockerId: true },
    });
    return !!row;
  }

  /* ================= PUBLIC METHODS ================= */

  /**
   * Follow: idempotent.
   * - Nếu đã follow rồi: không emit follow.created nữa.
   * - Nếu follow tạo mới và phát hiện follow-back => emit mutual (chỉ khi "lần tạo mới" xảy ra)
   */
  async follow(me: string, userId: string) {
    this.ensureNotSelf(me, userId, 'cannot_follow_self');
    await this.ensureNotBlockedEitherWay(me, userId);

    const existed = await this.hasFollow(me, userId);
    if (existed) {
      const mutual = await this.hasFollow(userId, me);
      return { ok: true, mutual, alreadyFollowed: true };
    }

    // Create follow (A -> B)
    await this.prisma.follow.create({
      data: { followerId: me, followeeId: userId },
    });

    await this.events.emit('social.follow.created', {
      followerId: me,
      followeeId: userId,
    });

    // Mutual only when creating the 2nd edge
    const mutual = await this.hasFollow(userId, me);
    if (mutual) {
      await this.events.emit('social.follow.mutual', {
        userAId: me,
        userBId: userId,
        by: 'follow-back',
      });
    }

    return { ok: true, mutual, alreadyFollowed: false };
  }

  async unfollow(me: string, userId: string) {
    this.ensureNotSelf(me, userId, 'cannot_unfollow_self');

    const res = await this.prisma.follow.deleteMany({
      where: { followerId: me, followeeId: userId },
    });

    if (res.count > 0) {
      await this.events.emit('social.follow.deleted', {
        followerId: me,
        followeeId: userId,
        reason: 'unfollow',
      });
    }

    return { ok: true, deleted: res.count };
  }

  /**
   * Block: idempotent + cleanup follow both ways.
   * - emit block.created (nếu tạo mới)
   * - xoá follow 2 chiều, emit follow.deleted reason blocked cho từng chiều nếu có
   */
  async block(me: string, userId: string) {
    this.ensureNotSelf(me, userId, 'cannot_block_self');

    const existed = await this.hasBlock(me, userId);

    if (!existed) {
      await this.prisma.block.create({
        data: { blockerId: me, blockeeId: userId },
      });

      await this.events.emit('social.block.created', {
        blockerId: me,
        blockeeId: userId,
      });
    }

    // cleanup follows both directions
    const [a2b, b2a] = await Promise.all([
      this.prisma.follow.deleteMany({
        where: { followerId: me, followeeId: userId },
      }),
      this.prisma.follow.deleteMany({
        where: { followerId: userId, followeeId: me },
      }),
    ]);

    if (a2b.count > 0) {
      await this.events.emit('social.follow.deleted', {
        followerId: me,
        followeeId: userId,
        reason: 'blocked',
      });
    }
    if (b2a.count > 0) {
      await this.events.emit('social.follow.deleted', {
        followerId: userId,
        followeeId: me,
        reason: 'blocked',
      });
    }

    return { ok: true, alreadyBlocked: existed, removedFollows: { a2b: a2b.count, b2a: b2a.count } };
  }

  async unblock(me: string, userId: string) {
    const res = await this.prisma.block.deleteMany({
      where: { blockerId: me, blockeeId: userId },
    });

    if (res.count > 0) {
      await this.events.emit('social.block.deleted', {
        blockerId: me,
        blockeeId: userId,
      });
    }

    return { ok: true, deleted: res.count };
  }

  /* ================= INTERNAL (useful for messaging / debug) ================= */

  async relation(a: string, b: string) {
    const [aFollowsB, bFollowsA, aBlocksB, bBlocksA] = await Promise.all([
      this.hasFollow(a, b),
      this.hasFollow(b, a),
      this.hasBlock(a, b),
      this.hasBlock(b, a),
    ]);

    return {
      aFollowsB,
      bFollowsA,
      mutual: aFollowsB && bFollowsA,
      blockedEitherWay: aBlocksB || bBlocksA,
      aBlocksB,
      bBlocksA,
    };
  }

  async isBlocked(a: string, b: string): Promise<boolean> {
    const row = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockeeId: b },
          { blockerId: b, blockeeId: a },
        ],
      },
      select: { blockerId: true },
    });
    return !!row;
  }

}
