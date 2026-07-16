const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('123456', 10);
  console.log('New hash:', hash);
  
  await prisma.admin.update({
    where: { id: 'c337f023-3f67-4861-ae1d-0c9bd102d324' },
    data: { passwordHash: hash },
  });
  
  console.log('Password updated');
  await prisma.$disconnect();
}

main().catch(console.error);
