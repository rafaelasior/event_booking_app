import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventData: {
    title: string;
    eventType: string;
    venue: string;
    address: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
    startDateTime: string;
    endDateTime: string;
    capacity: number;
    description: string;
    organizerId: number;
  }) {

    const startDate = new Date(createEventData.startDateTime);
    const endDate = new Date(createEventData.endDateTime);

    if (endDate <= startDate) {
    throw new BadRequestException(
        'End date must be after start date',
    );
    }

    if (createEventData.capacity <= 0) {
    throw new BadRequestException(
        'Capacity must be greater than zero',
    );
    }
    return this.prisma.event.create({
      data: {
        title: createEventData.title,
        eventType: createEventData.eventType,
        venue: createEventData.venue,
        address: createEventData.address,
        city: createEventData.city,
        country: createEventData.country,
        latitude: createEventData.latitude,
        longitude: createEventData.longitude,
        startDateTime: new Date(createEventData.startDateTime),
        endDateTime: new Date(createEventData.endDateTime),
        capacity: createEventData.capacity,
        description: createEventData.description,
        organizerId: createEventData.organizerId,
      },
    });
  }
}