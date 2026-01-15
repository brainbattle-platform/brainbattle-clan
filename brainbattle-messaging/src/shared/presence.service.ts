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
    
    let cursorCondition: any = {};
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
        // Cursor contains { lastActiveAt, userId }
        cursorCondition = {
          OR: [
            { lastActiveAt: { lt: new Date(decoded.lastActiveAt) } },
            {
              AND: [
                { lastActiveAt: new Date(decoded.lastActiveAt) },
                { userId: { gt: decoded.userId } },
              ],
            },
          ],
        };
      } catch (e) {
        // Invalid cursor, ignore
        cursorCondition = {};
      }
    }

    const users = await this.prisma.presence.findMany({
      where: {
        lastActiveAt: { gte: fiveMinutesAgo },
        ...cursorCondition,
      },
      orderBy: [
        { lastActiveAt: 'desc' },
        { userId: 'asc' },
      ],
      take: limit + 1, // Fetch one extra to determine if there's more
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            lastActiveAt: items[items.length - 1].lastActiveAt,
            userId: items[items.length - 1].userId,
          }),
        ).toString('base64')
      : null;

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
