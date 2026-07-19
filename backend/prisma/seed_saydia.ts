import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 بدء إضافة منطقة مطعم "السيديه" وكافة أسعار التوصيل لـ 84 حياً...');

  // 1. العثور على أو إنشاء منطقة المطعم "السيديه"
  let rZone = await prisma.restaurantZone.findFirst({
    where: {
      OR: [
        { name: 'السيديه' },
        { name: 'السيدية' },
      ],
    },
  });

  if (!rZone) {
    rZone = await prisma.restaurantZone.create({
      data: { name: 'السيديه' },
    });
    console.log(`✅ تم إنشاء منطقة مطاعم جديدة باسم "السيديه" (ID: ${rZone.id})`);
  } else {
    console.log(`ℹ️ تم العثور على منطقة المطاعم "السيديه" (ID: ${rZone.id})`);
  }

  // 2. الهيكلية المعرفة للأحياء المذكورة بالجدول
  const dataGroups = [
    {
      groupName: 'السيديه',
      children: [
        { name: 'السيديه', price: 1000 },
        { name: 'شهداء السيديه', price: 2000 },
        { name: 'كفاءات السيديه', price: 2000 },
      ],
    },
    {
      groupName: 'الدورة',
      children: [
        { name: 'ابو دشير', price: 3000 },
        { name: 'كفاءات الصحه', price: 3000 },
        { name: 'الصحه', price: 3000 },
        { name: 'عرب جبور', price: 5000 },
        { name: 'هور رجب', price: 5000 },
        { name: 'شارع 60', price: 3000 },
        { name: 'الميكانيك', price: 3000 },
        { name: 'حي اسيا سريع اليوسفيه', price: 4000 },
        { name: 'حي دجله', price: 4000 },
        { name: 'الكراره', price: 5000 },
        { name: 'المهديه 1', price: 2000 },
        { name: 'المهديه 2', price: 2000 },
        { name: 'الوادي', price: 3000 },
        { name: 'الطعمه', price: 3000 },
        { name: 'الفنار', price: 3000 },
        { name: 'الشرطه', price: 3000 },
        { name: 'ابو طياره', price: 3500 },
        { name: 'الزراعي ابو طياره', price: 3500 },
        { name: 'ملا حويش', price: 3000 },
        { name: 'كليه الفارابي', price: 3500 },
        { name: 'كليه دجله', price: 3500 },
        { name: 'شارع مطعم ليمونه', price: 3500 },
        { name: 'مول بغداد', price: 4000 },
        { name: 'جمعيه خيرالله', price: 4000 },
        { name: 'مجمع الدوره النفطي', price: 5000 },
        { name: 'البعيثه', price: 5000 },
        { name: 'منطقه الامنه', price: 6000 },
      ],
    },
    {
      groupName: 'الامين',
      children: [
        { name: 'الامين 1', price: 8000 },
        { name: 'الامين 2', price: 8000 },
      ],
    },
    {
      groupName: 'المنصور',
      children: [
        { name: 'ابو جعفر المنصور', price: 6000 },
        { name: 'رمضان 14', price: 5000 },
        { name: 'الرواد', price: 5000 },
        { name: 'حي دراغ', price: 5000 },
        { name: 'البيجيه', price: 5000 },
        { name: 'الحارثيه', price: 4000 },
        { name: 'اليرموك', price: 3000 },
        { name: 'القادسيه', price: 3000 },
        { name: 'شارع الاردن', price: 4000 },
      ],
    },
    {
      groupName: 'الكرادة',
      children: [
        { name: 'الجادريه', price: 3000 },
        { name: 'الكراده خارج', price: 5000 },
        { name: 'الكراده داخل', price: 6000 },
      ],
    },
    {
      groupName: 'البياع والإعلام',
      children: [
        { name: 'بياع', price: 2000 },
        { name: 'اعلام', price: 2000 },
        { name: 'حي العامل', price: 3000 },
        { name: 'حي الفرات', price: 4000 },
        { name: 'حي جهاد', price: 3000 },
        { name: 'حي الحسين', price: 4000 },
        { name: 'العامريه', price: 5000 },
        { name: 'حي جامعه', price: 5000 },
        { name: 'حي الدل', price: 6000 },
        { name: 'الشالجيه', price: 6000 },
        { name: 'الاسكان', price: 5000 },
        { name: 'بداله', price: 3000 },
        { name: 'الري', price: 3000 },
        { name: 'المعالف', price: 3000 },
        { name: 'التراث', price: 3000 },
        { name: 'المواصلات', price: 3000 },
        { name: 'شرطه الخامسه', price: 4000 },
        { name: 'شرطه الرابعه', price: 3000 },
        { name: 'الحمدانيه', price: 4000 },
        { name: 'شهداء البياع', price: 3000 },
      ],
    },
    {
      groupName: 'مناطق بغداد الشرقية والشمالية',
      children: [
        { name: 'الفضليه', price: 8000 },
        { name: 'زيونه', price: 7000 },
        { name: 'شارع فلسطين', price: 7000 },
        { name: 'بغداد الجديده', price: 7000 },
        { name: 'بسمايه', price: 10000 },
        { name: 'جسر ديالى', price: 8000 },
        { name: 'الزعفرانيه', price: 7000 },
        { name: 'منطقه التاسعه', price: 6000 },
        { name: 'البلديات', price: 8000 },
        { name: 'الكماليه', price: 9000 },
        { name: 'شهداء العبيديه', price: 9000 },
        { name: 'حي النصر', price: 10000 },
        { name: 'الحسينيه', price: 10000 },
        { name: 'الشعب', price: 8000 },
        { name: 'الحبيبتور', price: 10000 },
        { name: 'المدينه', price: 10000 },
      ],
    },
    {
      groupName: 'الأطراف والمحيط',
      children: [
        { name: 'ابو غريب', price: 6000 },
        { name: 'غزاليه', price: 6000 },
        { name: 'سويب', price: 5000 },
        { name: 'الرضوانيه', price: 5000 },
      ],
    },
  ];

  let addedCount = 0;

  for (const group of dataGroups) {
    // العثور على أو إنشاء المنطقة الرئيسية
    let parentZone = await prisma.zone.findFirst({
      where: { name: group.groupName, isGroup: true },
    });

    if (!parentZone) {
      parentZone = await prisma.zone.create({
        data: {
          name: group.groupName,
          deliveryPrice: 0,
          driverDeduction: 0,
          isGroup: true,
          parentId: null,
        },
      });
      console.log(`📁 تم إنشاء مجموعة رئيسية: "${group.groupName}"`);
    }

    for (const child of group.children) {
      // العثور على أو إنشاء الحي الفرعي
      let childZone = await prisma.zone.findFirst({
        where: { name: child.name, isGroup: false },
      });

      if (!childZone) {
        childZone = await prisma.zone.create({
          data: {
            name: child.name,
            deliveryPrice: 0,
            driverDeduction: 0,
            isGroup: false,
            parentId: parentZone.id,
          },
        });
      } else if (!childZone.parentId) {
        // تحديث المجلد التابع له إن لم يكن ينتمي لأحد
        await prisma.zone.update({
          where: { id: childZone.id },
          data: { parentId: parentZone.id },
        });
      }

      // إضافة أو تحديث سعر التوصيل لمنطقة السيديه
      await prisma.restaurantZonePrice.upsert({
        where: {
          restaurantZoneId_deliveryZoneId: {
            restaurantZoneId: rZone.id,
            deliveryZoneId: childZone.id,
          },
        },
        create: {
          restaurantZoneId: rZone.id,
          deliveryZoneId: childZone.id,
          deliveryPrice: child.price,
          driverDeduction: 500,
        },
        update: {
          deliveryPrice: child.price,
          driverDeduction: 500,
        },
      });

      addedCount++;
    }
  }

  console.log(`✨ اكتملت الإضافة بنجاح! تم إضافة وتحديد أسعار ${addedCount} حياً سكنياً لمنطقة المطعم "السيديه".`);
}

main()
  .catch(e => {
    console.error('❌ خطأ أثناء تشغيل السكربت:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
