import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) { }

  async edit(actorId: string, id: string, content: string) {
    const msg = await this.prisma.dMMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException();
    if (msg.senderId !== actorId) throw new ForbiddenException('not the author');
    if (msg.deletedAt) throw new ForbiddenException('message deleted');

    const updated = await this.prisma.dMMessage.update({
      where: { id },
      data: { content, editedAt: new Date() },
    });
    return updated;
  }

  async softDelete(actorId: string, id: string) {
    const msg = await this.prisma.dMMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException();
    if (msg.senderId !== actorId) throw new ForbiddenException('not permitted');

    const deleted = await this.prisma.dMMessage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
        content: null,              // String? -> cho phép null
        attachment: Prisma.DbNull,  // Json? -> dùng DbNull thay vì null
      },
    });
    return { ok: true, id: deleted.id };
  }

}
