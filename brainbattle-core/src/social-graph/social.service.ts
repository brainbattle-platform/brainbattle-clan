import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}
  async follow(me: string, userId: string) {
    if (me === userId) throw new BadRequestException('cannot follow self');
    await this.prisma.follow.create({ data: { followerId: me, followeeId: userId } });
    return { ok: true };
  }
  async unfollow(me: string, userId: string) {
    await this.prisma.follow.delete({ where: { followerId_followeeId: { followerId: me, followeeId: userId } } });
    return { ok: true };
  }
  async isMutual(me: string, userId: string) {
    const a = await this.prisma.follow.findUnique({ where: { followerId_followeeId: { followerId: me, followeeId: userId } } });
    const b = await this.prisma.follow.findUnique({ where: { followerId_followeeId: { followerId: userId, followeeId: me } } });
    return { mutual: !!(a && b) };
  }
  async block(me: string, userId: string) {
    await this.prisma.block.create({ data: { blockerId: me, blockeeId: userId } });
    return { ok: true };
  }
  async unblock(me: string, userId: string) {
    await this.prisma.block.delete({ where: { blockerId_blockeeId: { blockerId: me, blockeeId: userId } } });
    return { ok: true };
  }
}
