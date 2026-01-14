import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}
<<<<<<< HEAD

  /**
   * Create report
   * Any user can report content
   */
=======
>>>>>>> main
  create(
    dto: { subjectType: string; subjectId: string; reason: string },
    reporterId: string,
  ) {
    return this.prisma.report.create({
<<<<<<< HEAD
      data: {
        ...dto,
        reporterId,
        status: 'open',
      },
    });
  }

  /**
   * List own reports
   * Users can see their own reports
   */
  listMine(reporterId: string, skip?: number, take?: number) {
    return this.prisma.report.findMany({
      where: { reporterId },
      skip: skip || 0,
      take: take || 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get report details
   */
  async getReport(id: string, requesterId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Can view own reports or if admin
    if (report.reporterId !== requesterId) {
      throw new ForbiddenException('Not authorized');
    }

    return report;
  }

  /**
   * Resolve report (admin only)
   * Should be called from AdminService
   */
=======
      data: { ...dto, reporterId, status: 'open' },
    });
  }
>>>>>>> main
  resolve(id: string, status: 'resolved' | 'invalid') {
    return this.prisma.report.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });
  }
<<<<<<< HEAD

  /**
   * List all reports (for admin)
   * Should check admin role in controller
   */
  listAll(skip?: number, take?: number, status?: string, subjectType?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (subjectType) where.subjectType = subjectType;

    return this.prisma.report.findMany({
      where,
      skip: skip || 0,
      take: take || 50,
      orderBy: { createdAt: 'desc' },
    });
=======
  list() {
    return this.prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
>>>>>>> main
  }
}

