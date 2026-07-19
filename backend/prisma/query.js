const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      driver: { select: { name: true, phone: true } },
      restaurant: { select: { name: true } }
    }
  });
  console.log("Recent Orders on Server:", orders);
  process.exit(0);
}
run();
