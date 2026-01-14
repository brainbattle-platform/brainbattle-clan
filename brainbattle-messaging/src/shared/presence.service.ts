import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update user's last active timestamp
   */
  async touch(userId: string): Promise<void> {
    await this.prisma.presence.upsert({
      where: { userId },
      update: { lastActiveAt: new Date() },
      create: { userId, lastActiveAt: new Date() },
    });
  }

  /**
   * List active users (lastActiveAt within last 5 minutes)
   */
  async listActive(limit: number = 20, cursor?: string): Promise<{ users: any[]; nextCursor: string | null }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    let cursorCondition = {};
    if (cursor) {
      // Simple cursor based on userId
      cursorCondition = { userId: { gt: cursor } };
    }

    const users = await this.prisma.presence.findMany({
      where: {
        lastActiveAt: { gte: fiveMinutesAgo },
        ...cursorCondition,
      },
      orderBy: { userId: 'asc' },
      take: limit + 1, // Fetch one extra to determine if there's more
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore ? items[items.length - 1].userId : null;

    return {
      users: items.map(p => ({
        userId: p.userId,
        lastActiveAt: p.lastActiveAt,
        isActiveNow: true,
      })),
      nextCursor,
    };
  }
}
