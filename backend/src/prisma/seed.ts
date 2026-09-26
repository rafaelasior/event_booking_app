import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
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
      registrationStatus: 'APPROVED',
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
      registrationStatus: 'APPROVED',
    },
  });

  console.log('Admin user seeded successfully.');

    const userPasswordHash = await bcrypt.hash('user1234', 10);

    const userData = {
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      roles: ['user'],
      active: true,
      firstName: 'Simple',
      lastName: 'User',
      phone: '6900000000',
      address: 'User Address',
      city: 'Athens',
      country: 'Greece',
      latitude: 37.9838,
      longitude: 23.7275,
      AFM: '111111111',
      registrationStatus: 'APPROVED' as const,
    };

    await prisma.user.upsert({
      where: { username: 'user' },
      update: userData,
      create: { username: 'user', ...userData },
    });

    console.log('Simple user seeded successfully.');

  }

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });