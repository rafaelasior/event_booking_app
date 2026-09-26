import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AnnouncementDto } from './dto/announcement.dto';
import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';

// Το request.user το γεμίζει το JwtStrategy.validate().
type RequestWithUser = {
  user: {
    userId: number;
    username: string;
    roles: string[];
  };
};

@UseGuards(JwtAuthGuard) // Όλα τα /messages endpoints θέλουν login token.
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ΠΡΟΣΟΧΗ τα σταθερά paths (inbox, sent κλπ) δηλώνονται ΠΡΙΝ από το ':id'.
  // Αλλιώς το GET /messages/inbox θα έπεφτε στο ':id' με id = 'inbox' -> 400.

  @Get('inbox')
  inbox(@Req() request: RequestWithUser) {
    return this.messagesService.findInbox(request.user.userId);
  }

  @Get('sent')
  sent(@Req() request: RequestWithUser) {
    return this.messagesService.findSent(request.user.userId);
  }

  @Get('unread-count')
  unreadCount(@Req() request: RequestWithUser) {
    return this.messagesService.countUnread(request.user.userId);
  }

  @Get('contacts')
  contacts(@Req() request: RequestWithUser) {
    return this.messagesService.findContacts(request.user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.messagesService.findOne(id, request.user.userId);
  }

  @Post()
  send(
    @Body() createMessageDto: CreateMessageDto,
    @Req() request: RequestWithUser,
  ) {
    return this.messagesService.send(createMessageDto, request.user.userId);
  }

  // Ο διοργανωτής ενημερώνει όλους όσους έχουν κράτηση, μετά την ακύρωση.
  @Post('events/:eventId/announcement')
  announce(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() announcementDto: AnnouncementDto,
    @Req() request: RequestWithUser,
  ) {
    return this.messagesService.sendCancellationAnnouncement(
      eventId,
      announcementDto,
      request.user.userId,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.messagesService.markAsRead(id, request.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204: πέτυχε, χωρίς body
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.messagesService.remove(id, request.user.userId);
  }
}
