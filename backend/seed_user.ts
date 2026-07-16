import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '07999999999';
  const password = '123456';
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Upsert Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { phone },
    update: { passwordHash },
    create: {
      name: 'مطعم السند التجريبي',
      phone,
      passwordHash,
      lat: 33.3128,
      lng: 44.3615,
      status: 'active',
    },
  });
  console.log(`Restaurant registered/updated: ${restaurant.name} (${restaurant.phone})`);

  // 2. Upsert Driver
  const driver = await prisma.driver.upsert({
    where: { phone },
    update: { passwordHash },
    create: {
      name: 'كابتن السند التجريبي',
      phone,
      passwordHash,
      status: 'active',
      availabilityStatus: 'available',
    },
  });
  console.log(`Driver registered/updated: ${driver.name} (${driver.phone})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
