import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.mjs';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Admin User ---
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      roles: ['admin'],
      active: true,
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      roles: ['admin'],
      active: true,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '0000000000',
      address: 'System Address',
      city: 'Athens',
      country: 'Greece',
      latitude: 37.9838,
      longitude: 23.7275,
      AFM: '000000000',
      registrationStatus: 'APPROVED'
    },
  });

  // --- Simple User ---
  const userPasswordHash = await bcrypt.hash('user1234', 10);
  await prisma.user.upsert({
    where: { username: 'user' },
    update: {
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      roles: ['user'], // Change this to [] if your schema doesn't use a 'user' role
      active: true,
    },
    create: {
      username: 'user',
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      roles: ['user'],
      active: true,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '0000000000',
      address: 'System Address',
      city: 'Athens',
      country: 'Greece',
      latitude: 37.9838,
      longitude: 23.7275,
      AFM: '000000001',
    },
  });

  console.log('Database seeded successfully.');
}

main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });