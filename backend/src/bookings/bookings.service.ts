import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, EventStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

type CurrentUser = {
  userId: number;
  roles: string[];
};

const userSummary = {
  select: { id: true, username: true, firstName: true, lastName: true },
} as const;

// Τι φέρνουμε μαζί με κάθε κράτηση για να τη δείξει το frontend.
const bookingInclude = {
  ticketType: { select: { id: true, name: true, price: true } },
  event: {
    select: {
      id: true,
      title: true,
      venue: true,
      city: true,
      startDateTime: true,
      status: true,
      organizer: userSummary,
    },
  },
} as const;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto, attendeeId: number) {
    const { eventId, ticketTypeId, numberOfTickets } = createBookingDto;

    // Το token μπορεί να είναι ακόμα έγκυρο ενώ ο admin έκανε revoke τον χρήστη.
    const attendee = await this.prisma.user.findFirst({
      where: { id: attendeeId, active: true, registrationStatus: 'APPROVED' },
    });

    if (!attendee) {
      throw new ForbiddenException('Only approved users can make bookings');
    }

    // ΣΗΜΑΝΤΙΚΟ: Όλα μέσα σε ΕΝΑ transaction. αν πεταχτεί exception σε οποιοδήποτε σημείο,
    // γίνεται rollback και δεν αποθηκεύεται τίποτα (ούτε η μείωση του available).
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // «ενεργή» = δημοσιευμένη και δεν έχει ξεκινήσει ακόμα
      if (event.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException('Bookings are allowed only for published events');
      }

      if (event.startDateTime <= new Date()) {
        throw new BadRequestException('This event has already started');
      }

      if (event.organizerId === attendeeId) {
        throw new BadRequestException('You cannot book your own event');
      }

      //Ο τύπος εισιτηρίου πρέπει να υπάρχει ΚΑΙ να ανήκει σε αυτό το event.
      const ticketType = await tx.ticketType.findFirst({
        where: { id: ticketTypeId, eventId },
      });

      if (!ticketType) {
        throw new NotFoundException('Ticket type not found');
      }

      //ΠΡΟΣΟΣΧΗ:
      //Μείωση available ΜΟΝΟ αν φτάνουν τα εισιτήρια.
      //Έλεγχος (where) και αλλαγή (data) γίνονται σε ένα UPDATE της βάσης,
      //άρα δύο ταυτόχρονες κρατήσεις δεν μπορούν να πάρουν τα ίδια εισιτήρια.
      const ticketUpdate = await tx.ticketType.updateMany({
        where: { id: ticketTypeId, available: { gte: numberOfTickets } },
        data: { available: { decrement: numberOfTickets } },
      });

      if (ticketUpdate.count === 0) {
        throw new BadRequestException('Not enough tickets available for this ticket type');
      }

      //αυξηση δεσμευμένων θέσεων και έλεγχος συνολικής χωρητικότητας.
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: { reservedSeats: { increment: numberOfTickets } },
      });

      if (updatedEvent.reservedSeats > updatedEvent.capacity) {
        // rollback
        throw new BadRequestException('Not enough seats left for this event');
      }

      //Η κράτηση. Το κόστος βγαίνει από την τιμή της βάσης, όχι από τον client.
      return tx.booking.create({
        data: {
          eventId,
          ticketTypeId,
          attendeeId,
          numberOfTickets,
          totalCost: ticketType.price.mul(numberOfTickets), // Decimal όχι float
          status: BookingStatus.CONFIRMED,
        },
        include: bookingInclude,
      });
    });
  }

  // Οι κρατήσεις του συνδεδεμένου χρήστη, οι νεότερες πρώτα
  findMine(attendeeId: number) {
    return this.prisma.booking.findMany({
      where: { attendeeId },
      include: bookingInclude,
      orderBy: { time: 'desc' },
    });
  }

  // Οι κρατήσεις ενός event. Μόνο ο διοργανωτής του ή ο admin.
  async findForEvent(eventId: number, user: CurrentUser) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isAdmin = user.roles.includes('admin');

    if (!isAdmin && event.organizerId !== user.userId) {
      throw new ForbiddenException('You cannot see the bookings of this event');
    }

    return this.prisma.booking.findMany({
      where: { eventId },
      include: {
        ticketType: { select: { id: true, name: true, price: true } },
        attendee: userSummary,
      },
      orderBy: { time: 'desc' },
    });
  }
}
