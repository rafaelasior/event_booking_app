import { Injectable } from '@nestjs/common';
import { EventStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { createInterface } from 'readline';
import { dirname, join } from 'path';

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

type SavedFactorModel = {
  globalMean: number;
  userBias: [number, number][];
  eventBias: [number, number][];
  userFactors: [number, number[]][];
  eventFactors: [number, number[]][];
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  private modelPath() {
    return join(process.cwd(), 'private-data', 'recommendations', 'model.json');
  }

  private serializeModel(model: FactorModel): SavedFactorModel {
    return {
      globalMean: model.globalMean,
      userBias: [...model.userBias.entries()],
      eventBias: [...model.eventBias.entries()],
      userFactors: [...model.userFactors.entries()],
      eventFactors: [...model.eventFactors.entries()],
    };
  }

  private deserializeModel(savedModel: SavedFactorModel): FactorModel {
    return {
      globalMean: savedModel.globalMean,
      userBias: new Map(savedModel.userBias),
      eventBias: new Map(savedModel.eventBias),
      userFactors: new Map(savedModel.userFactors),
      eventFactors: new Map(savedModel.eventFactors),
    };
  }

  private loadSavedModel(): FactorModel | null {
    const path = this.modelPath();

    if (!existsSync(path)) {
      return null;
    }

    const savedModel = JSON.parse(
      readFileSync(path, 'utf8'),
    ) as SavedFactorModel;

    return this.deserializeModel(savedModel);
  }

  async trainAndSaveModel() {
    const appInteractions = await this.loadAppInteractions();
    const datasetInteractions = await this.loadDatasetInteractions();
    const interactions = [...datasetInteractions, ...appInteractions];

    if (!interactions.length) {
      throw new Error('No recommendation interactions available for training');
    }

    const model = this.trainModel(interactions);
    const path = this.modelPath();

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(this.serializeModel(model)));

    return {
      modelPath: path,
      datasetInteractions: datasetInteractions.length,
      appInteractions: appInteractions.length,
      totalInteractions: interactions.length,
    };
  }

  private dot(a: number[], b: number[]) {
    return a.reduce((sum, value, index) => sum + value * b[index], 0);
  }

  private randomFactors(size: number) {
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1);
  }

  private trainModel(interactions: Interaction[]): FactorModel {
    const factors = 8;
    const epochs = 60;
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

  private predict(model: FactorModel, userId: number, eventId: number) {
    const userBias = model.userBias.get(userId) ?? 0;
    const eventBias = model.eventBias.get(eventId) ?? 0;
    const userFactors = model.userFactors.get(userId);
    const eventFactors = model.eventFactors.get(eventId);

    const factorScore =
      userFactors && eventFactors ? this.dot(userFactors, eventFactors) : 0;

    return model.globalMean + userBias + eventBias + factorScore;
  }

  private async loadAppInteractions(): Promise<Interaction[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        attendeeId: true,
        eventId: true,
        numberOfTickets: true,
      },
    });

    const views = await this.prisma.eventView.findMany({
      select: {
        userId: true,
        eventId: true,
      },
    });

    const bookingInteractions: Interaction[] = bookings.map((booking) => ({
      userId: booking.attendeeId,
      eventId: booking.eventId,
      rating: Math.min(5, 4 + booking.numberOfTickets * 0.25),
    }));

    const viewInteractions: Interaction[] = views.map((view) => ({
      userId: view.userId,
      eventId: view.eventId,
      rating: 2,
    }));

    return [...bookingInteractions, ...viewInteractions];
  }

  private async loadDatasetInteractions(limit = 20000): Promise<Interaction[]> {
    const datasetPath = join(
      process.cwd(),
      'private-data',
      'recommendations',
      'dataset',
      'rel_event_csvs',
      'event_interest.csv',
    );

    if (!existsSync(datasetPath)) {
      return [];
    }

    const interactions: Interaction[] = [];
    const file = createInterface({
      input: createReadStream(datasetPath),
      crlfDelay: Infinity,
    });

    let isHeader = true;

    for await (const line of file) {
      if (isHeader) {
        isHeader = false;
        continue;
      }

      if (interactions.length >= limit) {
        break;
      }

      const [user, event, invited, , interested, notInterested] =
        line.split(',');

      const userId = Number(user);
      const eventId = Number(event);

      if (!Number.isFinite(userId) || !Number.isFinite(eventId)) {
        continue;
      }

      let rating = 0;

      if (notInterested === '1') {
        rating = 1;
      } else if (interested === '1') {
        rating = 4;
      } else if (invited === '1') {
        rating = 2;
      } else {
        rating = 2.5;
      }

      interactions.push({
        userId: -userId - 1,
        eventId: -eventId - 1,
        rating,
      });
    }

    return interactions;
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

    const candidateEvents = await this.prisma.event.findMany({
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
    });

    if (!candidateEvents.length) {
      return [];
    }

    const model = this.loadSavedModel();

    if (!model) {
      return this.fallbackRecommendations(candidateEvents);
    }

    return candidateEvents
      .map((event) => ({
        event,
        score: this.predict(model, userId, event.id),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((recommendation) => recommendation.event);
  }

  private fallbackRecommendations<T extends { reservedSeats: number; startDateTime: Date }>(
    candidateEvents: T[],
  ) {
    return candidateEvents
      .sort((a, b) => {
        if (b.reservedSeats !== a.reservedSeats) {
          return b.reservedSeats - a.reservedSeats;
        }

        return (
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
        );
      })
      .slice(0, 6);
  }
}
