const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash('123456', 12);
  console.log('hash:', hash);
  await prisma.admin.upsert({
    where: { phone: '07766898208' },
    update: { passwordHash: hash },
    create: { id: 'admin-001', name: 'Admin', phone: '07766898208', passwordHash: hash, role: 'admin' }
  });
  console.log('Admin seeded');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
