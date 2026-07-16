import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = '07999999999';
  
  // Set coordinates and balance of testing driver to match testing restaurant
  const updatedDriver = await prisma.driver.update({
    where: { phone },
    data: {
      lat: 33.3128,
      lng: 44.3615,
      walletBalance: 20000,
      availabilityStatus: 'available',
      locationUpdatedAt: new Date(),
    },
  });
  
  console.log(`Driver ${updatedDriver.name} updated:`);
  console.log(`- Lat: ${updatedDriver.lat}`);
  console.log(`- Lng: ${updatedDriver.lng}`);
  console.log(`- Balance: ${updatedDriver.walletBalance}`);
  console.log(`- Availability: ${updatedDriver.availabilityStatus}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
