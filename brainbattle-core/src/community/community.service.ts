import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import slugify from 'slugify';
import { ForbiddenException } from '@nestjs/common';


@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) { }

  private async requireLeader(clanId: string, actorId: string) {
    const member = await this.prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: actorId } },
    });
    if (!member || member.role !== 'leader') {
      throw new ForbiddenException('Only clan leader can perform this action');
    }
  }

  async createClan(me: string, dto: { name: string; visibility: 'public' | 'private' }) {
    const slug = slugify(dto.name, { lower: true, strict: true }) + '-' + Math.random().toString(36).slice(2, 6);
    const clan = await this.prisma.clan.create({ data: { name: dto.name, slug, visibility: dto.visibility, createdBy: me } });
    await this.prisma.clanMember.create({ data: { clanId: clan.id, userId: me, role: 'leader', status: 'active' } });
    return clan;
  }

  async getClan(id: string) {
    const c = await this.prisma.clan.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  listMembers(id: string) { return this.prisma.clanMember.findMany({ where: { clanId: id } }); }

  async requestJoin(me: string, clanId: string) {
    const exists = await this.prisma.clanMember.findUnique({ where: { clanId_userId: { clanId, userId: me } } });
    if (exists) throw new BadRequestException('already in clan');
    return this.prisma.clanJoinRequest.create({ data: { clanId, requesterId: me, status: 'pending' } });
  }

  async approveJoin(actor: string, clanId: string, userId: string) {
    await this.requireLeader(clanId, actor);
    await this.prisma.clanMember.upsert({
      where: { clanId_userId: { clanId, userId } },
      update: { status: 'active' },
      create: { clanId, userId, role: 'member', status: 'active' },
    });
    await this.prisma.clanJoinRequest.updateMany({
      where: { clanId, requesterId: userId },
      data: { status: 'approved' },
    });
    return { ok: true };
  }

  async kick(actor: string, clanId: string, userId: string) {
    await this.requireLeader(clanId, actor);

    await this.prisma.clanMember.delete({
      where: { clanId_userId: { clanId, userId } },
    });
    return { ok: true };
  }


  async getMembership(clanId: string, userId: string) {
    const m = await this.prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId } },
    });
    if (!m) return { isMember: false };

    return {
      isMember: true,
      role: m.role,
      status: m.status,
    };
  }

  async getClanLite(clanId: string) {
    const c = await this.prisma.clan.findUnique({
      where: { id: clanId },
      select: { id: true, name: true, slug: true, visibility: true, createdBy: true },
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  async isMember(userId: string, clanId: string) {
    const member = await this.prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId } },
    });
    return !!member && member.status === 'active';
  }


}
