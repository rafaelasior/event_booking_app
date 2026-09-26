import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Test δεδομένα για το messaging, μέχρι να υπάρξει booking flow.
// Φτιάχνει τον διοργανωτή 'organizer', ένα δημοσιευμένο event του και
// μία κράτηση του 'user' (από το seed.ts) σε αυτό.

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const attendee = await prisma.user.findUnique({ where: { username: 'user' } });

  if (!attendee) {
    throw new Error("User 'user' not found. Run 'npm run prisma:seed' first.");
  }

  const organizerData = {
    email: 'organizer@example.com',
    passwordHash: await bcrypt.hash('organizer123', 10),
    roles: ['user'],
    active: true,
    firstName: 'Test',
    lastName: 'Organizer',
    phone: '6911111111',
    address: 'Organizer Address',
    city: 'Athens',
    country: 'Greece',
    AFM: '222222222',
    registrationStatus: 'APPROVED' as const,
  };

  const organizer = await prisma.user.upsert({
    where: { username: 'organizer' },
    update: organizerData,
    create: { username: 'organizer', ...organizerData },
  });

  // Αν το ξανατρέξεις, δεν φτιάχνει δεύτερο event και δεύτερη κράτηση.
  const title = 'Messaging test event';
  const existing = await prisma.event.findFirst({
    where: { title, organizerId: organizer.id },
  });

  if (existing) {
    console.log(`Messaging test data already exists (event id ${existing.id}).`);
    return;
  }

  const event = await prisma.event.create({
    data: {
      title,
      eventType: 'Concert',
      venue: 'Test Venue',
      address: 'Test Street 1',
      city: 'Athens',
      country: 'Greece',
      startDateTime: new Date('2026-12-01T20:00:00Z'),
      endDateTime: new Date('2026-12-01T23:00:00Z'),
      capacity: 100,
      reservedSeats: 2,
      status: 'PUBLISHED',
      description: 'Event for testing the messaging module.',
      organizerId: organizer.id,
      ticketTypes: {
        create: { name: 'General', price: 10, quantity: 100, available: 98 },
      },
    },
    include: { ticketTypes: true },
  });

  await prisma.booking.create({
    data: {
      eventId: event.id,
      ticketTypeId: event.ticketTypes[0].id,
      attendeeId: attendee.id,
      numberOfTickets: 2,
      totalCost: 20,
    },
  });

  console.log(`Messaging test data seeded (event id ${event.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
