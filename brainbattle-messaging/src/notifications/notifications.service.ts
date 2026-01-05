import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'FOLLOW_CREATED' | 'MUTUAL_FOLLOW' | 'CLAN_EVENT' | 'SYSTEM';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, type: NotificationType, payload: any) {
    return this.prisma.notification.create({
      data: { userId, type, payload },
    });
  }

  async list(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
