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
type Role = 'leader' | 'officer' | 'member';
type MemberStatus = 'active' | 'banned' | 'left';
type JoinStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CoreEventEmitter,
  ) {}

  /* ================= helpers ================= */

  validateClanName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      throw new BadRequestException('Clan name must be at least 3 characters');
    }
  }

  normalizeClanSlug(name: string): string {
    return slugify(name, { remove: /[^a-zA-Z0-9 -]/g }).toLowerCase();
  }

  isValidRole(role: string): boolean {
    return ['leader', 'member', 'officer'].includes(role);
  }

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

    if ((clan as { visibility?: string }).visibility === 'public') {
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

    if ((clan as { visibility?: string }).visibility === 'private') {
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
<<<<<<< HEAD

  /* ================= INVITE LINK MANAGEMENT ================= */

  /**
   * Tạo invite link mới cho clan
   * Leader only
   */
  async createInviteLink(actor: string, clanId: string, dto: { maxUses?: number; expiresInMinutes?: number }) {
    await this.requireLeader(clanId, actor);
    await this.getClanOrThrow(clanId);

    // Generate token (32 char alphanumeric)
    const token = this.generateInviteToken();

    // Default: 7 days expiry
    const expiresInMinutes = dto.expiresInMinutes ?? 7 * 24 * 60;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const invite = await this.prisma.clanInvite.create({
      data: {
        clanId,
        inviterId: actor,
        token,
        expiresAt,
        status: 'pending',
      },
    });

    // Return invite info với public token
    return {
      id: invite.id,
      token: invite.token,
      clanId: invite.clanId,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  /**
   * Lấy danh sách active invite links của clan
   * Leader only
   */
  async listInviteLinks(actor: string, clanId: string) {
    await this.requireLeader(clanId, actor);

    const invites = await this.prisma.clanInvite.findMany({
      where: {
        clanId,
        status: 'pending',
        expiresAt: { gt: new Date() }, // Chưa hết hạn
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        inviterId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites;
  }

  /**
   * Revoke invite link
   * Leader only
   */
  async revokeInviteLink(actor: string, clanId: string, inviteId: string) {
    await this.requireLeader(clanId, actor);

    const invite = await this.prisma.clanInvite.findFirst({
      where: { id: inviteId, clanId },
    });
    if (!invite) throw new NotFoundException('Invite link not found');

    await this.prisma.clanInvite.update({
      where: { id: inviteId },
      data: { status: 'revoked' },
    });

    return { ok: true };
  }

  /**
   * Join clan qua invite link
   * Bất kỳ ai có token hợp lệ
   */
  async joinViaInvite(userId: string, token: string) {
    // Tìm invite link
    const invite = await this.prisma.clanInvite.findFirst({
      where: { token },
    });

    // Validate token
    if (!invite) throw new NotFoundException('Invalid invite link');
    if (invite.status !== 'pending') throw new BadRequestException('Invite link expired or revoked');
    if (new Date() > invite.expiresAt) {
      // Update status nếu hết hạn
      await this.prisma.clanInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Invite link expired');
    }

    const clanId = invite.clanId;

    // Get clan info
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
      select: { id: true, name: true },
    });

    if (!clan) throw new NotFoundException('Clan not found');

    // Check if user already in clan
    const existing = await this.getMember(clanId, userId);
    if (existing?.status === 'active') throw new BadRequestException('already_in_clan');
    if (existing?.status === 'banned') throw new ForbiddenException('You are banned from this clan');

    // Add member to clan
    await this.prisma.clanMember.upsert({
      where: { clanId_userId: { clanId, userId } },
      update: { status: 'active', role: 'member' },
      create: { clanId, userId, status: 'active', role: 'member' },
    });

    // Mark invite as accepted
    await this.prisma.clanInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', inviteeId: userId },
    });

    // Emit event
    await this.events.emit('clan.member.joined', {
      clanId,
      userId,
      by: 'invite-link',
    });

    return {
      ok: true,
      clanId,
      clanName: clan.name,
    };
  }

  /* ================= ROLE MANAGEMENT ================= */

  /**
   * Promote/Demote member
   * Leader only
   * Valid roles: leader, officer, member
   */
  async promoteMember(actor: string, clanId: string, userId: string, newRole: string) {
    await this.requireLeader(clanId, actor);

    // Validate role
    const validRoles = ['leader', 'officer', 'member'];
    if (!validRoles.includes(newRole)) throw new BadRequestException('invalid_role');

    // Cannot demote self from leader
    if (actor === userId && newRole !== 'leader') {
      throw new BadRequestException('cannot_demote_yourself');
    }

    const target = await this.getMember(clanId, userId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.status !== 'active') throw new ForbiddenException('Member is not active');

    // If promoting to leader, current leader becomes officer
    if (newRole === 'leader') {
      await this.prisma.clanMember.update({
        where: { clanId_userId: { clanId, userId: actor } },
        data: { role: 'officer' },
      });
    }

    // Update target role
    await this.prisma.clanMember.update({
      where: { clanId_userId: { clanId, userId } },
      data: { role: newRole },
    });

    await this.events.emit('clan.member.role.changed', {
      clanId,
      userId,
      newRole,
      changedBy: actor,
    });

    return { ok: true, newRole };
  }

  /**
   * Transfer leader to another member
   * Leader only
   */
  async transferLeader(actor: string, clanId: string, newLeaderId: string) {
    await this.requireLeader(clanId, actor);

    if (actor === newLeaderId) throw new BadRequestException('cannot_transfer_to_yourself');

    const newLeader = await this.getMember(clanId, newLeaderId);
    if (!newLeader) throw new NotFoundException('Member not found');
    if (newLeader.status !== 'active') throw new ForbiddenException('Target member is not active');

    // Make new leader
    await this.prisma.clanMember.update({
      where: { clanId_userId: { clanId, userId: newLeaderId } },
      data: { role: 'leader' },
    });

    // Demote old leader to officer
    await this.prisma.clanMember.update({
      where: { clanId_userId: { clanId, userId: actor } },
      data: { role: 'officer' },
    });

    await this.events.emit('clan.leader.transferred', {
      clanId,
      fromUserId: actor,
      toUserId: newLeaderId,
    });

    return { ok: true };
  }

  /* ================= CLAN SETTINGS ================= */

  /**
   * Cập nhật cài đặt clan
   * Leader only
   */
  async updateClanSettings(actor: string, clanId: string, dto: any) {
    await this.requireLeader(clanId, actor);
    await this.getClanOrThrow(clanId);

    const settings = {
      description: dto.description,
      coverUrl: dto.coverUrl,
      rules: dto.rules,
      category: dto.category,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };

    const clan = await this.prisma.clan.update({
      where: { id: clanId },
      data: {
        coverUrl: dto.coverUrl,
        settings: settings,
      },
    });

    return clan;
  }

  /**
   * Lấy cài đặt clan
   */
  async getClanSettings(clanId: string) {
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
      select: {
        id: true,
        name: true,
        slug: true,
        visibility: true,
        coverUrl: true,
        settings: true,
      },
    });

    if (!clan) throw new NotFoundException('Clan not found');
    return clan;
  }

  /**
   * Reset invite link (revoke all old, create new)
   * Leader only
   */
  async resetInviteLink(actor: string, clanId: string) {
    await this.requireLeader(clanId, actor);

    // Revoke all old invite links
    await this.prisma.clanInvite.updateMany({
      where: { clanId, status: 'pending' },
      data: { status: 'revoked' },
    });

    // Create new one
    return this.createInviteLink(actor, clanId, {});
  }

  /* ================= HELPERS ================= */

  /**
   * Generate random alphanumeric token
   */
  private generateInviteToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
=======
>>>>>>> main

  ping(): string {
    return 'pong';
  }
}
