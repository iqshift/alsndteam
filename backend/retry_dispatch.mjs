/**
 * يستدعي dispatch مباشرة لإعادة بث الطلب العالق
 */
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const p = new PrismaClient();
const ORDER_ID = 'f8ff4336-b8d4-430c-810d-1d154ce6b115';

// التحقق من حالة الطلب
const order = await p.order.findUnique({
  where: { id: ORDER_ID },
  include: { restaurant: true }
});

console.log('📋 حالة الطلب:', order?.status);

if (!order || order.status !== 'searching_driver') {
  console.log('❌ الطلب ليس في حالة searching_driver');
  await p.$disconnect();
  process.exit(0);
}

// إضافة job للـ queue
const queue = new Queue('order-broadcast', {
  connection: { url: 'redis://localhost:6379' },
});

const job = await queue.add('next-tier', { orderId: ORDER_ID }, {
  jobId: `manual-retry-${Date.now()}`,
});

console.log('✅ تم إضافة job للـ Queue:', job.id);
console.log('⏳ السيرفر سيعالج الطلب خلال ثوانٍ...');

await queue.close();
await p.$disconnect();
