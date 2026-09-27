import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Φέρνει στη βάση ένα κομμάτι του dataset του e-class για το recommender:
// τις πιο δημοφιλείς εκδηλώσεις και τους χρήστες που αλληλεπίδρασαν μαζί τους.
// yes -> Booking, maybe / interested -> EventView

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

const DATASET_DIR = join(process.cwd(), 'private-data', 'recommendations', 'dataset', 'rel_event_csvs');
const EVENT_LIMIT = 300;
const MIN_EVENTS_PER_USER = 2;
const ORGANIZER_USERNAME = 'ds_organizer';

type Interaction = {
  dsUser: string;
  dsEvent: string;
  kind: 'booking' | 'view';
};

type EventInfo = {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  start: Date;
};

// Διαβάζει ένα CSV γραμμή-γραμμή, χωρίς να το φορτώνει όλο στη μνήμη
async function* readLines(file: string) {
  const lines = createInterface({
    input: createReadStream(join(DATASET_DIR, file)),
    crlfDelay: Infinity,
  });

  let isHeader = true;

  for await (const line of lines) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    yield line;
  }
}

async function loadInteractions() {
  const seen = new Set<string>();
  const interactions: Interaction[] = [];

  const add = (dsUser: string, dsEvent: string, kind: Interaction['kind']) => {
    const key = `${dsUser},${dsEvent},${kind}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    interactions.push({ dsUser, dsEvent, kind });
  };

  // user,event,invited,timestamp,interested,not_interested
  for await (const line of readLines('event_interest.csv')) {
    const [user, event, , , interested] = line.split(',');

    if (interested === '1') {
      add(user, event, 'view');
    }
  }

  // index,event,status,user_id,start_time (οι περισσότερες γραμμές δεν έχουν user_id)
  for await (const line of readLines('event_attendees.csv')) {
    const [, event, status, user] = line.split(',');

    if (!user) {
      continue;
    }

    if (status === 'yes') {
      add(user, event, 'booking');
    } else if (status === 'maybe') {
      add(user, event, 'view');
    }
  }

  return interactions;
}

// Κρατάει τις EVENT_LIMIT εκδηλώσεις με τους περισσότερους χρήστες
// και μόνο τους χρήστες με τουλάχιστον MIN_EVENTS_PER_USER από αυτές
function selectSubset(interactions: Interaction[]) {
  const usersPerEvent = new Map<string, Set<string>>();

  for (const interaction of interactions) {
    if (!usersPerEvent.has(interaction.dsEvent)) {
      usersPerEvent.set(interaction.dsEvent, new Set());
    }

    usersPerEvent.get(interaction.dsEvent)!.add(interaction.dsUser);
  }

  const topEvents = new Set(
    [...usersPerEvent.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, EVENT_LIMIT)
      .map(([dsEvent]) => dsEvent),
  );

  const inTopEvents = interactions.filter((interaction) =>
    topEvents.has(interaction.dsEvent),
  );

  const eventsPerUser = new Map<string, Set<string>>();

  for (const interaction of inTopEvents) {
    if (!eventsPerUser.has(interaction.dsUser)) {
      eventsPerUser.set(interaction.dsUser, new Set());
    }

    eventsPerUser.get(interaction.dsUser)!.add(interaction.dsEvent);
  }

  return inTopEvents.filter(
    (interaction) =>
      eventsPerUser.get(interaction.dsUser)!.size >= MIN_EVENTS_PER_USER,
  );
}

async function loadEventInfo(dsEventIds: Set<string>) {
  const info = new Map<string, EventInfo>();

  // event_id,user_id,start_time,city,state,zip,country,lat,lng,c_1,...
  for await (const line of readLines('events.csv')) {
    const [id, , start, city, , , country, lat, lng] = line.split(',', 9);

    if (!dsEventIds.has(id)) {
      continue;
    }

    info.set(id, {
      city: city || 'Unknown',
      country: country || 'Unknown',
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      start: new Date(start.replace(' ', 'T') + 'Z'),
    });
  }

  return info;
}

// Σβήνει ό,τι είχε φέρει προηγούμενο τρέξιμο, ώστε το seed να ξανατρέχει
async function removePreviousSeed() {
  const organizer = await prisma.user.findUnique({
    where: { username: ORGANIZER_USERNAME },
  });

  if (organizer) {
    const events = await prisma.event.findMany({
      where: { organizerId: organizer.id },
      select: { id: true },
    });
    const eventIds = events.map((event) => event.id);

    await prisma.message.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.booking.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }

  await prisma.user.deleteMany({ where: { username: { startsWith: 'ds_' } } });
}

async function main() {
  console.log('Reading dataset...');
  const interactions = selectSubset(await loadInteractions());
  const dsEventIds = new Set(interactions.map((interaction) => interaction.dsEvent));
  const dsUserIds = new Set(interactions.map((interaction) => interaction.dsUser));
  const eventInfo = await loadEventInfo(dsEventIds);

  const bookingsPerEvent = new Map<string, number>();

  for (const interaction of interactions) {
    if (interaction.kind === 'booking') {
      bookingsPerEvent.set(
        interaction.dsEvent,
        (bookingsPerEvent.get(interaction.dsEvent) ?? 0) + 1,
      );
    }
  }

  await removePreviousSeed();

  // Ένα hash για όλους: το bcrypt για ~800 χρήστες θα έπαιρνε λεπτά
  const passwordHash = await bcrypt.hash('dataset123', 10);

  const organizer = await prisma.user.create({
    data: {
      username: ORGANIZER_USERNAME,
      email: 'ds_organizer@dataset.local',
      passwordHash,
      roles: ['user'],
      firstName: 'Dataset',
      lastName: 'Organizer',
      phone: '0000000000',
      address: '-',
      city: 'Unknown',
      country: 'Unknown',
      AFM: 'DS_ORGANIZER',
      registrationStatus: 'APPROVED',
    },
  });

  const users = await prisma.user.createManyAndReturn({
    data: [...dsUserIds].map((dsUser) => ({
      username: `ds_${dsUser}`,
      email: `ds_${dsUser}@dataset.local`,
      passwordHash,
      roles: ['user'],
      firstName: 'Dataset',
      lastName: `User ${dsUser}`,
      phone: '0000000000',
      address: '-',
      city: 'Unknown',
      country: 'Unknown',
      AFM: `DS_${dsUser}`,
      registrationStatus: 'APPROVED' as const,
    })),
    select: { id: true, username: true },
  });

  // dataset id -> id στη βάση
  const userIdMap = new Map(users.map((user) => [user.username.slice(3), user.id]));

  // Οι ημερομηνίες είναι του 2012: τις μεταφέρουμε ώστε η πρώτη να είναι σε μία εβδομάδα
  const firstStart = Math.min(...[...eventInfo.values()].map((info) => info.start.getTime()));
  const shift = Date.now() + 7 * 24 * 60 * 60 * 1000 - firstStart;

  const eventIdMap = new Map<string, { eventId: number; ticketTypeId: number }>();

  for (const [dsEvent, info] of eventInfo) {
    const booked = bookingsPerEvent.get(dsEvent) ?? 0;
    const capacity = booked + 50;
    const startDateTime = new Date(info.start.getTime() + shift);

    const event = await prisma.event.create({
      data: {
        title: `Dataset event ${dsEvent}`,
        eventType: 'Other',
        venue: 'Dataset venue',
        address: info.city,
        city: info.city,
        country: info.country,
        latitude: info.latitude,
        longitude: info.longitude,
        startDateTime,
        endDateTime: new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000),
        capacity,
        reservedSeats: booked,
        status: 'PUBLISHED',
        description: `Εκδήλωση από το dataset του e-class (event_id ${dsEvent}).`,
        organizerId: organizer.id,
        ticketTypes: {
          create: { name: 'General', price: 10, quantity: capacity, available: capacity - booked },
        },
      },
      include: { ticketTypes: true },
    });

    eventIdMap.set(dsEvent, { eventId: event.id, ticketTypeId: event.ticketTypes[0].id });
  }

  // Εκδηλώσεις που δεν βρέθηκαν στο events.csv δεν μπαίνουν
  const valid = interactions.filter((interaction) => eventIdMap.has(interaction.dsEvent));

  const bookings = await prisma.booking.createMany({
    data: valid
      .filter((interaction) => interaction.kind === 'booking')
      .map((interaction) => ({
        eventId: eventIdMap.get(interaction.dsEvent)!.eventId,
        ticketTypeId: eventIdMap.get(interaction.dsEvent)!.ticketTypeId,
        attendeeId: userIdMap.get(interaction.dsUser)!,
        numberOfTickets: 1,
        totalCost: 10,
      })),
  });

  const views = await prisma.eventView.createMany({
    data: valid
      .filter((interaction) => interaction.kind === 'view')
      .map((interaction) => ({
        eventId: eventIdMap.get(interaction.dsEvent)!.eventId,
        userId: userIdMap.get(interaction.dsUser)!,
      })),
  });

  console.log(
    `Dataset seeded: ${users.length} users, ${eventIdMap.size} events, ` +
      `${bookings.count} bookings, ${views.count} views.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
