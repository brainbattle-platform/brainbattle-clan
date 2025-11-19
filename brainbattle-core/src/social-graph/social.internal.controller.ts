import { Controller, Get, Query } from '@nestjs/common';
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
}
