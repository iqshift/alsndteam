import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESTAURANTS ---');
  const restaurants = await prisma.restaurant.findMany();
  for (const r of restaurants) {
    console.log(`ID: ${r.id}, Name: ${r.name}, Phone: ${r.phone}, Lat: ${r.lat}, Lng: ${r.lng}, Status: ${r.status}, BillingMode: ${r.billingMode}, ExpiresAt: ${r.subscriptionExpiresAt}`);
  }

  console.log('\n--- DRIVERS ---');
  const drivers = await prisma.driver.findMany();
  for (const d of drivers) {
    console.log(`ID: ${d.id}, Name: ${d.name}, Phone: ${d.phone}, Lat: ${d.lat}, Lng: ${d.lng}, Balance: ${d.walletBalance}, Status: ${d.availabilityStatus}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
