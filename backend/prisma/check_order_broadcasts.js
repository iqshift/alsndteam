const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const broadcasts = await prisma.orderBroadcast.findMany({
    where: { orderId: "b1add709-85cd-46f9-9799-39d550de0ff8" }
  });
  console.log("Broadcasts for order:", broadcasts);
  process.exit(0);
}
run();
