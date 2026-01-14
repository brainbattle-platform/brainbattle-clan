import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user public profile
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      followerCount: user._count.followers,
      followingCount: user._count.following,
    };
  }

  /**
   * Update own user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get followers list for a user
   */
  async getFollowers(userId: string, skip = 0, take = 20) {
    const followers = await this.prisma.follow.findMany({
      where: {
        followeeId: userId,
      },
      include: {
        follower: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.follow.count({
      where: { followeeId: userId },
    });

    return {
      data: followers.map((f) => f.follower),
      total,
      page: Math.floor(skip / take) + 1,
    };
  }

  /**
   * Get following list for a user
   */
  async getFollowing(userId: string, skip = 0, take = 20) {
    const following = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        followee: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.follow.count({
      where: { followerId: userId },
    });

    return {
      data: following.map((f) => f.followee),
      total,
      page: Math.floor(skip / take) + 1,
    };
  }

  /**
   * Get user by ID (admin)
   */
  async getUserAdminView(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user (admin)
   */
  async updateUserAdmin(userId: string, data: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteUser(userId: string) {
    // Soft delete: update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        displayName: 'Deleted User',
      },
    });

    // Remove from all clans
    await this.prisma.clanMember.deleteMany({
      where: { userId },
    });

    // Remove follows
    await this.prisma.follow.deleteMany({
      where: {
        OR: [{ followerId: userId }, { followeeId: userId }],
      },
    });

    // Remove blocks
    await this.prisma.block.deleteMany({
      where: {
        OR: [{ blockerId: userId }, { blockeeId: userId }],
      },
    });

    return { ok: true, message: 'User deleted successfully' };
  }
}
