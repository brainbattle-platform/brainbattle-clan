import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadResponseDto } from '../community/dto/community-swagger.dto';

interface CreateConversationInternalDto {
  title?: string;
  avatarUrl?: string;
  isClan: boolean;
  memberIds: string[];
  clanId?: string;
}

@ApiTags('Internal')
@Controller('internal/conversations')
export class ConversationsInternalController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Create conversation (internal)', description: 'Internal endpoint for core service to create clan or DM conversations' })
  @ApiResponse({ status: 201, type: ThreadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request (missing or invalid memberIds)' })
  @Post()
  async createConversation(@Body() dto: CreateConversationInternalDto) {
    const { title, avatarUrl, isClan, memberIds, clanId } = dto;

    // Validate memberIds
    if (!memberIds || memberIds.length === 0) {
      throw new BadRequestException('memberIds is required');
    }

    let conversation: any;

    if (isClan && clanId) {
      // Clan conversation: ensure it exists (unique clanId constraint)
      const existing = await this.prisma.conversation.findFirst({
        where: { type: 'clan', clanId },
        include: {
          members: {
            where: { leftAt: null },
            select: { userId: true, joinedAt: true },
          },
        },
      });

      if (existing) {
        // Add any new members to existing conversation
        for (const memberId of memberIds) {
          await this.conversationsService.addMember(existing.id, memberId);
        }

        // Fetch updated member list
        const updatedMembers = await this.prisma.conversationMember.findMany({
          where: { conversationId: existing.id, leftAt: null },
          select: { userId: true, joinedAt: true },
        });

        return {
          data: {
            id: existing.id,
            title: existing.title || title || `Clan ${clanId}`,
            isClan: true,
            clanId: existing.clanId,
            memberCount: updatedMembers.length,
            participants: updatedMembers.map((m) => ({
              id: m.userId,
              joinedAt:
                m.joinedAt instanceof Date
                  ? m.joinedAt.toISOString()
                  : m.joinedAt,
            })),
          },
          meta: {},
        };
      }

      // Create new clan conversation
      conversation = await this.prisma.conversation.create({
        data: {
          type: 'clan',
          clanId,
          title: title || `Clan ${clanId}`,
          avatarUrl,
        },
      });
    } else {
      // DM conversation: use ensureDmConversation for 2 members
      if (memberIds.length === 2) {
        const dmConv = await this.conversationsService.ensureDmConversation(
          memberIds,
          title,
        );
        conversation = await this.prisma.conversation.findUnique({
          where: { id: dmConv.id },
        });
      } else {
        // Group DM (more than 2 members)
        conversation = await this.prisma.conversation.create({
          data: {
            type: 'dm',
            title: title || 'Group Chat',
            avatarUrl,
          },
        });
      }
    }

    // Add all members to the conversation
    await Promise.all(
      memberIds.map((memberId) =>
        this.conversationsService.addMember(conversation.id, memberId),
      ),
    );

    // Fetch final member list
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: conversation.id, leftAt: null },
      select: { userId: true, joinedAt: true },
    });

    // Create initial system message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: null,
        kind: 'system',
        content: isClan
          ? `Clan conversation created`
          : `Conversation created`,
      },
    });

    return {
      data: {
        id: conversation.id,
        title: conversation.title || title || 'Conversation',
        isClan: conversation.type === 'clan',
        clanId: conversation.clanId,
        memberCount: members.length,
        participants: members.map((m) => ({
          id: m.userId,
          joinedAt:
            m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
        })),
      },
      meta: {},
    };
  }
}
