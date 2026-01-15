import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Admin service - Quản lý clans, users, reports
 * Tất cả endpoints require admin role
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /* ================= CLAN MANAGEMENT ================= */

  /**
   * List all clans with stats
   * Admin only
   */
  async listClans(skip?: number, take?: number, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const clans = await this.prisma.clan.findMany({
      where,
      skip: skip || 0,
      take: take || 20,
      select: {
        id: true,
        name: true,
        slug: true,
        visibility: true,
        createdBy: true,
        createdAt: true,
        description: true,
        avatarUrl: true,
      },
    });

    const clanStats = await Promise.all(
      clans.map(async (clan) => {
        const memberCount = await this.prisma.clanMember.count({
          where: { clanId: clan.id, status: 'active' },
        });
        return {
          ...clan,
          memberCount,
        };
      }),
    );

    const total = await this.prisma.clan.count({ where });

    return {
      data: clanStats,
      total,
      page: Math.floor((skip || 0) / (take || 20)) + 1,
    };
  }

  /**
   * Get clan details with stats
   */
  async getClanStats(clanId: string) {
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) throw new NotFoundException('Clan not found');

    const memberCount = await this.prisma.clanMember.count({
      where: { clanId, status: 'active' },
    });

    const bannedCount = await this.prisma.clanMember.count({
      where: { clanId, status: 'banned' },
    });

    const members = await this.prisma.clanMember.findMany({
      where: { clanId, status: 'active' },
      select: { userId: true, role: true, joinedAt: true },
      take: 100,
    });

    return {
      ...clan,
      memberCount,
      bannedCount,
      members,
    };
  }

  /**
   * Ban clan (disable all operations)
   */
  async banClan(clanId: string) {
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) throw new NotFoundException('Clan not found');

    // Mark all members as banned
    await this.prisma.clanMember.updateMany({
      where: { clanId },
      data: { status: 'banned' },
    });

    // Store ban info in settings
    await this.prisma.clan.update({
      where: { id: clanId },
      data: {
        settings: {
          ...((clan.settings as any) || {}),
          banned: true,
          bannedAt: new Date().toISOString(),
        },
      },
    });

    return { ok: true };
  }

  /**
   * Unban clan
   */
  async unbanClan(clanId: string) {
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
    });

    if (!clan) throw new NotFoundException('Clan not found');

    await this.prisma.clan.update({
      where: { id: clanId },
      data: {
        settings: {
          ...((clan.settings as any) || {}),
          banned: false,
        },
      },
    });

    return { ok: true };
  }

  /* ================= USER MANAGEMENT ================= */

  /**
   * List all users
   */
  async listUsers(skip?: number, take?: number, search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
            { handle: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      skip: skip || 0,
      take: take || 20,
      select: {
        id: true,
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const total = await this.prisma.user.count({ where });

    return {
      data: users,
      total,
      page: Math.floor((skip || 0) / (take || 20)) + 1,
    };
  }

  /**
   * Get user details & stats
   */
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Get clan memberships
    const clanMemberships = await this.prisma.clanMember.findMany({
      where: { userId, status: 'active' },
      select: { clanId: true, role: true, joinedAt: true },
    });

    // Get follow stats
    const followingCount = await this.prisma.follow.count({
      where: { followerId: userId },
    });

    const followersCount = await this.prisma.follow.count({
      where: { followeeId: userId },
    });

    return {
      ...user,
      clanMemberships,
      followingCount,
      followersCount,
    };
  }

  /**
   * Ban user from all clans
   */
  async banUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Ban from all clans
    await this.prisma.clanMember.updateMany({
      where: { userId },
      data: { status: 'banned' },
    });

    return { ok: true };
  }

  /**
   * Unban user from specific clan
   */
  async unbanUserFromClan(userId: string, clanId: string) {
    const member = await this.prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId } },
    });

    if (!member) throw new NotFoundException('User not a member of this clan');

    await this.prisma.clanMember.update({
      where: { clanId_userId: { clanId, userId } },
      data: { status: 'left' },
    });

    return { ok: true };
  }

  /**
   * Edit user details (admin)
   */
  async editUser(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.email && { email: data.email }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUserAdminAction(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        displayName: 'Deleted User',
      },
    });

    // Remove from clans
    await this.prisma.clanMember.deleteMany({
      where: { userId },
    });

    // Clean up relationships
    await this.prisma.follow.deleteMany({
      where: {
        OR: [{ followerId: userId }, { followeeId: userId }],
      },
    });

    await this.prisma.block.deleteMany({
      where: {
        OR: [{ blockerId: userId }, { blockeeId: userId }],
      },
    });

    return { ok: true, message: 'User deleted successfully' };
  }

  /* ================= REPORT MANAGEMENT ================= */

  /**
   * List reports
   */
  async listReports(skip?: number, take?: number, status?: string, subjectType?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (subjectType) where.subjectType = subjectType;

    const reports = await this.prisma.report.findMany({
      where,
      skip: skip || 0,
      take: take || 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subjectType: true,
        subjectId: true,
        reason: true,
        status: true,
        reporterId: true,
        createdAt: true,
      },
    });

    const total = await this.prisma.report.count({ where });

    return {
      data: reports,
      total,
      page: Math.floor((skip || 0) / (take || 20)) + 1,
    };
  }

  /**
   * Get report details
   */
  async getReportDetails(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    return report;
  }

  /**
   * Resolve report (mark as resolved or invalid)
   */
  async resolveReport(reportId: string, status: 'resolved' | 'invalid') {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolvedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    const totalClans = await this.prisma.clan.count();
    const totalUsers = await this.prisma.user.count();
    const openReports = await this.prisma.report.count({
      where: { status: 'open' },
    });
    const totalReports = await this.prisma.report.count();

    // Get recent reports
    const recentReports = await this.prisma.report.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get most active clans
    const activeClans = await this.prisma.clan.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const activeClansWithStats = await Promise.all(
      activeClans.map(async (clan) => {
        const memberCount = await this.prisma.clanMember.count({
          where: { clanId: clan.id, status: 'active' },
        });
        return { ...clan, memberCount };
      }),
    );

    return {
      summary: {
        totalClans,
        totalUsers,
        openReports,
        totalReports,
      },
      recentReports,
      activeClans: activeClansWithStats,
    };
  }
}
