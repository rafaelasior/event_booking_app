import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { SetEventCategoriesDto } from './dto/set-event-categories.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

type RequestWithUser = {
  user: {
    userId: number;
    roles: string[];
  };
};

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard)  // για να φτιάξεις event πρέπει να είσαι logged in
  @Post()
  create(
    @Body() createEventDto: CreateEventDto,
    @Req() request: RequestWithUser) {
    return this.eventsService.create(createEventDto, request.user.userId);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('eventType') eventType?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.eventsService.findAll({
      status,
      city,
      eventType,
      search,
      categoryId,
      dateFrom,
      dateTo,
      minPrice,
      maxPrice,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMine(@Req() request: RequestWithUser) {
    return this.eventsService.findMine(request.user.userId);
  }

  @Get('categories')
  findCategories() {
    return this.eventsService.findCategories();
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('categories')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.eventsService.createCategory(createCategoryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/view')
  recordView(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.recordView(+id, request.user.userId);
  }
  

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/ticket-types')
  createTicketType(
    @Param('id') id: string,
    @Body() createTicketTypeDto: CreateTicketTypeDto,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.createTicketType(
      +id,
      createTicketTypeDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/ticket-types/:ticketTypeId')
  updateTicketType(
    @Param('id') id: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() updateTicketTypeDto: UpdateTicketTypeDto,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.updateTicketType(
      +id,
      +ticketTypeId,
      updateTicketTypeDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/ticket-types/:ticketTypeId')
  deleteTicketType(
    @Param('id') id: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.deleteTicketType(
      +id,
      +ticketTypeId,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/categories')
  setEventCategories(
    @Param('id') id: string,
    @Body() setEventCategoriesDto: SetEventCategoriesDto,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.setEventCategories(
      +id,
      setEventCategoriesDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/photos')
  addPhoto(
    @Param('id') id: string,
    @Body() createPhotoDto: CreatePhotoDto,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.addPhoto(
      +id,
      createPhotoDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/photos/upload')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
  }))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.eventsService.addPhoto(+id, { filePath: `/uploads/${file.filename}` }, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/photos/:photoId')
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.deletePhoto(
      +id,
      +photoId,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Req() request: RequestWithUser,  // δίνει τον τρεχοντα logged in user
  ) {
    return this.eventsService.update(+id, updateEventDto, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/publish')
  publish(
    @Param('id') id: string, 
    @Req() request: RequestWithUser,
  ) {
    return this.eventsService.publish(+id, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string, 
    @Req() request: RequestWithUser
  ) {
    return this.eventsService.cancel(+id, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.eventsService.deleteEvent(+id, request.user);
  }
}
