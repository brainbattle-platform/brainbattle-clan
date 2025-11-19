import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDmReportDto } from './dto/create-report.dto';
import { ResolveDmReportDto } from './dto/resolve-report.dto';
import { ReportStatus } from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDmReportDto, reporterId: string) {
    return this.prisma.dMReport.create({
      data: {
        messageId: dto.messageId,
        reason: dto.reason,
        reporterId,
        status: ReportStatus.OPEN,
      },
    });
  }

  
  async resolve(id: string, dto: ResolveDmReportDto) {
    const exists = await this.prisma.dMReport.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Report not found');
    }

    return this.prisma.dMReport.update({
      where: { id },
      data: { status: dto.status },
    });
  }
  
  async list() {
    return this.prisma.dMReport.findMany({
      orderBy: { createdAt: 'desc' },
      // nếu muốn kèm luôn message:
      // include: { message: true },
    });
  }
}
