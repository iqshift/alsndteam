import React, { useState, useEffect, useMemo } from 'react';
import { zonesAPI, restaurantZonesAPI, restaurantZonePricingAPI, settingsAPI } from '../services/api';
import {
  MapIcon,
  CheckCircleIcon,
  MapPinIcon,
  FolderIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  StoreIcon,
  FileTextIcon,
} from '../components/common/Icons';
import { useAuth } from '../hooks/useAuth';

export default function ZonesPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'admin' || user?.permissions?.zones?.create === true;
  const canUpdate = user?.role === 'admin' || user?.permissions?.zones?.update === true;
  const canDelete = user?.role === 'admin' || user?.permissions?.zones?.delete === true;

  const [zones, setZones] = useState<any[]>([]);
  const [restaurantZones, setRestaurantZones] = useState<any[]>([]);
  const [selectedRestaurantZoneId, setSelectedRestaurantZoneId] = useState<string>('');
  const [customPricesMap, setCustomPricesMap] = useState<Record<string, { deliveryPrice: number; driverDeduction: number }>>({});
  const [loading, setLoading] = useState(true);

  // General System Zones Modals
  const [formType, setFormType] = useState<'parent' | 'child' | null>(null);
  const [parentFormData, setParentFormData] = useState({
    name: '',
    childName: '',
    deliveryPrice: '3000',
    driverDeduction: '500',
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [defaultDriverDeduction, setDefaultDriverDeduction] = useState(500);

  // Restaurant Zones Modals
  const [showAddRZoneModal, setShowAddRZoneModal] = useState(false);
  const [editingRZone, setEditingRZone] = useState<any>(null);
  const [rZoneNameInput, setRZoneNameInput] = useState('');
  const [rZoneSaving, setRZoneSaving] = useState(false);

  // Modal for Adding Delivery Zone & Price to selected Restaurant Zone
  const [showAddDeliveryPriceModal, setShowAddDeliveryPriceModal] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [editingDeliveryPriceZone, setEditingDeliveryPriceZone] = useState<any>(null);
  const [priceFormData, setPriceFormData] = useState({
    name: '',
    parentId: '',
    newParentName: '',
    deliveryZoneId: '',
    deliveryPrice: '3000',
    driverDeduction: '500',
  });
  const [priceSaving, setPriceSaving] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadZones();
    loadRestaurantZones();
    loadSettings();
  }, []);

  // تحديد أول منطقة مطعم تلقائياً فور التحميل
  useEffect(() => {
    if (restaurantZones.length > 0 && (!selectedRestaurantZoneId || !restaurantZones.some(rz => rz.id === selectedRestaurantZoneId))) {
      setSelectedRestaurantZoneId(restaurantZones[0].id);
    }
  }, [restaurantZones]);

  useEffect(() => {
    if (selectedRestaurantZoneId) {
      loadCustomPrices(selectedRestaurantZoneId);
    } else {
      setCustomPricesMap({});
    }
  }, [selectedRestaurantZoneId]);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      if (data && data.driverDeduction !== undefined) {
        setDefaultDriverDeduction(data.driverDeduction);
        setPriceFormData(prev => ({ ...prev, driverDeduction: data.driverDeduction.toString() }));
        setParentFormData(prev => ({ ...prev, driverDeduction: data.driverDeduction.toString() }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadZones = async () => {
    try {
      const { data } = await zonesAPI.getAll();
      setZones(data);
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantZones = async () => {
    try {
      const { data } = await restaurantZonesAPI.getAll();
      setRestaurantZones(data);
    } catch (err) {
      console.error('Failed to load restaurant zones:', err);
    }
  };

  const loadCustomPrices = async (rZoneId: string) => {
    try {
      const { data } = await restaurantZonePricingAPI.getByOriginZone(rZoneId);
      const priceMap: Record<string, { deliveryPrice: number; driverDeduction: number }> = {};
      data.forEach((p: any) => {
        priceMap[p.deliveryZoneId] = {
          deliveryPrice: Number(p.deliveryPrice),
          driverDeduction: Number(p.driverDeduction),
        };
      });
      setCustomPricesMap(priceMap);
    } catch (err) {
      console.error('Failed to load custom prices:', err);
      setCustomPricesMap({});
    }
  };

  // توسيع كافة المجموعات تلقائياً عند التحميل
  useEffect(() => {
    if (zones.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      zones.forEach(z => {
        if (z.isGroup) {
          initialExpanded[z.id] = true;
        }
      });
      setExpandedZones(prev => ({ ...initialExpanded, ...prev }));
    }
  }, [zones]);

  // توسيع المجموعات عند البحث
  useEffect(() => {
    if (searchQuery) {
      const toExpand: Record<string, boolean> = {};
      const groupsList = zones.filter(z => z.isGroup);
      const childrenList = zones.filter(z => !z.isGroup && z.parentId);
      groupsList.forEach(g => {
        const hasMatchingChild = childrenList.some(c => c.parentId === g.id && c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (hasMatchingChild) {
          toExpand[g.id] = true;
        }
      });
      setExpandedZones(prev => ({ ...prev, ...toExpand }));
    }
  }, [searchQuery, zones]);

  const handleExportPDF = () => {
    if (!selectedRZoneObj) return;

    const rZoneName = selectedRZoneObj.name;
    const logoUrl = window.location.origin + '/logo_remove_bg.png';
    
    // تجميع البيانات وتجهيز المجموعات والأحياء التابعة لها
    const printableGroups = groups.map(g => {
      const groupItems = children.filter(c => c.parentId === g.id).map(c => ({
        name: c.name,
        price: customPricesMap[c.id]?.deliveryPrice ?? 0,
      })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      return {
        name: g.name,
        items: groupItems,
      };
    }).filter(g => g.items.length > 0);

    const standaloneItems = standalones.map(s => ({
      name: s.name,
      price: customPricesMap[s.id]?.deliveryPrice ?? 0,
    })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    if (standaloneItems.length > 0) {
      printableGroups.push({
        name: 'أحياء ومناطق أخرى',
        items: standaloneItems,
      });
    }

    const today = new Date().toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const largeGroups = printableGroups.filter(g => g.items.length >= 8);
    const smallGroups = printableGroups.filter(g => g.items.length < 8);

    // توليد كود HTML للتصميم الأنيق
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>أسعار توصيل - تيم السند</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 0;
            color: #1e293b;
            background-color: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #d12363;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          
          .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .logo-text {
            font-size: 22px;
            font-weight: 800;
            color: #d12363;
            margin: 0;
            line-height: 1.2;
          }
          
          .logo-sub {
            font-size: 11px;
            color: #64748b;
            margin: 2px 0 0 0;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          
          .title-container {
            text-align: right;
          }
          
          .main-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          
          .sub-title {
            font-size: 14px;
            color: #d12363;
            font-weight: 700;
            margin: 4px 0 0 0;
          }
          
          /* المجموعات الكبيرة: تأخذ العرض الكامل مع 3 أعمدة بداخلها */
          .large-group-card {
            display: block;
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            background-color: #fff;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .large-group-header {
            background-color: #d12363;
            color: #fff;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .large-group-items {
            column-count: 3;
            column-gap: 30px;
            padding: 12px 20px;
          }
          
          .item-row-compact {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px dashed #e2e8f0;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .compact-name {
            font-size: 12px;
            font-weight: 600;
            color: #334155;
          }
          
          .compact-price {
            font-size: 12px;
            font-weight: 700;
            color: #d12363;
          }
          
          /* المجموعات الصغيرة: تخطيط عمودين متجاورين */
          .grid {
            column-count: 2;
            column-gap: 20px;
            width: 100%;
          }
          
          .group-card {
            display: inline-block;
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            background-color: #fff;
            break-inside: avoid;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }
          
          .group-header {
            background-color: #d12363;
            color: #fff;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .group-count {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .tr {
            border-bottom: 1px solid #f1f5f9;
          }
          
          .tr:last-child {
            border-bottom: none;
          }
          
          .tr:nth-child(even) {
            background-color: #fafafa;
          }
          
          .td-name {
            padding: 9px 16px;
            font-size: 12px;
            font-weight: 600;
            color: #334155;
            text-align: right;
          }
          
          .td-price {
            padding: 9px 16px;
            font-size: 12px;
            font-weight: 700;
            color: #d12363;
            text-align: left;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
            border-top: 1px dashed #e2e8f0;
            padding-top: 15px;
            page-break-inside: avoid;
          }
          
          .footer-p {
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-container">
            <h1 class="main-title">دليل أجور التوصيل الرسمي</h1>
            <p class="sub-title">المنطقة الجغرافية للمطاعم: ${rZoneName}</p>
          </div>
          <div class="logo-container">
            <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
              <h2 class="logo-text">تيم السند</h2>
              <p class="logo-sub">للشحن والتوصيل الفوري</p>
              <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b; font-weight: 700;">تاريخ الإصدار: ${today}</p>
            </div>
            <img src="${logoUrl}" alt="تيم السند" style="height: 55px; object-fit: contain; margin-right: 12px;" />
          </div>
        </div>
        
        <!-- المجموعات الكبيرة (عرض كامل بـ 3 أعمدة داخلية) -->
        ${largeGroups.map(g => `
          <div class="large-group-card">
            <div class="large-group-header">
              <span>${g.name}</span>
              <span class="large-group-header-count" style="font-size: 12px; font-weight: 600; background-color: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 20px;">${g.items.length} أحياء</span>
            </div>
            <div class="large-group-items">
              ${g.items.map(item => `
                <div class="item-row-compact">
                  <span class="compact-name">${item.name}</span>
                  <span class="compact-price">${Number(item.price).toLocaleString('en-US')} د.ع</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        
        <!-- المجموعات الصغيرة (تخطيط عمودين متجاورين) -->
        ${smallGroups.length > 0 ? `
          <div class="grid">
            ${smallGroups.map(g => `
              <div class="group-card">
                <div class="group-header">
                  <span>${g.name}</span>
                  <span class="group-count">${g.items.length} أحياء</span>
                </div>
                <table class="table">
                  <tbody>
                    ${g.items.map(item => `
                      <tr class="tr">
                        <td class="td-name">${item.name}</td>
                        <td class="td-price">${Number(item.price).toLocaleString('en-US')} د.ع</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="footer">
          <p class="footer-p">تيم السند للتوصيل الفوري - بغداد، العراق</p>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedZones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Restaurant Zone Actions ───
  const handleCreateRZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rZoneNameInput.trim()) return;
    setRZoneSaving(true);
    try {
      const { data } = await restaurantZonesAPI.create(rZoneNameInput.trim());
      setRZoneNameInput('');
      setShowAddRZoneModal(false);
      await loadRestaurantZones();
      setSelectedRestaurantZoneId(data.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إضافة منطقة المطعم');
    } finally {
      setRZoneSaving(false);
    }
  };

  const handleUpdateRZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRZone || !rZoneNameInput.trim()) return;
    setRZoneSaving(true);
    try {
      await restaurantZonesAPI.update(editingRZone.id, rZoneNameInput.trim());
      setEditingRZone(null);
      setRZoneNameInput('');
      await loadRestaurantZones();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تعديل منطقة المطعم');
    } finally {
      setRZoneSaving(false);
    }
  };

  const handleDeleteRZone = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف منطقة المطعم "${name}"؟`)) return;
    try {
      await restaurantZonesAPI.delete(id);
      setSelectedRestaurantZoneId('');
      await loadRestaurantZones();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف منطقة المطعم');
    }
  };

  // ─── إضافة وتحديد سعر التوصيل لمنطقة المطعم الحالية ───
  const handleSaveDeliveryPriceToRZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantZoneId) return;
    setPriceSaving(true);

    try {
      let deliveryZoneId = priceFormData.deliveryZoneId;

      // إذا كان الخيار هو إنشاء حي جديد فورياً
      if (addMode === 'new' && !editingDeliveryPriceZone) {
        if (!priceFormData.name.trim()) {
          alert('يرجى كتابة اسم الحي أو منطقة التوصيل');
          setPriceSaving(false);
          return;
        }

        let parentIdToAssign: string | null = priceFormData.parentId || null;

        // إذا أدخل المستخدم اسم منطقة رئيسية جديدة (تضم أحياء)
        if (priceFormData.parentId === '__NEW__' && priceFormData.newParentName.trim()) {
          const { data: newParent } = await zonesAPI.create({
            name: priceFormData.newParentName.trim(),
            deliveryPrice: 0,
            driverDeduction: 0,
            isGroup: true,
            parentId: null,
            boundaryGeoJson: null,
          });
          parentIdToAssign = newParent.id;
        }

        // إنشاء الحي في السيستم
        const { data: newChildZone } = await zonesAPI.create({
          name: priceFormData.name.trim(),
          deliveryPrice: 0,
          driverDeduction: 0,
          isGroup: false,
          parentId: parentIdToAssign,
          boundaryGeoJson: null,
        });

        deliveryZoneId = newChildZone.id;
        await loadZones();
      }

      const zoneIdToSave = editingDeliveryPriceZone ? editingDeliveryPriceZone.id : deliveryZoneId;
      if (!zoneIdToSave) {
        alert('يرجى تحديد حي التوصيل');
        setPriceSaving(false);
        return;
      }

      // حفظ السعر المخصص لمنطقة المطعم الحالية حصرياً
      await restaurantZonePricingAPI.upsert({
        restaurantZoneId: selectedRestaurantZoneId,
        deliveryZoneId: zoneIdToSave,
        deliveryPrice: parseFloat(priceFormData.deliveryPrice || '0'),
        driverDeduction: parseFloat(priceFormData.driverDeduction || '0'),
      });

      setShowAddDeliveryPriceModal(false);
      setEditingDeliveryPriceZone(null);
      setPriceFormData({
        name: '',
        parentId: '',
        newParentName: '',
        deliveryZoneId: '',
        deliveryPrice: '3000',
        driverDeduction: defaultDriverDeduction.toString(),
      });
      await loadCustomPrices(selectedRestaurantZoneId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حفظ سعر التوصيل للمنطقة');
    } finally {
      setPriceSaving(false);
    }
  };

  // حذف سعر توصيل حي فرعي حصرياً من منطقة المطعم الحالية
  const handleRemoveDeliveryZoneFromRZone = async (deliveryZoneId: string, name: string) => {
    if (!selectedRestaurantZoneId) return;
    const rZoneName = selectedRZoneObj?.name || 'منطقة المطعم الحالية';
    if (!confirm(`هل أنت متأكد من حذف سعر التوصيل لـ "${name}" من منطقة المطعم "${rZoneName}" فقط؟`)) return;
    try {
      await restaurantZonePricingAPI.delete(selectedRestaurantZoneId, deliveryZoneId);
      await loadCustomPrices(selectedRestaurantZoneId);
    } catch (err) {
      console.error('Failed to remove custom price:', err);
    }
  };

  // حذف جميع أسعار التوصيل لأحياء منطقة رئيسية كاملة حصرياً من منطقة المطعم الحالية
  const handleRemoveGroupPricesFromRZone = async (groupId: string, groupName: string) => {
    if (!selectedRestaurantZoneId) return;
    const rZoneName = selectedRZoneObj?.name || 'منطقة المطعم الحالية';
    if (!confirm(`هل أنت متأكد من حذف أسعار التوصيل لجميع أحياء "${groupName}" من منطقة المطعم "${rZoneName}" فقط؟`)) return;

    try {
      const groupChildren = zones.filter(c => c.parentId === groupId);
      for (const child of groupChildren) {
        if (customPricesMap[child.id]) {
          await restaurantZonePricingAPI.delete(selectedRestaurantZoneId, child.id);
        }
      }
      await loadCustomPrices(selectedRestaurantZoneId);
    } catch (err) {
      console.error('Failed to remove group custom prices:', err);
    }
  };

  // ─── إنشاء منطقة رئيسية وتخصيص أول حي وفرض أسعاره لمنطقة المطعم الحالية ───
  const handleOpenCreateParent = () => {
    setParentFormData({
      name: '',
      childName: '',
      deliveryPrice: '3000',
      driverDeduction: defaultDriverDeduction.toString(),
    });
    setFormType('parent');
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentFormData.name.trim()) return;
    if (!parentFormData.childName.trim()) {
      alert('يرجى كتابة اسم أول حي فرعي داخل هذه المنطقة لتعيين سعر التوصيل له');
      return;
    }
    setSaving(true);
    try {
      // 1. إنشاء المنطقة الرئيسية في السيستم
      const { data: newParentGroup } = await zonesAPI.create({
        name: parentFormData.name.trim(),
        deliveryPrice: 0,
        driverDeduction: 0,
        isGroup: true,
        parentId: null,
        boundaryGeoJson: null,
      });

      // 2. إنشاء الحي الفرعي بداخلها وتخصيص سعر التوصيل حصرياً لمنطقة المطعم الحالية
      if (selectedRestaurantZoneId) {
        const { data: newChildZone } = await zonesAPI.create({
          name: parentFormData.childName.trim(),
          deliveryPrice: 0,
          driverDeduction: 0,
          isGroup: false,
          parentId: newParentGroup.id,
          boundaryGeoJson: null,
        });

        await restaurantZonePricingAPI.upsert({
          restaurantZoneId: selectedRestaurantZoneId,
          deliveryZoneId: newChildZone.id,
          deliveryPrice: parseFloat(parentFormData.deliveryPrice || '3000'),
          driverDeduction: parseFloat(parentFormData.driverDeduction || '500'),
        });
      }

      setFormType(null);
      setParentFormData({
        name: '',
        childName: '',
        deliveryPrice: '3000',
        driverDeduction: defaultDriverDeduction.toString(),
      });

      await loadZones();
      if (selectedRestaurantZoneId) {
        await loadCustomPrices(selectedRestaurantZoneId);
      }
      setExpandedZones(prev => ({ ...prev, [newParentGroup.id]: true }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إنشاء المنطقة الرئيسية');
    } finally {
      setSaving(false);
    }
  };

  // ─── تصفية الأحياء المعروضة لمنطقة المطعم المختارة حصرياً ───
  const assignedZoneIds = useMemo(() => {
    if (!selectedRestaurantZoneId) return new Set<string>();
    return new Set(Object.keys(customPricesMap));
  }, [selectedRestaurantZoneId, customPricesMap]);

  // العرض يقتصر حصرياً على المناطق الرئيسية التي تمتلك أحياء فرعية مضافة ومسعرة لمنطقة المطعم الحالية
  const groups = useMemo(() => {
    const allGroups = zones.filter(z => z.isGroup);
    return allGroups.filter(g =>
      zones.some(c => c.parentId === g.id && assignedZoneIds.has(c.id))
    );
  }, [zones, assignedZoneIds]);

  const children = useMemo(() => {
    const allChildren = zones.filter(z => !z.isGroup && z.parentId);
    return allChildren.filter(c => assignedZoneIds.has(c.id));
  }, [zones, assignedZoneIds]);

  const standalones = useMemo(() => {
    const allStandalones = zones.filter(z => !z.isGroup && !z.parentId);
    return allStandalones.filter(s => assignedZoneIds.has(s.id));
  }, [zones, assignedZoneIds]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g => {
      const gMatches = g.name.toLowerCase().includes(searchQuery.toLowerCase());
      const cMatches = children.some(c => c.parentId === g.id && c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return gMatches || cMatches;
    });
  }, [groups, children, searchQuery]);

  const filteredStandalones = useMemo(() => {
    if (!searchQuery) return standalones;
    return standalones.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [standalones, searchQuery]);

  const parentGroups = groups;
  const selectedRZoneObj = restaurantZones.find(rz => rz.id === selectedRestaurantZoneId);

  // الأحياء المتاحة للاختيار في حال إضافة من موجود
  const availableDeliveryZonesForRZone = useMemo(() => {
    if (!selectedRestaurantZoneId) return [];
    return zones.filter(z => !z.isGroup && customPricesMap[z.id] === undefined);
  }, [zones, selectedRestaurantZoneId, customPricesMap]);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ─── 1. كارت: مناطق المطعم المسجلة ─── */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            <StoreIcon size={22} style={{ color: 'var(--primary)' }} />
            <span>مناطق المطعم المسجلة</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* القائمة المنسدلة لاختيار منطقة المطعم */}
          <div style={{ position: 'relative', minWidth: 280, flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <MapPinIcon size={14} style={{ color: 'var(--primary)' }} />
              <span>منطقة المطعم الرئيسية</span>
            </label>
            {restaurantZones.length > 0 ? (
              <select
                className="form-input"
                value={selectedRestaurantZoneId}
                onChange={e => setSelectedRestaurantZoneId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontFamily: 'Cairo',
                  fontSize: 15,
                  fontWeight: 800,
                  direction: 'rtl',
                  height: 'auto',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                {restaurantZones.map(rz => {
                  const count = rz._count?.restaurants ?? 0;
                  return (
                    <option key={rz.id} value={rz.id}>
                      {rz.name} ({count} {count === 1 ? 'مطعم' : count === 2 ? 'مطعان' : count > 2 && count < 11 ? 'مطاعم' : 'مطعم'})
                    </option>
                  );
                })}
              </select>
            ) : (
              <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>لا توجد مناطق مطاعم معرفة بعد</span>
            )}
          </div>

          {/* أزرار الإجراءات الموحدة بعناصر النظام */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>

            {selectedRZoneObj && canUpdate && (
              <button
                className="action-btn btn-edit"
                onClick={() => { setEditingRZone(selectedRZoneObj); setRZoneNameInput(selectedRZoneObj.name); }}
                title="تعديل اسم منطقة المطعم"
                style={{ width: 'auto', padding: '9px 16px', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <EditIcon size={15} />
                <span>تعديل</span>
              </button>
            )}

            {selectedRZoneObj && canDelete && (
              <button
                className="action-btn btn-delete"
                onClick={() => handleDeleteRZone(selectedRZoneObj.id, selectedRZoneObj.name)}
                title="حذف منطقة المطعم"
                style={{ width: 'auto', padding: '9px 16px', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <TrashIcon size={15} />
                <span>حذف</span>
              </button>
            )}

            {canCreate && (
              <button
                className="btn btn-ghost"
                onClick={() => { setRZoneNameInput(''); setShowAddRZoneModal(true); }}
                style={{
                  border: '1.5px dashed var(--primary)',
                  color: 'var(--primary)',
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <PlusIcon size={15} />
                <span>+ منطقة مطعم جديدة</span>
              </button>
            )}
          </div>
        </div>


      </div>

      {/* ─── 2. كارت: الملخص السريع (الإحصائيات الموحدة) ─── */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          <MapIcon size={20} style={{ color: 'var(--text-secondary)' }} />
          <span>الملخص السريع</span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {/* إجمالي مناطق المطاعم */}
          <div className="stat-card">
            <div className="stat-icon info" style={{ backgroundColor: 'rgba(92, 115, 255, 0.12)', color: 'var(--primary)' }}>
              <StoreIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{restaurantZones.length}</h3>
              <p>إجمالي مناطق المطاعم</p>
            </div>
          </div>

          {/* المطاعم المسجلة في هذه المنطقة */}
          <div className="stat-card">
            <div className="stat-icon warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
              <StoreIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{selectedRZoneObj?._count?.restaurants ?? 0}</h3>
              <p>مطاعم مسجلة في {selectedRZoneObj?.name || ''}</p>
            </div>
          </div>

          {/* أحياء التوصيل المضافة */}
          <div className="stat-card">
            <div className="stat-icon success">
              <MapPinIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{assignedZoneIds.size}</h3>
              <p>أحياء التوصيل لـ {selectedRZoneObj?.name || ''}</p>
            </div>
          </div>

          {/* إجمالي المناطق والأحياء المضافة لمنطقة المطعم */}
          <div className="stat-card">
            <div className="stat-icon primary">
              <MapIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{assignedZoneIds.size + groups.length}</h3>
              <p>إجمالي أحياء ومناطق {selectedRZoneObj?.name || ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. كارت: أحياء التوصيل (الجدول والبحث) ─── */}
      <div className="card" style={{ padding: '20px 24px' }}>
        {/* الترويسة والشريط العلوي للجدول */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            أحياء التوصيل لـ "{selectedRZoneObj?.name || ''}"
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* حقل البحث */}
            <div style={{ position: 'relative', width: 240 }}>
              <input
                type="text"
                placeholder="ابحث عن حي..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  paddingRight: 36,
                  height: 38,
                  fontSize: 13,
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>

            {/* زر إضافة منطقة رئيسية */}
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={handleOpenCreateParent}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <PlusIcon size={15} />
                <span>+ إضافة منطقة رئيسية</span>
              </button>
            )}

            {/* زر إضافة حي جديد */}
            {selectedRZoneObj && canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setAddMode('new');
                  setPriceFormData({
                    name: '',
                    parentId: '',
                    newParentName: '',
                    deliveryZoneId: '',
                    deliveryPrice: '3000',
                    driverDeduction: defaultDriverDeduction.toString(),
                  });
                  setShowAddDeliveryPriceModal(true);
                }}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <PlusIcon size={15} />
                <span>+ إضافة حي جديد</span>
              </button>
            )}
            {/* زر تصدير PDF */}
            {selectedRZoneObj && (
              <button
                className="btn"
                onClick={handleExportPDF}
                style={{
                  backgroundColor: '#d12363',
                  color: '#fff',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b01a50')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#d12363')}
              >
                <FileTextIcon size={15} />
                <span>تصدير قائمة الأسعار (PDF)</span>
              </button>
            )}
          </div>
        </div>

        {/* الجدول الرئيسي الموحد */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>اسم الحي</th>
                <th>النوع</th>
                <th>المنطقة الرئيسية</th>
                <th>سعر التوصيل من {selectedRZoneObj?.name || ''}</th>
                <th>استقطاع السائق</th>
                <th>الحالة</th>
                <th style={{ width: 100 }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    جاري التحميل...
                  </td>
                </tr>
              ) : restaurantZones.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">
                        <StoreIcon size={48} />
                      </div>
                      <div className="empty-state-text" style={{ fontSize: 16, fontWeight: 800, marginTop: 12 }}>
                        لا توجد مناطق مطاعم مسجلة حتى الآن
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        يرجى إضافة أول منطقة مطعم (مثل: الدورة، الاعلام، الدليم) لبدء تحديد أسعار التوصيل.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 && filteredStandalones.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">
                        <MapIcon size={48} />
                      </div>
                      <div className="empty-state-text" style={{ fontSize: 16, fontWeight: 800, marginTop: 12 }}>
                        لا توجد أحياء توصيل مضافة لـ "{selectedRZoneObj?.name || ''}" حتى الآن
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        اضغط على زر "+ إضافة منطقة رئيسية" أو "+ إضافة حي جديد" لإضافة أول حي توصيل لـ "{selectedRZoneObj?.name || ''}".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {/* 1. صفوف المناطق الرئيسية والأحياء التابعة لها */}
                  {filteredGroups.map(group => {
                    const isExpanded = !!expandedZones[group.id];
                    const groupChildren = children.filter(
                      c => c.parentId === group.id && (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    );

                    return (
                      <React.Fragment key={group.id}>
                        {/* صف تجميع المنطقة الرئيسية */}
                        <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={2} style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span
                                onClick={() => toggleExpand(group.id)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </span>
                              <FolderIcon size={18} style={{ color: 'var(--primary)' }} />
                              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>{group.name}</span>
                              <span className="badge badge-primary" style={{ fontSize: 11, fontWeight: 800 }}>
                                رئيسية (تضم أحياء)
                              </span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }}>
                            {group.name}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>
                            <span className="badge badge-success">
                              مفعل
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {groupChildren.length > 0 && canUpdate && (
                                <button
                                  className="action-btn btn-delete"
                                  onClick={() => handleRemoveGroupPricesFromRZone(group.id, group.name)}
                                  title={`حذف أسعار جميع أحياء "${group.name}" من ${selectedRZoneObj?.name || ''} فقط`}
                                >
                                  <TrashIcon size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* صفوف الأحياء الفرعية المسعرة مع الأيقونات القياسية */}
                        {isExpanded && groupChildren.length > 0 &&
                          groupChildren.map(child => {
                            const custom = customPricesMap[child.id];

                            return (
                              <tr key={child.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ paddingRight: 36 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <MapPinIcon size={15} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{child.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-success" style={{ fontSize: 11, fontWeight: 800 }}>
                                    حي
                                  </span>
                                </td>
                                <td style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                  {group.name}
                                </td>
                                <td style={{ fontSize: 14, fontWeight: 900, color: 'var(--primary)' }}>
                                  {custom ? `${Number(custom.deliveryPrice).toLocaleString()} د.ع` : '—'}
                                </td>
                                <td style={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>
                                  {custom ? `${Number(custom.driverDeduction).toLocaleString()} د.ع` : '—'}
                                </td>
                                <td>
                                  <span className="badge badge-success">
                                    مفعل
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {canUpdate && (
                                      <button
                                        className="action-btn btn-edit"
                                        onClick={() => {
                                          setEditingDeliveryPriceZone(child);
                                          setPriceFormData({
                                            name: child.name,
                                            parentId: child.parentId || '',
                                            newParentName: '',
                                            deliveryZoneId: child.id,
                                            deliveryPrice: custom ? custom.deliveryPrice.toString() : '3000',
                                            driverDeduction: custom ? custom.driverDeduction.toString() : defaultDriverDeduction.toString(),
                                          });
                                        }}
                                        title="تعديل السعر"
                                      >
                                        <EditIcon size={15} />
                                      </button>
                                    )}
                                    {canUpdate && (
                                      <button
                                        className="action-btn btn-delete"
                                        onClick={() => handleRemoveDeliveryZoneFromRZone(child.id, child.name)}
                                        title={`حذف سعر التوصيل لـ "${child.name}" من ${selectedRZoneObj?.name || ''} فقط`}
                                      >
                                        <TrashIcon size={15} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}

                  {/* 2. الأحياء المستقلة */}
                  {filteredStandalones.length > 0 && (
                    <>
                      <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={7} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)' }}>
                          أحياء مستقلة
                        </td>
                      </tr>
                      {filteredStandalones.map(standalone => {
                        const custom = customPricesMap[standalone.id];

                        return (
                          <tr key={standalone.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MapPinIcon size={15} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{standalone.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge" style={{ background: 'var(--bg-light)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 800 }}>
                                حي مستقل
                              </span>
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                              مستقل
                            </td>
                            <td style={{ fontSize: 14, fontWeight: 900, color: 'var(--primary)' }}>
                              {custom ? `${Number(custom.deliveryPrice).toLocaleString()} د.ع` : '—'}
                            </td>
                            <td style={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>
                              {custom ? `${Number(custom.driverDeduction).toLocaleString()} د.ع` : '—'}
                            </td>
                            <td>
                              <span className="badge badge-success">
                                مفعل
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {canUpdate && (
                                  <button
                                    className="action-btn btn-edit"
                                    onClick={() => {
                                      setEditingDeliveryPriceZone(standalone);
                                      setPriceFormData({
                                        name: standalone.name,
                                        parentId: standalone.parentId || '',
                                        newParentName: '',
                                        deliveryZoneId: standalone.id,
                                        deliveryPrice: custom ? custom.deliveryPrice.toString() : '3000',
                                        driverDeduction: custom ? custom.driverDeduction.toString() : defaultDriverDeduction.toString(),
                                      });
                                    }}
                                    title="تعديل"
                                  >
                                    <EditIcon size={15} />
                                  </button>
                                )}
                                {canUpdate && (
                                  <button
                                    className="action-btn btn-delete"
                                    onClick={() => handleRemoveDeliveryZoneFromRZone(standalone.id, standalone.name)}
                                    title={`حذف سعر التوصيل لـ "${standalone.name}" من ${selectedRZoneObj?.name || ''} فقط`}
                                  >
                                    <TrashIcon size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>


      </div>

      {/* ─── MODALS ─── */}

      {/* Modal إضافة حي توصيل وسعره لمنطقة المطعم المختارة */}
      {showAddDeliveryPriceModal && selectedRZoneObj && (
        <div className="modal-overlay" onClick={() => setShowAddDeliveryPriceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-title">إضافة حي توصيل لـ "{selectedRZoneObj.name}"</div>
            <div className="modal-subtitle">أدخل تفاصيل الحي وسعر التوصيل إليه انطلاقاً من "{selectedRZoneObj.name}"</div>

            {/* تبويبات الاختيار: حي جديد أم من أحياء مضافة مسبقاً */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-light)',
                borderRadius: 8,
                padding: 4,
                marginBottom: 16,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setAddMode('new')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: addMode === 'new' ? 'white' : 'transparent',
                  color: addMode === 'new' ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: addMode === 'new' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  fontFamily: 'Cairo',
                }}
              >
                + إنشاء حي توصيل جديد
              </button>
              {availableDeliveryZonesForRZone.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddMode('existing')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: addMode === 'existing' ? 'white' : 'transparent',
                    color: addMode === 'existing' ? 'var(--primary)' : 'var(--text-secondary)',
                    boxShadow: addMode === 'existing' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    fontFamily: 'Cairo',
                  }}
                >
                  من أحياء السيستم المتاحة ({availableDeliveryZonesForRZone.length})
                </button>
              )}
            </div>

            <form onSubmit={handleSaveDeliveryPriceToRZone}>
              {addMode === 'new' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">اسم حي التوصيل</label>
                    <input
                      className="form-input"
                      placeholder="مثال: حي مربي، حي الجامعة، حي الشرطة..."
                      value={priceFormData.name}
                      onChange={e => setPriceFormData({ ...priceFormData, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المنطقة الرئيسيّة (التي ينتمي إليها هذا الحي)</label>
                    <select
                      className="form-input"
                      value={priceFormData.parentId}
                      onChange={e => setPriceFormData({ ...priceFormData, parentId: e.target.value })}
                      style={{ padding: '8px 16px', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', height: 'auto' }}
                    >
                      <option value="">حي مستقل (لا يتبع لأي منطقة رئيسية)</option>
                      {parentGroups.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                      <option value="__NEW__">+ إنشاء منطقة رئيسية جديدة (مثال: الدليم، السيدية)</option>
                    </select>
                  </div>

                  {priceFormData.parentId === '__NEW__' && (
                    <div className="form-group" style={{ background: 'rgba(92, 115, 255, 0.05)', padding: 12, borderRadius: 8 }}>
                      <label className="form-label" style={{ color: 'var(--primary)' }}>اسم المنطقة الرئيسية الجديدة</label>
                      <input
                        className="form-input"
                        placeholder="مثال: الدليم، السيدية، الكرادة..."
                        value={priceFormData.newParentName}
                        onChange={e => setPriceFormData({ ...priceFormData, newParentName: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">منطقة / حي التوصيل</label>
                  <select
                    className="form-input"
                    value={priceFormData.deliveryZoneId}
                    onChange={e => setPriceFormData({ ...priceFormData, deliveryZoneId: e.target.value })}
                    required
                    style={{ padding: '10px 16px', fontFamily: 'Cairo', fontSize: 14, direction: 'rtl', height: 'auto' }}
                  >
                    <option value="">-- اختر حي التوصيل --</option>
                    {availableDeliveryZonesForRZone.map(dz => {
                      const parent = zones.find(p => p.id === dz.parentId);
                      return (
                        <option key={dz.id} value={dz.id}>
                          {dz.name} {parent ? `(${parent.name})` : '(حي مستقل)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر التوصيل (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 3000"
                    value={priceFormData.deliveryPrice}
                    onChange={e => setPriceFormData({ ...priceFormData, deliveryPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">استقطاع السائق (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 500"
                    value={priceFormData.driverDeduction}
                    onChange={e => setPriceFormData({ ...priceFormData, driverDeduction: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={priceSaving}>
                  {priceSaving ? 'جاري الحفظ...' : 'حفظ وسعر التوصيل'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddDeliveryPriceModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal تعديل سعر التوصيل لحي مضاف */}
      {editingDeliveryPriceZone && selectedRZoneObj && (
        <div className="modal-overlay" onClick={() => setEditingDeliveryPriceZone(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal-title">تعديل سعر التوصيل لـ "{editingDeliveryPriceZone.name}"</div>
            <div className="modal-subtitle">منطقة المطعم: "{selectedRZoneObj.name}"</div>
            <form onSubmit={handleSaveDeliveryPriceToRZone}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر التوصيل (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 3000"
                    value={priceFormData.deliveryPrice}
                    onChange={e => setPriceFormData({ ...priceFormData, deliveryPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">استقطاع السائق (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 500"
                    value={priceFormData.driverDeduction}
                    onChange={e => setPriceFormData({ ...priceFormData, driverDeduction: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={priceSaving}>
                  {priceSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditingDeliveryPriceZone(null)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal إضافة منطقة مطعم جديدة */}
      {showAddRZoneModal && (
        <div className="modal-overlay" onClick={() => setShowAddRZoneModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-title">إضافة منطقة مطعم جديدة</div>
            <div className="modal-subtitle">أدخل اسم منطقة المطعم فقط (مثل: الدليم، الدورة، الاعلام...)</div>
            <form onSubmit={handleCreateRZone}>
              <div className="form-group">
                <label className="form-label">اسم منطقة المطعم</label>
                <input
                  className="form-input"
                  placeholder="مثال: الدليم"
                  value={rZoneNameInput}
                  onChange={e => setRZoneNameInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={rZoneSaving}>
                  {rZoneSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddRZoneModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal تعديل اسم منطقة المطعم */}
      {editingRZone && (
        <div className="modal-overlay" onClick={() => setEditingRZone(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-title">تعديل اسم منطقة المطعم</div>
            <form onSubmit={handleUpdateRZone}>
              <div className="form-group">
                <label className="form-label">اسم منطقة المطعم</label>
                <input
                  className="form-input"
                  value={rZoneNameInput}
                  onChange={e => setRZoneNameInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={rZoneSaving}>
                  {rZoneSaving ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditingRZone(null)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal إنشاء منطقة رئيسية وتخصيص أول حي وفرض أسعاره لمنطقة المطعم الحالية */}
      {formType === 'parent' && selectedRZoneObj && (
        <div className="modal-overlay" onClick={() => setFormType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal-title">إضافة منطقة رئيسية لـ "{selectedRZoneObj.name}"</div>
            <div className="modal-subtitle">سيتم إنشاء منطقة رئيسية وتحديد أول حي مسعر ينتمي إليها حصرياً لـ "{selectedRZoneObj.name}"</div>
            <form onSubmit={handleCreateParent}>
              <div className="form-group">
                <label className="form-label">اسم المنطقة الرئيسية</label>
                <input
                  className="form-input"
                  placeholder="مثال: الدورة، المنصور، السيدية..."
                  value={parentFormData.name}
                  onChange={e => setParentFormData({ ...parentFormData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم أول حي فرعي بداخلها (مطلوب لتحديد السعر)</label>
                <input
                  className="form-input"
                  placeholder="مثال: الطعمة، الجمعية، شارع 60..."
                  value={parentFormData.childName}
                  onChange={e => setParentFormData({ ...parentFormData, childName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر التوصيل من {selectedRZoneObj.name} (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 3000"
                    value={parentFormData.deliveryPrice}
                    onChange={e => setParentFormData({ ...parentFormData, deliveryPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">استقطاع السائق (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 500"
                    value={parentFormData.driverDeduction}
                    onChange={e => setParentFormData({ ...parentFormData, driverDeduction: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : `حفظ وتخصيص لـ ${selectedRZoneObj.name}`}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setFormType(null)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
