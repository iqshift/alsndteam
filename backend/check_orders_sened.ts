import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const rest = await prisma.restaurant.findFirst({
    where: { phone: '07999999999' }
  });
  if (rest) {
    console.log(`Restaurant ID: ${rest.id}, Name: ${rest.name}, BillingMode: ${rest.billingMode}, ExpiresAt: ${rest.subscriptionExpiresAt}`);
    const orders = await prisma.order.findMany({
      where: { restaurantId: rest.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    for (const o of orders) {
      console.log(`Order ID: ${o.id}, Number: ${o.orderNumber}, Value: ${o.orderValue}, Commission: ${o.restaurantCommission}, DeliveryPrice: ${o.deliveryPrice}, CreatedAt: ${o.createdAt}`);
    }
  } else {
    console.log('Restaurant not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
