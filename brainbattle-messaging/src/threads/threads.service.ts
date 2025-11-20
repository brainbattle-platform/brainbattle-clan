// src/threads/threads.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoreClient } from 'src/core/core.client';
import { SearchMessagesDto } from './dto/search-messages.dto';


@Injectable()
export class ThreadsService {
  constructor(private prisma: PrismaService, private core: CoreClient,) { }

  /** Tạo khóa cặp user theo thứ tự để đảm bảo 1–1 duy nhất */
  private pairKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  async createOneToOne(me: string, peer: string) {
    const block = await this.core.checkBlock(me, peer);
    if (block.anyBlocked) {
      throw new ForbiddenException('Cannot start DM: one party has blocked the other');
    }
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
  async getHistory(me: string, threadId: string, limit = 30, cursor?: string,) {
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
    const membership = await this.core.getClanMembership(clanId, me);
    if (!membership.isMember || membership.status !== 'active') {
      throw new ForbiddenException('You are not a member of this clan');
    }
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

  async searchMessages(
    me: string,
    threadId: string,
    dto: SearchMessagesDto,
  ) {
    await this.ensureParticipant(me, threadId);

    const q = dto.q?.trim();
    if (!q) return { items: [], nextCursor: null };

    const limit = Math.min(Number(dto.limit ?? 20), 100);
    const cursor = dto.cursor;

    const items = await this.prisma.dMMessage.findMany({
      where: {
        threadId,
        deletedAt: null,
        OR: [
          {
            content: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const last = items.length ? items[items.length - 1] : null;
    const nextCursor = last ? last.id : null;

    return { items, nextCursor };
  }


  async updateSettings(me: string, threadId: string, dto: { mutedUntil?: string; pinned?: boolean; archived?: boolean }) {
    await this.ensureParticipant(me, threadId);
    const data: any = {};
    if (dto.mutedUntil !== undefined) data.mutedUntil = dto.mutedUntil ? new Date(dto.mutedUntil) : null;
    if (dto.pinned !== undefined) data.pinnedAt = dto.pinned ? new Date() : null;
    if (dto.archived !== undefined) data.archivedAt = dto.archived ? new Date() : null;

    const r = await this.prisma.dMUserThreadSetting.upsert({
      where: { threadId_userId: { threadId, userId: me } },
      update: data,
      create: { threadId, userId: me, ...data },
    });
    return r;
  }

}
