import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';

type RequestWithUser = {
  user: {
    userId: number;
    username: string;
    roles: string[];
  };
};

// Όλα θέλουν login. Ο επισκέπτης (χωρίς token) παίρνει 401 -> δεν κάνει κράτηση.
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /bookings -> 201 με την κράτηση
  @Post()
  create(@Body() createBookingDto: CreateBookingDto, @Req() request: RequestWithUser) {
    return this.bookingsService.create(createBookingDto, request.user.userId);
  }

  // GET /bookings/my
  @Get('my')
  findMine(@Req() request: RequestWithUser) {
    return this.bookingsService.findMine(request.user.userId);
  }

  // GET /bookings/event/:eventId, για τη σελίδα διαχείρισης event του διοργανωτή
  @Get('event/:eventId')
  findForEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Req() request: RequestWithUser,
  ) {
    return this.bookingsService.findForEvent(eventId, request.user);
  }

  //Δεν φτιάξαμε PATCH/DELETE αφού η κράτηση δεν αναιρείται μετά την υποβολή
}
