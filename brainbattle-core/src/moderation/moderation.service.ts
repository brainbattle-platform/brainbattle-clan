import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}
  create(dto: { subjectType: string; subjectId: string; reason: string }, reporterId: string) {
    return this.prisma.report.create({ data: { ...dto, reporterId, status: 'open' } });
  }
  resolve(id: string, status: 'resolved'|'invalid') {
    return this.prisma.report.update({ where: { id }, data: { status, resolvedAt: new Date() } });
  }
  list() { return this.prisma.report.findMany({ orderBy: { createdAt: 'desc' } }); }
}
