import { Controller, Get, Param, Post, Query, Req, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { HttpJwtGuard } from '../security/http-jwt.guard';
import { ConversationsService } from './conversations.service';
import { MessagesQueryDto } from './dto/messages-query.dto';
import { ReadDto } from './dto/read.dto';

@ApiTags('Messaging')
@ApiBearerAuth('access-token')
@UseGuards(HttpJwtGuard)
@Controller('v1')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @ApiOperation({ summary: 'List my conversations (dm + clan)' })
  @Get('conversations')
  list(@Req() req: any) {
    return this.conversations.listMyConversations(req.user.id);
  }

  @ApiOperation({ summary: 'Get messages (cursor pagination)' })
  @ApiParam({ name: 'id', description: 'conversationId' })
  @Get('conversations/:id/messages')
  messages(@Req() req: any, @Param('id') id: string, @Query() q: MessagesQueryDto) {
    return this.conversations.getMessages(id, req.user.id, q.limit ?? 30, q.cursor);
  }

  @ApiOperation({ summary: 'Mark read (read receipt)' })
  @Post('conversations/:id/read')
  read(@Req() req: any, @Param('id') id: string, @Body() body: ReadDto) {
    return this.conversations.markRead(id, req.user.id, body.lastReadAt);
  }
}
