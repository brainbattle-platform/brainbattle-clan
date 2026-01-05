import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function dmKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDmForUsers(userAId: string, userBId: string) {
    if (userAId === userBId) throw new BadRequestException('cannot_dm_self');
    const key = dmKey(userAId, userBId);

    // 1) Upsert DmKey để không tạo trùng
    const existing = await this.prisma.dmKey.findUnique({ where: { key } });
    if (existing) return existing.conversationId;

    // 2) Create conversation + members + dmKey in transaction
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // check again inside tx
        const again = await tx.dmKey.findUnique({ where: { key } });
        if (again) return again.conversationId;

        const conv = await tx.conversation.create({
          data: { type: 'dm' },
        });

        await tx.conversationMember.createMany({
          data: [
            { conversationId: conv.id, userId: userAId },
            { conversationId: conv.id, userId: userBId },
          ],
        });

        await tx.dmKey.create({
          data: { key, conversationId: conv.id },
        });

        return conv.id;
      });

      return created;
    } catch (e: any) {
      // Handle unique constraint races (another worker created the DM concurrently)
      if ((e as any)?.code === 'P2002') {
        const existing2 = await this.prisma.dmKey.findUnique({ where: { key } });
        if (existing2) return existing2.conversationId;
      }
      throw e;
    }
  }

  async ensureClanConversation(clanId: string, leaderId?: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { type: 'clan', clanId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const conv = await this.prisma.conversation.create({
      data: { type: 'clan', clanId },
    });

    if (leaderId) {
      await this.prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: leaderId } },
        update: { leftAt: null },
        create: { conversationId: conv.id, userId: leaderId },
      });
    }

    return conv.id;
  }

  async upsertClanMember(clanId: string, userId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { type: 'clan', clanId },
      select: { id: true },
    });
    if (!conv) {
      // nếu event join đến trước event create (hiếm), vẫn tạo
      const convId = await this.ensureClanConversation(clanId);
      await this.prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: convId, userId } },
        update: { leftAt: null },
        create: { conversationId: convId, userId },
      });
      return;
    }

    await this.prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: conv.id, userId } },
      update: { leftAt: null },
      create: { conversationId: conv.id, userId },
    });
  }

  async markClanMemberLeft(clanId: string, userId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { type: 'clan', clanId },
      select: { id: true },
    });
    if (!conv) return;

    await this.prisma.conversationMember.updateMany({
      where: { conversationId: conv.id, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  async listMyConversations(me: string) {
    const rows = await this.prisma.conversationMember.findMany({
      where: { userId: me, leftAt: null },
      select: {
        conversation: { select: { id: true, type: true, clanId: true, updatedAt: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return rows.map((r) => r.conversation);
  }

  async requireMember(conversationId: string, me: string) {
    const m = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: me } },
      select: { leftAt: true },
    });
    if (!m || m.leftAt) throw new ForbiddenException('not_member');
  }

  async getMessages(conversationId: string, me: string, limit = 30, cursor?: string) {
    await this.requireMember(conversationId, me);

    if (!cursor) {
      return this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    // cursor pagination: load older than cursor message
    const cursorMsg = await this.prisma.message.findUnique({
      where: { id: cursor },
      select: { createdAt: true, conversationId: true },
    });
    if (!cursorMsg || cursorMsg.conversationId !== conversationId) {
      throw new BadRequestException('invalid_cursor');
    }

    return this.prisma.message.findMany({
      where: { conversationId, createdAt: { lt: cursorMsg.createdAt } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markRead(conversationId: string, me: string, lastReadAtIso: string) {
    await this.requireMember(conversationId, me);
    const dt = new Date(lastReadAtIso);
    if (isNaN(dt.getTime())) throw new BadRequestException('invalid_date');

    await this.prisma.readReceipt.upsert({
      where: { conversationId_userId: { conversationId, userId: me } },
      update: { lastReadAt: dt },
      create: { conversationId, userId: me, lastReadAt: dt },
    });

    return { ok: true };
  }
}
