import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../prisma/prisma.service';

type TestBooking = { attendeeId: number; eventId: number };
type TestView = { userId: number; eventId: number };

// Δύο ομάδες: οι χρήστες 1-30 ασχολούνται με τα events 1-10
// και οι χρήστες 31-60 με τα events 11-20
function makeData() {
  const bookings: TestBooking[] = [];
  const views: TestView[] = [];

  for (let userId = 1; userId <= 60; userId++) {
    const first = userId <= 30 ? 1 : 11;
    const eventAt = (step: number) => first + ((userId + step) % 10);

    bookings.push(
      { attendeeId: userId, eventId: eventAt(0) },
      { attendeeId: userId, eventId: eventAt(1) },
    );
    views.push(
      { userId, eventId: eventAt(2) },
      { userId, eventId: eventAt(3) },
    );
  }

  return { bookings, views };
}

let bookings: TestBooking[] = [];
let views: TestView[] = [];

// Η event 1 έχει τις περισσότερες κρατημένες θέσεις, η 20 τις λιγότερες
const events = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  reservedSeats: 20 - index,
  startDateTime: new Date('2030-01-01'),
}));

const prisma = {
  booking: {
    findMany: jest.fn(({ where }) =>
      bookings.filter(
        (booking) => !where.attendeeId || booking.attendeeId === where.attendeeId,
      ),
    ),
  },
  eventView: {
    findMany: jest.fn(({ where }) =>
      views.filter((view) => !where.userId || view.userId === where.userId),
    ),
  },
  event: {
    fields: { capacity: 'capacity' },
    findMany: jest.fn(({ where }) =>
      events.filter((event) => !where.id.notIn.includes(event.id)),
    ),
  },
};

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    ({ bookings, views } = makeData());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  // Εκπαιδεύει χωρίς να γράψει το model.json
  async function train() {
    const interactions = await service['loadAppInteractions']();
    service['model'] = service['trainModel'](interactions);
  }

  // Μέση προβλεπόμενη βαθμολογία του χρήστη για κάποια events
  async function averageScore(userId: number, eventIds: number[]) {
    const model = service['model']!;
    const interactions = await service['loadAppInteractions'](userId);
    const user = service['foldInUser'](model, userId, interactions);
    const scores = eventIds.map((eventId) =>
      service['predict'](model, user, eventId),
    );

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  const ids = (recommendations: { id: number }[]) =>
    recommendations.map((event) => event.id);

  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => from + index);

  it('μία βαθμολογία ανά ζεύγος: επίσκεψη 3, ξανά επίσκεψη 4, κράτηση 5', async () => {
    bookings = [{ attendeeId: 1, eventId: 1 }];
    views = [
      { userId: 1, eventId: 1 },
      { userId: 1, eventId: 2 },
      { userId: 1, eventId: 3 },
      { userId: 1, eventId: 3 },
    ];

    const ratings = await service['loadAppInteractions']();

    expect(ratings).toHaveLength(3);
    expect(ratings).toEqual(
      expect.arrayContaining([
        { userId: 1, eventId: 1, rating: 5 },
        { userId: 1, eventId: 2, rating: 3 },
        { userId: 1, eventId: 3, rating: 4 },
      ]),
    );
  });

  it('η εκπαίδευση μειώνει το RMSE', async () => {
    const interactions = await service['loadAppInteractions']();
    const rmse: number[] = [];

    service['trainModel'](interactions, (_, value) => rmse.push(value));

    expect(rmse).toHaveLength(60);
    expect(rmse[59]).toBeLessThan(rmse[0]);
  });

  it('χρήστης με κρατήσεις: προτάσεις από την ομάδα του, χωρίς όσα έχει ήδη', async () => {
    await train();

    // ο χρήστης 1 έκλεισε τα 2, 3 και είδε τα 4, 5
    const result = ids(await service.findForUser(1));

    expect(result).toHaveLength(6);
    [2, 3, 4, 5].forEach((eventId) => expect(result).not.toContain(eventId));
    expect(result[0]).toBeLessThanOrEqual(10);
    expect(await averageScore(1, [1, 6, 7, 8, 9, 10])).toBeGreaterThan(
      await averageScore(1, range(11, 20)),
    );
  });

  it('χρήστης χωρίς κρατήσεις: προτάσεις μόνο από τις επισκέψεις του (cold start)', async () => {
    await train();

    // νέος χρήστης, δεν υπήρχε στην εκπαίδευση, είδε δύο events της ομάδας 11-20
    views.push({ userId: 100, eventId: 11 }, { userId: 100, eventId: 12 });

    const result = ids(await service.findForUser(100));

    expect(result).not.toContain(11);
    expect(result).not.toContain(12);
    expect(result[0]).toBeGreaterThan(10);
    expect(await averageScore(100, range(13, 20))).toBeGreaterThan(
      await averageScore(100, range(1, 10)),
    );
  });

  it('χρήστης χωρίς καμία αλληλεπίδραση: σειρά κατά μ + b_i', async () => {
    await train();

    const expected = [...service['model']!.eventBias.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([eventId]) => eventId);

    expect(ids(await service.findForUser(200))).toEqual(expected);
  });

  it('χωρίς μοντέλο: οι εκδηλώσεις με τις περισσότερες κρατημένες θέσεις', async () => {
    expect(ids(await service.findForUser(200))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('ζητάει μόνο δημοσιευμένες, μελλοντικές, όχι δικές του, όχι γεμάτες', async () => {
    bookings = [{ attendeeId: 1, eventId: 3 }];
    views = [{ userId: 1, eventId: 7 }];

    await service.findForUser(1);

    const { where } = prisma.event.findMany.mock.lastCall![0];

    expect(where.status).toBe('PUBLISHED');
    expect(where.startDateTime.gt).toBeInstanceOf(Date);
    expect(where.organizerId).toEqual({ not: 1 });
    expect(where.id.notIn).toEqual(expect.arrayContaining([3, 7]));
    expect(where.reservedSeats).toEqual({ lt: 'capacity' });
    expect(where.ticketTypes).toEqual({ some: { available: { gt: 0 } } });
  });
});
