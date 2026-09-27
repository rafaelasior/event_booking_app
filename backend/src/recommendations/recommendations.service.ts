import { Injectable } from '@nestjs/common';
import { EventStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Interaction = {
  userId: number;
  eventId: number;
  rating: number;
};

type FactorModel = {
  globalMean: number;
  userBias: Map<number, number>;
  eventBias: Map<number, number>;
  userFactors: Map<number, number[]>;
  eventFactors: Map<number, number[]>;
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Train a simple collaborative filtering model using matrix factorization
  private dot(a: number[], b: number[]) {
    return a.reduce((sum, value, index) => sum + value * b[index], 0);
  }

  // Generate random factors for users and events
  private randomFactors(size: number) {
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1);
  }

  private trainModel(interactions: Interaction[]): FactorModel {
    const factors = 8;
    const epochs = 80;
    const learningRate = 0.01;
    const regularization = 0.02;

    const globalMean =
      interactions.reduce((sum, interaction) => sum + interaction.rating, 0) /
      interactions.length;

    const userBias = new Map<number, number>();
    const eventBias = new Map<number, number>();
    const userFactors = new Map<number, number[]>();
    const eventFactors = new Map<number, number[]>();

    for (const interaction of interactions) {
      if (!userBias.has(interaction.userId)) {
        userBias.set(interaction.userId, 0);
        userFactors.set(interaction.userId, this.randomFactors(factors));
      }

      if (!eventBias.has(interaction.eventId)) {
        eventBias.set(interaction.eventId, 0);
        eventFactors.set(interaction.eventId, this.randomFactors(factors));
      }
    }

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const interaction of interactions) {
        const currentUserBias = userBias.get(interaction.userId) ?? 0;
        const currentEventBias = eventBias.get(interaction.eventId) ?? 0;
        const currentUserFactors = userFactors.get(interaction.userId)!;
        const currentEventFactors = eventFactors.get(interaction.eventId)!;

        const prediction =
          globalMean +
          currentUserBias +
          currentEventBias +
          this.dot(currentUserFactors, currentEventFactors);

        const error = interaction.rating - prediction;

        userBias.set(
          interaction.userId,
          currentUserBias +
            learningRate * (error - regularization * currentUserBias),
        );

        eventBias.set(
          interaction.eventId,
          currentEventBias +
            learningRate * (error - regularization * currentEventBias),
        );

        for (let index = 0; index < factors; index++) {
          const userFactor = currentUserFactors[index];
          const eventFactor = currentEventFactors[index];

          currentUserFactors[index] =
            userFactor +
            learningRate * (error * eventFactor - regularization * userFactor);

          currentEventFactors[index] =
            eventFactor +
            learningRate * (error * userFactor - regularization * eventFactor);
        }
      }
    }

    return {
      globalMean,
      userBias,
      eventBias,
      userFactors,
      eventFactors,
    };
  }

  async findForUser(userId: number) {
    const bookedEventIds = await this.prisma.booking.findMany({
      where: {
        attendeeId: userId,
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        eventId: true,
      },
      distinct: ['eventId'],
    });

    const viewedEventIds = await this.prisma.eventView.findMany({
      where: {
        userId,
      },
      select: {
        eventId: true,
      },
      distinct: ['eventId'],
    });

    const excludedEventIds = [
      ...bookedEventIds.map((booking) => booking.eventId),
      ...viewedEventIds.map((view) => view.eventId),
    ];

    return this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        startDateTime: {
          gt: new Date(),
        },
        organizerId: {
          not: userId,
        },
        id: {
          notIn: excludedEventIds,
        },
      },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
          },
        },
        ticketTypes: true,
        eventCategories: {
          include: {
            category: true,
          },
        },
        photos: true,
      },
      orderBy: [
        {
          reservedSeats: 'desc',
        },
        {
          startDateTime: 'asc',
        },
      ],
      take: 6,
    });
  }
}