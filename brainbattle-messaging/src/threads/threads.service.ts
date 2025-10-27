// src/threads/threads.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) { }

  /** Tạo khóa cặp user theo thứ tự để đảm bảo 1–1 duy nhất */
  private pairKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  /**
   * Tạo (hoặc lấy) thread 1–1 giữa me và peer.
   * - Không cho DM chính mình
   * - Dùng pairKey để upsert, đảm bảo idempotent
   * - Nested create participants KHÔNG cần truyền threadId (Prisma tự liên kết)
   */
  async createOneToOne(me: string, peer: string) {
    if (me === peer) throw new ForbiddenException('cannot dm self');

    const pairKey = this.pairKey(me, peer);

    const thread = await this.prisma.dMThread.upsert({
      where: { pairKey },
      update: {},
      create: {
        kind: 'ONE_TO_ONE',
        pairKey,
        participants: {
          create: [{ userId: me }, { userId: peer }],
        },
      },
      select: { id: true },
    });

    return { threadId: thread.id };
  }

  /** Kiểm tra thành viên của thread bằng khóa kép (threadId + userId) */
  async ensureParticipant(userId: string, threadId: string) {
    const exists = await this.prisma.dMParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
      select: { userId: true },
    });
    if (!exists) throw new ForbiddenException('not a participant');
  }

  /** Danh sách participants của thread (có check quyền) */
  async getParticipants(me: string, threadId: string) {
    await this.ensureParticipant(me, threadId);
    return this.prisma.dMParticipant.findMany({
      where: { threadId },
      orderBy: { joinedAt: 'asc' },
    });
  }

  /** Lịch sử tin nhắn có phân trang cursor */
  async getHistory(me: string, threadId: string, limit = 30, cursor?: string) {
    await this.ensureParticipant(me, threadId);

    const take = Math.min(Math.max(limit, 1), 100);

    const itemsDesc = await this.prisma.dMMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const items = itemsDesc.reverse();
    const nextCursor = items.length ? items[0].id : null;

    return { items, nextCursor };
  }

  async getOrCreateClanThread(me: string, clanId: string) {
    // TODO (phase 2): call core to verify membership of `me` in clanId
    let thread = await this.prisma.dMThread.findFirst({
      where: { kind: 'CLAN', clanId },
      select: { id: true },
    });
    if (!thread) {
      thread = await this.prisma.dMThread.create({
        data: { kind: 'CLAN', clanId },
        select: { id: true },
      });
    }
    // ensure membership record for `me`
    await this.prisma.dMParticipant.upsert({
      where: { threadId_userId: { threadId: thread.id, userId: me } },
      update: {},
      create: { threadId: thread.id, userId: me, role: 'member' },
    });
    return { threadId: thread.id };
  }

  async createClanThread(me: string, clanId: string) {
    // sugar: gọi API trên và trả về
    return this.getOrCreateClanThread(me, clanId);
  }

}
