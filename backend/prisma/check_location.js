const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const r = await prisma.restaurant.findUnique({ where: { id: "c1c8f7f0-5c55-43a6-a43b-8eea8039051c" } });
  const d = await prisma.driver.findUnique({ where: { id: "1cc54d09-ccba-4ba0-afc5-fa46d5d7ca63" } });
  console.log("Restaurant:", { name: r.name, lat: r.lat, lng: r.lng });
  console.log("Driver:", { name: d.name, lat: d.lat, lng: d.lng });
  process.exit(0);
}
run();
