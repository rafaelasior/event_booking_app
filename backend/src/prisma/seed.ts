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