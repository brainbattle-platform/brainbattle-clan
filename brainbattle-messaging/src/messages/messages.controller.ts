import { Body, Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtHttpGuard } from '../common/jwt.http-guard';
import { MessagesService } from './messages.service';

@UseGuards(JwtHttpGuard)
@Controller('v1/messages')
export class MessagesController {
  constructor(private svc: MessagesService) {}

  @Patch(':id')
  edit(@Req() req, @Param('id') id: string, @Body() body: { content: string }) {
    return this.svc.edit(req.user.id, id, body.content);
  }

  @Delete(':id')
  del(@Req() req, @Param('id') id: string) {
    return this.svc.softDelete(req.user.id, id);
  }
}
