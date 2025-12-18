import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/internal/social')
export class SocialInternalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('blocks/check')
  async checkBlock(
    @Query('a') a: string,
    @Query('b') b: string,
  ) {
    const ab = await this.prisma.block.findUnique({
      where: { blockerId_blockeeId: { blockerId: a, blockeeId: b } },
    });

    const ba = await this.prisma.block.findUnique({
      where: { blockerId_blockeeId: { blockerId: b, blockeeId: a } },
    });

    return {
      aBlocksB: !!ab,
      bBlocksA: !!ba,
      anyBlocked: !!(ab || ba),
    };
  }

  @Get('is-mutual/:a/:b')
  async isMutual(
    @Param('a') a: string,
    @Param('b') b: string
  ) {


    const aFollowB = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId: a,
          followeeId: b,
        },
      },
    });

    const bFollowA = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId: b,
          followeeId: a,
        },
      },
    });

    return {
      mutual: !!(aFollowB && bFollowA),
    };
  }
}
