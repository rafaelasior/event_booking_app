import { Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit } from '@nestjs/common';
import { EventStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';

// Παράμετροι του Biased MF
const factors = 16;
const epochs = 60;
const learningRate = 0.02;
const regularization = 0.05;
const negativesPerPositive = 3;
const foldInEpochs = 50;
const retrainIntervalMs = 10 * 60 * 1000;


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

type UserVector = {
  bias: number;
  factors: number[];
};


type SavedFactorModel = {
  globalMean: number;
  userBias: [number, number][];
  eventBias: [number, number][];
  userFactors: [number, number[]][];
  eventFactors: [number, number[]][];
};

@Injectable()
export class RecommendationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecommendationsService.name);
  private model: FactorModel | null = null;
  private retrainTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  // Με την εκκίνηση: παίρνει το αποθηκευμένο μοντέλο, εκπαιδεύει με τα τρέχοντα
  // δεδομένα και ξαναεκπαιδεύει κάθε retrainIntervalMs
  async onModuleInit() {
    this.model = this.loadSavedModel();
    await this.retrain();
    this.retrainTimer = setInterval(() => void this.retrain(), retrainIntervalMs);
  }

  onModuleDestroy() {
    clearInterval(this.retrainTimer);
  }

  private async retrain() {
    try {
      const result = await this.trainAndSaveModel();
      this.logger.log(`Model trained on ${result.totalInteractions} interactions`);
    } catch (error) {
      this.logger.warn(`Model not trained: ${(error as Error).message}`);
    }
  }


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
    // Κρατήσεις και επισκέψεις από τη βάση, μαζί με όσα έφερε το seed-recommender
    const interactions = await this.loadAppInteractions();

    if (!interactions.length) {
      throw new Error('No recommendation interactions available for training');
    }

    const model = this.trainModel(interactions);
    const path = this.modelPath();
    this.model = model;


    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(this.serializeModel(model)));

    return {
      modelPath: path,
      totalInteractions: interactions.length,
    };
  }

  // Leave-one-out: κρύβει μία αλληλεπίδραση ανά χρήστη, εκπαιδεύει χωρίς αυτήν
  // και μετράει πόσο συχνά η κρυμμένη εκδήλωση μπαίνει στις topN πρώτες
  async evaluate(topN = 10) {
    const interactions = await this.loadAppInteractions();
    const byUser = new Map<number, Interaction[]>();

    for (const interaction of interactions) {
      if (!byUser.has(interaction.userId)) {
        byUser.set(interaction.userId, []);
      }

      byUser.get(interaction.userId)!.push(interaction);
    }

    const training: Interaction[] = [];
    const hidden: Interaction[] = [];

    for (const userInteractions of byUser.values()) {
      if (userInteractions.length < 2) {
        training.push(...userInteractions);
        continue;
      }

      const hiddenIndex = Math.floor(Math.random() * userInteractions.length);

      hidden.push(userInteractions[hiddenIndex]);
      training.push(
        ...userInteractions.filter((_, index) => index !== hiddenIndex),
      );
    }

    const rmseByEpoch: number[] = [];
    const model = this.trainModel(training, (_, rmse) => rmseByEpoch.push(rmse));

    // Δημοφιλία = πόσοι χρήστες αλληλεπίδρασαν με κάθε εκδήλωση
    const popularity = new Map<number, number>();

    for (const interaction of training) {
      popularity.set(
        interaction.eventId,
        (popularity.get(interaction.eventId) ?? 0) + 1,
      );
    }

    const eventIds = [...model.eventFactors.keys()];
    let modelHits = 0;
    let popularityHits = 0;

    for (const target of hidden) {
      const userTraining = training.filter(
        (interaction) => interaction.userId === target.userId,
      );
      const seen = new Set(userTraining.map((interaction) => interaction.eventId));
      const candidates = eventIds.filter((eventId) => !seen.has(eventId));

      // Ίδια διαδρομή με τις πραγματικές προτάσεις: fold-in και predict
      const user = this.foldInUser(model, target.userId, userTraining);

      const byModel = candidates
        .map((eventId) => ({ eventId, score: this.predict(model, user, eventId) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map((candidate) => candidate.eventId);

      const byPopularity = [...candidates]
        .sort((a, b) => (popularity.get(b) ?? 0) - (popularity.get(a) ?? 0))
        .slice(0, topN);

      if (byModel.includes(target.eventId)) {
        modelHits++;
      }

      if (byPopularity.includes(target.eventId)) {
        popularityHits++;
      }
    }

    return {
      users: hidden.length,
      rmseByEpoch,
      modelHitRate: modelHits / hidden.length,
      popularityHitRate: popularityHits / hidden.length,
      randomHitRate: topN / eventIds.length,
    };
  }

  private dot(a: number[], b: number[]) {
    return a.reduce((sum, value, index) => sum + value * b[index], 0);
  }

  private randomFactors(size: number) {
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1);
  }

  // Τυχαίες εκδηλώσεις που ο χρήστης δεν έχει δει ούτε κλείσει, με βαθμό 1.
  // Χωρίς αυτές το μοντέλο βλέπει μόνο θετικά και δεν μαθαίνει τι δεν αρέσει.
  private sampleNegatives(
    seenByUser: Map<number, Set<number>>,
    eventIds: number[],
    negativesPerPositive: number,
  ): Interaction[] {
    const negatives: Interaction[] = [];

    for (const [userId, seen] of seenByUser) {
      const wanted = Math.min(
        seen.size * negativesPerPositive,
        eventIds.length - seen.size,
      );
      const picked = new Set<number>();

      while (picked.size < wanted) {
        const eventId = eventIds[Math.floor(Math.random() * eventIds.length)];

        if (!seen.has(eventId)) {
          picked.add(eventId);
        }
      }

      for (const eventId of picked) {
        negatives.push({ userId, eventId, rating: 1 });
      }
    }

    return negatives;
  }

  // Fisher-Yates: ανακατεύει τη σειρά ώστε το SGD να μη βλέπει πάντα τα ίδια πρώτα
  private shuffle<T>(items: T[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }


  private trainModel(
    interactions: Interaction[],
    onEpoch?: (epoch: number, rmse: number) => void,
  ): FactorModel {
    const eventIds = [
      ...new Set(interactions.map((interaction) => interaction.eventId)),
    ];
    const seenByUser = new Map<number, Set<number>>();

    for (const interaction of interactions) {
      if (!seenByUser.has(interaction.userId)) {
        seenByUser.set(interaction.userId, new Set());
      }

      seenByUser.get(interaction.userId)!.add(interaction.eventId);
    }

    // Ο μέσος όρος μετράει και τα αρνητικά, αφού εκπαιδεύουμε και με αυτά
    const firstSample = [
      ...interactions,
      ...this.sampleNegatives(seenByUser, eventIds, negativesPerPositive),
    ];
    const globalMean =
      firstSample.reduce((sum, interaction) => sum + interaction.rating, 0) /
      firstSample.length;


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
      // Νέα αρνητικά σε κάθε εποχή, ανακατεμένα με τα θετικά
      const epochInteractions = this.shuffle([
        ...interactions,
        ...this.sampleNegatives(seenByUser, eventIds, negativesPerPositive),
      ]);
      let squaredErrors = 0;

      for (const interaction of epochInteractions) {
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
        squaredErrors += error * error;

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

      onEpoch?.(
        epoch + 1,
        Math.sqrt(squaredErrors / epochInteractions.length),
      );
    }

    return {
      globalMean,
      userBias,
      eventBias,
      userFactors,
      eventFactors,
    };
  }

  private predict(model: FactorModel, user: UserVector, eventId: number) {
    const eventBias = model.eventBias.get(eventId) ?? 0;
    const eventFactors = model.eventFactors.get(eventId);

    const factorScore = eventFactors ? this.dot(user.factors, eventFactors) : 0;

    return model.globalMean + user.bias + eventBias + factorScore;
  }

  // Fold-in: βρίσκει b_u και p_u ενός χρήστη από τις δικές του βαθμολογίες,
  // με το ίδιο SGD αλλά κρατώντας σταθερά τα b_i και q_i του μοντέλου.
  // Έτσι δουλεύει και για χρήστες που δεν υπήρχαν στην τελευταία εκπαίδευση.
  private foldInUser(
    model: FactorModel,
    userId: number,
    interactions: Interaction[],
  ): UserVector {
    const user: UserVector = {
      bias: 0,
      factors: new Array<number>(factors).fill(0),
    };

    // Μόνο εκδηλώσεις που ξέρει το μοντέλο έχουν b_i και q_i
    const known = interactions.filter((interaction) =>
      model.eventFactors.has(interaction.eventId),
    );

    if (!known.length) {
      return user;
    }

    const eventIds = [...model.eventFactors.keys()];
    const seenByUser = new Map([
      [userId, new Set(known.map((interaction) => interaction.eventId))],
    ]);

    for (let epoch = 0; epoch < foldInEpochs; epoch++) {
      const epochInteractions = this.shuffle([
        ...known,
        ...this.sampleNegatives(seenByUser, eventIds, negativesPerPositive),
      ]);

      for (const interaction of epochInteractions) {
        const eventBias = model.eventBias.get(interaction.eventId)!;
        const eventFactors = model.eventFactors.get(interaction.eventId)!;

        const prediction =
          model.globalMean +
          user.bias +
          eventBias +
          this.dot(user.factors, eventFactors);

        const error = interaction.rating - prediction;

        user.bias += learningRate * (error - regularization * user.bias);

        for (let index = 0; index < factors; index++) {
          user.factors[index] +=
            learningRate *
            (error * eventFactors[index] - regularization * user.factors[index]);
        }
      }
    }

    return user;
  }



  // Με userId φέρνει μόνο τις βαθμολογίες αυτού του χρήστη
  private async loadAppInteractions(userId?: number): Promise<Interaction[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: {
          not: 'CANCELLED',
        },
        ...(userId ? { attendeeId: userId } : {}),
      },
      select: {
        attendeeId: true,
        eventId: true,
      },
    });

    const views = await this.prisma.eventView.findMany({
      where: userId ? { userId } : {},
      select: {

        userId: true,
        eventId: true,
      },
    });

    const ratings = new Map<string, Interaction>();

    const setRating = (userId: number, eventId: number, rating: number) => {
      const key = `${userId},${eventId}`;
      const current = ratings.get(key);

      if (!current || current.rating < rating) {
        ratings.set(key, { userId, eventId, rating });
      }
    };

    for (const view of views) {
      const viewedBefore = ratings.has(`${view.userId},${view.eventId}`);
      setRating(view.userId, view.eventId, viewedBefore ? 4 : 3);
    }

    for (const booking of bookings) {
      setRating(booking.attendeeId, booking.eventId, 5);
    }

    return [...ratings.values()];
  }



  async findForUser(userId: number) {
    // Αν ο χρήστης δεν έχει κρατήσεις, εδώ υπάρχουν μόνο οι επισκέψεις του,
    // άρα οι προτάσεις βγαίνουν μόνο από τις εκδηλώσεις που έχει δει
    const userInteractions = await this.loadAppInteractions(userId);
    const excludedEventIds = userInteractions.map(
      (interaction) => interaction.eventId,
    );


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
        // Όχι γεμάτες: να υπάρχουν θέσεις και διαθέσιμα εισιτήρια
        reservedSeats: {
          lt: this.prisma.event.fields.capacity,
        },
        ticketTypes: {
          some: {
            available: {
              gt: 0,
            },
          },
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

    const model = this.model;

    if (!model) {
      return this.fallbackRecommendations(candidateEvents);
    }

    const user = this.foldInUser(model, userId, userInteractions);

    const ranked = candidateEvents
      .filter((event) => model.eventFactors.has(event.id))
      .map((event) => ({
        event,
        score: this.predict(model, user, event.id),
      }))
      .sort((a, b) => b.score - a.score)
      .map((recommendation) => recommendation.event);

    // Εκδηλώσεις χωρίς καμία αλληλεπίδραση δεν υπάρχουν στο μοντέλο: μπαίνουν τελευταίες
    const unknown = candidateEvents.filter(
      (event) => !model.eventFactors.has(event.id),
    );

    return [...ranked, ...unknown].slice(0, 6);
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
