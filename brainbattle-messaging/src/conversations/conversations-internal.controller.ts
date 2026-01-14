import { Controller, Post, Body } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

interface CreateConversationInternalDto {
  title: string;
  isClan: boolean;
  memberIds: string[];
  clanId?: string;
}

@Controller('internal/conversations')
export class ConversationsInternalController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  @Post()
  async createConversation(@Body() dto: CreateConversationInternalDto) {
    const { title, isClan, memberIds, clanId } = dto;

    // Ensure conversation exists (for clan or DM)
    const conversation = isClan && clanId
      ? await this.conversationsService.ensureClanConversation(clanId, title)
      : await this.conversationsService.ensureDmConversation(memberIds, title);

    // Add all members to conversation
    await Promise.all(
      memberIds.map(memberId =>
        this.conversationsService.addMember(conversation.id, memberId)
      )
    );

    // Fetch updated member count
    const members = await this.conversationsService.getConversationMembers(
      conversation.id
    );

    return {
      id: conversation.id,
      title: conversation.title || title,
      isClan: conversation.clanId !== null,
      memberCount: members.length,
      participants: members.map(m => ({
        id: m.userId,
        joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
      })),
    };
  }
}
