import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '../generated/prisma/client';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { SetEventCategoriesDto } from './dto/set-event-categories.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { MessagesService } from '../messages/messages.service';

type EventFilters = {
  status?: string;
  city?: string;
  eventType?: string;
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  limit?: string;
};

type CurrentUser = {
  userId: number;
  roles: string[];
};



@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
  ) {}

// ------------------------------------------------------------------------------------
//  PRIVATE HELPER METHODS
// ------------------------------------------------------------------------------------

  // Validate that the provided status is a valid EventStatus enum value
  private parseStatus(status?: string): EventStatus | undefined {
    if (!status) {
      return undefined;
    }

    if (!Object.values(EventStatus).includes(status as EventStatus)) {
      throw new BadRequestException('Invalid event status');
    }

    return status as EventStatus;
  }

    // Validate that the end date is after the start date
  private validateDateRange(startDateTime: string | Date, endDateTime: string | Date) {
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }
  }

  // Ensure that the current user is either an admin or the organizer of the event
  private ensureCanManageEvent(event: { organizerId: number }, user: CurrentUser) {
    const isAdmin = user.roles.includes('admin');
    const isOrganizer = event.organizerId === user.userId;

    if (!isAdmin && !isOrganizer) {
      throw new ForbiddenException('You cannot manage this event');
    }
  }

  private ensureEventIsEditable(event: { status: EventStatus }) {
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cancelled events cannot be changed');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Completed events cannot be changed');
    }
  }

  // Calculate the total quantity of tickets for an event, optionally excluding a specific ticket type
  private async getTicketQuantityTotal(eventId: number, excludeTicketTypeId?: number) {
  const ticketTypes = await this.prisma.ticketType.findMany({
    where: {
      eventId,
      ...(excludeTicketTypeId ? { id: { not: excludeTicketTypeId } } : {}),
    },
    select: {
      quantity: true,
    },
  });

  return ticketTypes.reduce((total, ticketType) => total + ticketType.quantity, 0);
}

// ------------------------------------------------------------------------------------
//  EVENTS
// ------------------------------------------------------------------------------------

  async create(createEventDto: CreateEventDto, organizerId: number) {
    this.validateDateRange(
      createEventDto.startDateTime,
      createEventDto.endDateTime,
    );

    return this.prisma.event.create({
      data: {
        title: createEventDto.title,
        eventType: createEventDto.eventType,
        venue: createEventDto.venue,
        address: createEventDto.address,
        city: createEventDto.city,
        country: createEventDto.country,
        latitude: createEventDto.latitude,
        longitude: createEventDto.longitude,
        startDateTime: new Date(createEventDto.startDateTime),
        endDateTime: new Date(createEventDto.endDateTime),
        capacity: createEventDto.capacity,
        description: createEventDto.description,
        organizerId,
      },
    });
  }

  async findAll(filters: EventFilters = {}) {
    const status = this.parseStatus(filters.status);
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 50);
    const shouldPaginate = Boolean(filters.page || filters.limit);

    const where = {
      ...(status ? { status: status } : {}),
      ...(filters.city
        ? { city: { contains: filters.city, mode: 'insensitive' as const } }
        : {}),
      ...(filters.eventType ? { eventType: filters.eventType } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' as const } },
              { description: { contains: filters.search, mode: 'insensitive' as const } },
              { venue: { contains: filters.search, mode: 'insensitive' as const } },
              { address: { contains: filters.search, mode: 'insensitive' as const } },
              { city: { contains: filters.search, mode: 'insensitive' as const } },
              { country: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(filters.categoryId
        ? {
            eventCategories: {
              some: {
                categoryId: Number(filters.categoryId),
              },
            },
          }
        : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startDateTime: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
      ...(filters.minPrice || filters.maxPrice
        ? {
            ticketTypes: {
              some: {
                price: {
                  ...(filters.minPrice ? { gte: Number(filters.minPrice) } : {}),
                  ...(filters.maxPrice ? { lte: Number(filters.maxPrice) } : {}),
                },
              },
            },
          }
        : {}),
    };

    const include = {
      organizer: {
        select: {
          id: true,
          username: true,
        },
      },
      ticketTypes: true,
      photos: true,
      eventCategories: {
        include: {
          category: true,
        },
      },
    };

    const query = {
      where,
      include,
      orderBy: {
        startDateTime: 'asc' as const,
      },
      ...(shouldPaginate && limit
        ? {
            skip: (page - 1) * limit,
            take: limit,
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany(query),
      this.prisma.event.count({ where }),
    ]);

    if (!shouldPaginate || !limit) {
      return items;
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  // Να επιστρέφει όλα τα events που έχει δημιουργήσει ο τρέχων χρήστης
  async findMine(userId: number) {
    return this.prisma.event.findMany({
      where: {
        organizerId: userId,
      },
      include: {
        ticketTypes: true,
        photos: true,
        eventCategories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Να επιστρέφει ένα συγκεκριμένο event από τη βάση ή 404 αν δεν υπάρχει
  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
          },
        },
        ticketTypes: true, 
        photos: true, 
        eventCategories: {
          include: {
            category: true, 
          },
        },
      },
    });
    
    if (!event) {
      throw new NotFoundException(`Event not found`);
    }

    return event;
  }

  
  async recordView(eventId: number, userId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId === userId) {
      return { recorded: false, reason: 'Organizer view is ignored' };
    }

    if (event.status !== EventStatus.PUBLISHED) {
      return { recorded: false, reason: 'Only published event views are recorded' };
    }

    await this.prisma.eventView.create({
      data: {
        eventId,
        userId,
      },
    });

    return { recorded: true };
  }
  

  async update(id: number, updateEventDto: UpdateEventDto, user: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);

    // αν υπάρχει update χρησιμοποιησε το, αλλιώς κράτα το παλιό 
    const nextStartDate = updateEventDto.startDateTime ?? event.startDateTime;
    const nextEndDate = updateEventDto.endDateTime ?? event.endDateTime;
    const nextCapacity = updateEventDto.capacity ?? event.capacity;

    this.validateDateRange(nextStartDate, nextEndDate);

    if (nextCapacity < event.reservedSeats) {
      throw new BadRequestException('Capacity cannot be lower than reserved seats');
    }

    await this.prisma.event.update({
      where: { id },
      data: {
        ...updateEventDto,
        ...(updateEventDto.startDateTime
          ? { startDateTime: new Date(updateEventDto.startDateTime) }
          : {}),
        ...(updateEventDto.endDateTime
          ? { endDateTime: new Date(updateEventDto.endDateTime) }
          : {}),
      },
    });

    // Επιστρέφουμε το event μαζί με ticketTypes, photos και categories,
    // όπως και η setEventCategories, για να μη χάνονται στο frontend.
    return this.findOne(id);
  }

  async publish(id: number, user: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);
    this.validateDateRange(event.startDateTime, event.endDateTime);

    const categoryCount = await this.prisma.eventCategory.count({
      where: { eventId: id },
    });

    if (categoryCount === 0) {
      throw new BadRequestException(
        'Event must have at least one category before publishing',
      );
    }

    const ticketQuantityTotal = await this.getTicketQuantityTotal(id);

    if (ticketQuantityTotal === 0) {
      throw new BadRequestException(
        'Event must have at least one ticket type before publishing',
      );
    }

    if (ticketQuantityTotal !== event.capacity) {
      throw new BadRequestException(
        'Total ticket quantity must equal event capacity before publishing',
      );
    }

    if (event.capacity <= event.reservedSeats) {
      throw new BadRequestException('Event has no available capacity');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.PUBLISHED,
      },
    });
  }

  async cancel(id: number, user: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);

    // Έλεγχος αν το event έχει ήδη ολοκληρωθεί ή ακυρωθεί
    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Completed events cannot be cancelled');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled');
    }

    const cancelledEvent = await this.prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: {
          eventId: id,
          status: {
            not: 'CANCELLED',
          },
        },
        data: {
          status: 'CANCELLED',
        },
      });

      return tx.event.update({
        where: { id },
        data: {
          status: EventStatus.CANCELLED,
        },
      });
    });

    // Ο διοργανωτής ενημερώνει όλους όσους είχαν κράτηση ότι το event ακυρώθηκε.
    await this.messagesService.sendCancellationAnnouncement(
      id,
      {
        subject: `Event cancelled: ${event.title}`,
        content:
          `We are sorry to inform you that the event "${event.title}" ` +
          `has been cancelled. Your booking has been cancelled as well.`,
      },
      event.organizerId,
    );

    return cancelledEvent;
  }

  async deleteEvent(id: number, user: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        bookings: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);

    if (event.reservedSeats > 0 || event.bookings.length > 0) {
      throw new BadRequestException(
        'Event cannot be deleted after the first booking',
      );
    }

    if (event.status === EventStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published events must be cancelled instead of deleted',
      );
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Completed events cannot be deleted');
    }

    return this.prisma.event.delete({
      where: { id },
    });
  }

// ------------------------------------------------------------------------------------
//  TICKETS
// ------------------------------------------------------------------------------------

  // Create a new ticket type for a specific event, ensuring that the user has permission to manage the event
  async createTicketType(
    eventId: number,
    createTicketTypeDto: CreateTicketTypeDto,
    user: CurrentUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);

    // υπάρχοντα tickets + νέο ticket quantity <= event.capacity
    const currentQuantityTotal = await this.getTicketQuantityTotal(eventId);
    const nextQuantityTotal = currentQuantityTotal + createTicketTypeDto.quantity;

    if (nextQuantityTotal > event.capacity) {
      throw new BadRequestException(
        'Total ticket quantity cannot exceed event capacity',
      );
    }

    return this.prisma.ticketType.create({
      data: {
        eventId,
        name: createTicketTypeDto.name,
        price: createTicketTypeDto.price,
        quantity: createTicketTypeDto.quantity,
        available: createTicketTypeDto.quantity,  // ολα τα tickets είναι διαθέσιμα στην αρχή
      },
    });
  }


  async updateTicketType(
    eventId: number,
    ticketTypeId: number,
    updateTicketTypeDto: UpdateTicketTypeDto,
    user: CurrentUser,
  ) {
    // Eλέχγει οτι υπαρχει event και οτι ο χρήστης έχει δικαίωμα να το διαχειριστεί
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);

    // Eλέγχει οτι υπαρχει ticket type και οτι ανήκει στο συγκεκριμένο event
    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id: ticketTypeId,
        eventId,
      },
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    // Ετοιμάζει τα δεδομένα για την ενημέρωση
    const data: {
      name?: string;
      price?: number;
      quantity?: number;
      available?: number;
    } = {};

    if (updateTicketTypeDto.name !== undefined) {
      data.name = updateTicketTypeDto.name;
    }

    if (updateTicketTypeDto.price !== undefined) {
      data.price = updateTicketTypeDto.price;
    }

    if (updateTicketTypeDto.quantity !== undefined) {
      const reserved = ticketType.quantity - ticketType.available;

      if (updateTicketTypeDto.quantity < reserved) {
        throw new BadRequestException(
          'Quantity cannot be lower than already reserved tickets',
        );
      }

      // Υπολογίζει το συνολικό αριθμό εισιτηρίων για το event, εξαιρώντας τον τρέχοντα τύπο εισιτηρίου
      const otherTicketQuantityTotal = await this.getTicketQuantityTotal(
        eventId,
        ticketTypeId,
      );

      const nextQuantityTotal = otherTicketQuantityTotal + updateTicketTypeDto.quantity;

      if (nextQuantityTotal > event.capacity) {
        throw new BadRequestException(
          'Total ticket quantity cannot exceed event capacity',
        );
}

      // Ενημερώνει την ποσότητα και τα διαθέσιμα εισιτήρια
      data.quantity = updateTicketTypeDto.quantity;
      data.available = updateTicketTypeDto.quantity - reserved;
    }

    return this.prisma.ticketType.update({
      where: { id: ticketTypeId },
      data,
    });
  }

  async deleteTicketType(
    eventId: number,
    ticketTypeId: number,
    user: CurrentUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);

    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id: ticketTypeId,
        eventId,
      },
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    return this.prisma.ticketType.delete({
      where: {
        id: ticketTypeId,
      },
    });
  }

// ------------------------------------------------------------------------------------
//  CATEGORIES
// ------------------------------------------------------------------------------------

  async findCategories() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
      },
    });
  }

  async setEventCategories(
    eventId: number,
    setEventCategoriesDto: SetEventCategoriesDto,
    user: CurrentUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: setEventCategoriesDto.categoryIds,
        },
      },
    });

    if (categories.length !== setEventCategoriesDto.categoryIds.length) {
      throw new BadRequestException('One or more categories do not exist');
    }

    await this.prisma.eventCategory.deleteMany({
      where: {
        eventId,
      },
    });

    await this.prisma.eventCategory.createMany({
      data: setEventCategoriesDto.categoryIds.map((categoryId) => ({
        eventId,
        categoryId,
      })),
    });

    return this.findOne(eventId);
  }

// ------------------------------------------------------------------------------------
//  PHOTOS
// ------------------------------------------------------------------------------------

  // Add a photo to a specific event, ensuring that the user has permission to manage the event
  async addPhoto(
    eventId: number,
    createPhotoDto: CreatePhotoDto,
    user: CurrentUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);

    return this.prisma.photo.create({
      data: {
        eventId,
        filePath: createPhotoDto.filePath,
      },
    });
  }

  async deletePhoto(
    eventId: number,
    photoId: number,
    user: CurrentUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.ensureCanManageEvent(event, user);
    this.ensureEventIsEditable(event);

    const photo = await this.prisma.photo.findFirst({
      where: {
        id: photoId,
        eventId,
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return this.prisma.photo.delete({
      where: {
        id: photoId,
      },
    });
  }

}