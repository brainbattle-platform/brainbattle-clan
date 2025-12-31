import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CoreEventEmitter } from '../events/core-event.emitter';

type Visibility = 'public' | 'private';
type Role = 'leader' | 'member';
type MemberStatus = 'active' | 'banned' | 'left';
type JoinStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CoreEventEmitter,
  ) {}

  /* ================= helpers ================= */

  private async getClanOrThrow(clanId: string) {
    const clan = await this.prisma.clan.findUnique({ where: { id: clanId } });
    if (!clan) throw new NotFoundException('Clan not found');
    return clan as {
      id: string;
      visibility: Visibility;
      createdBy: string;
    };
  }

  private async getMember(clanId: string, userId: string) {
    return this.prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId } },
    }) as Promise<null | {
      clanId: string;
      userId: string;
      role: Role;
      status: MemberStatus;
    }>;
  }

  private async requireLeader(clanId: string, actorId: string) {
    const m = await this.getMember(clanId, actorId);
    if (!m || m.role !== 'leader' || m.status !== 'active') {
      throw new ForbiddenException('Only clan leader can perform this action');
    }
  }

  private async requireActiveMember(clanId: string, userId: string) {
    const m = await this.getMember(clanId, userId);
    if (!m || m.status !== 'active') {
      throw new ForbiddenException('Not an active member');
    }
    return m;
  }

  private ensureVisibility(v: string): asserts v is Visibility {
    if (v !== 'public' && v !== 'private')
      throw new BadRequestException('invalid_visibility');
  }

  /* ================= use-cases ================= */

  async createClan(me: string, dto: { name: string; visibility: Visibility }) {
    this.ensureVisibility(dto.visibility);

    const slug =
      slugify(dto.name, { lower: true, strict: true }) +
      '-' +
      Math.random().toString(36).slice(2, 6);

    const clan = await this.prisma.clan.create({
      data: {
        name: dto.name,
        slug,
        visibility: dto.visibility,
        createdBy: me,
      },
    });

    await this.prisma.clanMember.create({
      data: {
        clanId: clan.id,
        userId: me,
        role: 'leader',
        status: 'active',
      },
    });

    await this.events.emit('clan.created', { clanId: clan.id, leaderId: me });

    return clan;
  }

  async getClan(id: string) {
    const c = await this.prisma.clan.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Clan not found');
    return c;
  }

  async getClanLite(clanId: string) {
    const c = await this.prisma.clan.findUnique({
      where: { id: clanId },
      select: {
        id: true,
        name: true,
        slug: true,
        visibility: true,
        createdBy: true,
      },
    });
    if (!c) throw new NotFoundException('Clan not found');
    return c;
  }

  listMembers(clanId: string) {
    return this.prisma.clanMember.findMany({ where: { clanId } });
  }

  async getMembership(clanId: string, userId: string) {
    const m = await this.getMember(clanId, userId);
    if (!m) return { isMember: false };
    return { isMember: m.status === 'active', role: m.role, status: m.status };
  }

  /**
   * JOIN:
   * - public: auto member active + emit joined(by=auto-public)
   * - private: create joinRequest pending
   */
  async requestJoin(me: string, clanId: string) {
    const clan = await this.getClanOrThrow(clanId);

    const existing = await this.getMember(clanId, me);
    if (existing?.status === 'active')
      throw new BadRequestException('already_in_clan');
    if (existing?.status === 'banned') throw new ForbiddenException('banned');

    if ((clan as any).visibility === 'public') {
      await this.prisma.clanMember.upsert({
        where: { clanId_userId: { clanId, userId: me } },
        update: { status: 'active', role: 'member' },
        create: { clanId, userId: me, status: 'active', role: 'member' },
      });

      await this.events.emit('clan.member.joined', {
        clanId,
        userId: me,
        by: 'auto-public',
      });

      return { ok: true, joined: true, pending: false };
    }

    // private -> pending request (idempotent)
    const existedReq = await this.prisma.clanJoinRequest.findFirst({
      where: { clanId, requesterId: me },
    });

    if (existedReq) {
      // nếu trước đó rejected, cho phép gửi lại -> pending
      if (existedReq.status !== 'pending') {
        await this.prisma.clanJoinRequest.update({
          where: { id: existedReq.id },
          data: {
            status: 'pending' as JoinStatus,
            reviewedBy: null,
            reviewedAt: null,
          },
        });
      }
      return {
        ok: true,
        joined: false,
        pending: true,
        requestId: existedReq.id,
      };
    }

    const req = await this.prisma.clanJoinRequest.create({
      data: { clanId, requesterId: me, status: 'pending' },
    });

    return { ok: true, joined: false, pending: true, requestId: req.id };
  }

  /**
   * APPROVE (leader only): only meaningful for private clan
   */
  async approveJoin(actor: string, clanId: string, userId: string) {
    await this.requireLeader(clanId, actor);
    const clan = await this.getClanOrThrow(clanId);

    const member = await this.getMember(clanId, userId);
    if (member?.status === 'banned')
      throw new ForbiddenException('user_banned');

    if ((clan as any).visibility === 'private') {
      const req = await this.prisma.clanJoinRequest.findFirst({
        where: { clanId, requesterId: userId, status: 'pending' },
      });
      if (!req) throw new BadRequestException('no_pending_request');

      await this.prisma.clanJoinRequest.update({
        where: { id: req.id },
        data: { status: 'approved', reviewedBy: actor, reviewedAt: new Date() },
      });
    } else {
      // public: approve không cần thiết, nhưng nếu có request pending thì mark approved
      await this.prisma.clanJoinRequest.updateMany({
        where: { clanId, requesterId: userId, status: 'pending' },
        data: { status: 'approved', reviewedBy: actor, reviewedAt: new Date() },
      });
    }

    await this.prisma.clanMember.upsert({
      where: { clanId_userId: { clanId, userId } },
      update: { status: 'active', role: 'member' },
      create: { clanId, userId, status: 'active', role: 'member' },
    });

    await this.events.emit('clan.member.joined', {
      clanId,
      userId,
      by: 'approved',
    });

    return { ok: true };
  }

  /**
   * LEAVE (self):
   * - member -> status left + emit left
   * - leader cannot leave if still has other active members
   */
  async leaveClan(me: string, clanId: string) {
    const member = await this.requireActiveMember(clanId, me);

    if (member.role === 'leader') {
      const others = await this.prisma.clanMember.count({
        where: { clanId, status: 'active', NOT: { userId: me } },
      });
      if (others > 0)
        throw new BadRequestException('leader_cannot_leave_with_members');
    }

    await this.prisma.clanMember.update({
      where: { clanId_userId: { clanId, userId: me } },
      data: { status: 'left' },
    });

    await this.events.emit('clan.member.left', { clanId, userId: me });

    return { ok: true };
  }

  /**
   * BAN (leader):
   * - cannot ban leader
   * - status -> banned
   */
  async banMember(actor: string, clanId: string, userId: string) {
    await this.requireLeader(clanId, actor);

    if (actor === userId) throw new BadRequestException('cannot_ban_self');

    const target = await this.getMember(clanId, userId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'leader')
      throw new ForbiddenException('cannot_ban_leader');

    await this.prisma.clanMember.update({
      where: { clanId_userId: { clanId, userId } },
      data: { status: 'banned' },
    });

    await this.events.emit('clan.member.banned', {
      clanId,
      userId,
      by: 'leader',
    });

    return { ok: true };
  }
  async isMember(userId: string, clanId: string): Promise<boolean> {
    const member = await this.prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId } },
      select: { status: true },
    });
    return !!member && member.status === 'active';
  }

  ping(): string {
    return 'pong';
  }
}
