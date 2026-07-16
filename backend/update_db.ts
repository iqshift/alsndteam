import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phone = '07999999999';
  const updated = await prisma.restaurant.update({
    where: { phone },
    data: {
      status: 'active',
      billingMode: 'commission', // نجعل البيلينغ عمولة (غير مشترك) لنرى الفروقات والخصومات في التطبيق مباشرة!
    },
  });
  console.log(`Successfully activated restaurant: ${updated.name}, Status: ${updated.status}, BillingMode: ${updated.billingMode}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
