import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber: 499040 },
    include: { restaurant: true }
  });
  if (order) {
    console.log(`Order ID: ${order.id}`);
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Order Value: ${order.orderValue}`);
    console.log(`Restaurant Commission: ${order.restaurantCommission}`);
    console.log(`Delivery Price: ${order.deliveryPrice}`);
    console.log(`Restaurant Status: ${order.restaurant.status}`);
    console.log(`Restaurant Billing Mode: ${order.restaurant.billingMode}`);
    console.log(`Restaurant Subscription Expires At: ${order.restaurant.subscriptionExpiresAt}`);
  } else {
    console.log('Order not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
