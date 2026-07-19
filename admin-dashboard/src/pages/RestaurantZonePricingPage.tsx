import React, { useState, useEffect, useMemo } from 'react';
import { zonesAPI, restaurantZonePricingAPI } from '../services/api';
import {
  MapIcon,
  MapPinIcon,
  FolderIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
} from '../components/common/Icons';
import { useAuth } from '../hooks/useAuth';

interface Zone {
  id: string;
  name: string;
  isGroup: boolean;
  parentId: string | null;
  isActive: boolean;
  deliveryPrice?: number;
  driverDeduction?: number;
}

interface ZonePrice {
  restaurantZoneId: string;
  deliveryZoneId: string;
  deliveryPrice: number;
  driverDeduction: number;
  deliveryZone: Zone;
}

export default function RestaurantZonePricingPage() {
  const { user } = useAuth();
  const canUpdate = user?.role === 'admin' || user?.permissions?.restaurants?.update === true;

  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [selectedOriginZoneId, setSelectedOriginZoneId] = useState<string>('');
  const [zonePrices, setZonePrices] = useState<ZonePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<{
    deliveryZoneId: string;
    deliveryPrice: string;
    driverDeduction: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPriceData, setNewPriceData] = useState({
    deliveryZoneId: '',
    deliveryPrice: '',
    driverDeduction: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadZones();
  }, []);

  useEffect(() => {
    if (selectedOriginZoneId) {
      loadZonePrices(selectedOriginZoneId);
    } else {
      setZonePrices([]);
    }
  }, [selectedOriginZoneId]);

  const loadZones = async () => {
    try {
      const { data } = await zonesAPI.getAll();
      setAllZones(data);
    } catch (err) {
      console.error('Failed to load zones:', err);
    }
  };

  const loadZonePrices = async (originZoneId: string) => {
    setLoading(true);
    try {
      const { data } = await restaurantZonePricingAPI.getByOriginZone(originZoneId);
      setZonePrices(data);
    } catch (err) {
      console.error('Failed to load zone prices:', err);
      setZonePrices([]);
    } finally {
      setLoading(false);
    }
  };

  // الأقسام الرئيسية + الأحياء المستقلة كمناطق انطلاق
  const originZones = useMemo(() =>
    allZones.filter(z => z.isGroup || (!z.isGroup && !z.parentId)),
    [allZones]
  );

  // جميع الأحياء الفرعية والمستقلة (مناطق التوصيل)
  const deliveryZones = useMemo(() =>
    allZones.filter(z => !z.isGroup && z.isActive),
    [allZones]
  );

  // الأحياء التي لم يُعرَّف لها سعر بعد (لإضافتها في نموذج الإضافة)
  const existingPriceIds = new Set(zonePrices.map(p => p.deliveryZoneId));
  const availableToAdd = deliveryZones.filter(z => !existingPriceIds.has(z.id));

  // تصفية حسب البحث
  const filteredPrices = useMemo(() => {
    if (!searchQuery) return zonePrices;
    return zonePrices.filter(p =>
      p.deliveryZone.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [zonePrices, searchQuery]);

  const handleSaveEdit = async () => {
    if (!editingPrice || !selectedOriginZoneId) return;
    setSavingId(editingPrice.deliveryZoneId);
    try {
      await restaurantZonePricingAPI.upsert({
        restaurantZoneId: selectedOriginZoneId,
        deliveryZoneId: editingPrice.deliveryZoneId,
        deliveryPrice: parseFloat(editingPrice.deliveryPrice || '0'),
        driverDeduction: parseFloat(editingPrice.driverDeduction || '0'),
      });
      setEditingPrice(null);
      await loadZonePrices(selectedOriginZoneId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حفظ السعر');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (deliveryZoneId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السعر؟')) return;
    try {
      await restaurantZonePricingAPI.delete(selectedOriginZoneId, deliveryZoneId);
      await loadZonePrices(selectedOriginZoneId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل الحذف');
    }
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriceData.deliveryZoneId || !selectedOriginZoneId) return;
    setSavingId('new');
    try {
      await restaurantZonePricingAPI.upsert({
        restaurantZoneId: selectedOriginZoneId,
        deliveryZoneId: newPriceData.deliveryZoneId,
        deliveryPrice: parseFloat(newPriceData.deliveryPrice || '0'),
        driverDeduction: parseFloat(newPriceData.driverDeduction || '0'),
      });
      setNewPriceData({ deliveryZoneId: '', deliveryPrice: '', driverDeduction: '' });
      setShowAddForm(false);
      await loadZonePrices(selectedOriginZoneId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إضافة السعر');
    } finally {
      setSavingId(null);
    }
  };

  const getParentName = (zone: Zone) => {
    if (zone.parentId) {
      const parent = allZones.find(z => z.id === zone.parentId);
      return parent ? parent.name : '';
    }
    return 'مستقل';
  };

  const selectedOriginZone = allZones.find(z => z.id === selectedOriginZoneId);

  return (
    <div>
      <div className="page-header">
        <h1>أسعار التوصيل حسب منطقة المطعم</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0 0' }}>
          حدد منطقة الانطلاق (موقع المطعم) لرؤية وتعديل أسعار التوصيل إلى كل حي
        </p>
      </div>

      {/* إحصائيات */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon primary"><MapIcon size={24} /></div>
          <div className="stat-info">
            <h3>{originZones.length}</h3>
            <p>مناطق انطلاق متاحة</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><MapPinIcon size={24} /></div>
          <div className="stat-info">
            <h3>{deliveryZones.length}</h3>
            <p>أحياء توصيل نشطة</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
            <CheckCircleIcon size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-info">
            <h3>{zonePrices.length}</h3>
            <p>أسعار مُعرَّفة للمنطقة المختارة</p>
          </div>
        </div>
      </div>

      {/* اختيار منطقة الانطلاق */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderIcon size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>منطقة انطلاق المطعم:</span>
          </div>
          <select
            id="origin-zone-select"
            className="form-input"
            value={selectedOriginZoneId}
            onChange={e => setSelectedOriginZoneId(e.target.value)}
            style={{
              minWidth: 240,
              padding: '10px 16px',
              fontFamily: 'Cairo',
              fontSize: 14,
              direction: 'rtl',
              height: 'auto',
              border: '1.5px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="">-- اختر منطقة الانطلاق --</option>
            {originZones.map(z => (
              <option key={z.id} value={z.id}>
                {z.isGroup ? '📁 ' : '📍 '}{z.name}
              </option>
            ))}
          </select>

          {selectedOriginZone && canUpdate && (
            <button
              className="btn btn-primary"
              onClick={() => { setShowAddForm(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <PlusIcon size={16} />
              إضافة سعر توصيل جديد
            </button>
          )}
        </div>

        {selectedOriginZone && (
          <div style={{
            marginTop: 12,
            padding: '10px 16px',
            background: 'rgba(92, 115, 255, 0.05)',
            borderRadius: 'var(--radius-sm)',
            borderRight: '3px solid var(--primary)',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>منطقة الانطلاق المختارة: </strong>
            {selectedOriginZone.name} —
            ستُحدَّد أسعار التوصيل من هذه المنطقة إلى كل حي/منطقة في النظام.
            المطاعم المسجلة في هذه المنطقة ستستخدم هذه الأسعار تلقائياً.
          </div>
        )}
      </div>

      {/* جدول الأسعار */}
      {selectedOriginZoneId && (
        <>
          {/* شريط البحث */}
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="البحث عن حي..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingRight: 40, width: '100%', height: 44, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
            />
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>حي / منطقة التوصيل</th>
                  <th>القسم الرئيسي</th>
                  <th>سعر التوصيل (د.ع)</th>
                  <th>استقطاع السائق (د.ع)</th>
                  {canUpdate && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
                ) : filteredPrices.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><MapPinIcon size={48} /></div>
                        <div className="empty-state-text">
                          {searchQuery ? 'لا توجد نتائج مطابقة' : `لا توجد أسعار مُعرَّفة لمنطقة "${selectedOriginZone?.name}" بعد`}
                        </div>
                        {!searchQuery && canUpdate && (
                          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAddForm(true)}>
                            <PlusIcon size={16} style={{ marginLeft: 6 }} />
                            إضافة أول سعر توصيل
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPrices.map(price => (
                    <tr key={price.deliveryZoneId}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                          <MapPinIcon size={14} style={{ color: 'var(--primary)' }} />
                          {price.deliveryZone.name}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {getParentName(price.deliveryZone)}
                        </span>
                      </td>
                      <td>
                        {editingPrice?.deliveryZoneId === price.deliveryZoneId ? (
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={editingPrice.deliveryPrice}
                            onChange={e => setEditingPrice({ ...editingPrice, deliveryPrice: e.target.value })}
                            style={{ width: 120, padding: '6px 10px', height: 'auto' }}
                          />
                        ) : (
                          <strong style={{ color: 'var(--primary)', fontSize: 14 }}>{Number(price.deliveryPrice).toLocaleString()} د.ع</strong>
                        )}
                      </td>
                      <td>
                        {editingPrice?.deliveryZoneId === price.deliveryZoneId ? (
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={editingPrice.driverDeduction}
                            onChange={e => setEditingPrice({ ...editingPrice, driverDeduction: e.target.value })}
                            style={{ width: 120, padding: '6px 10px', height: 'auto' }}
                          />
                        ) : (
                          <strong style={{ color: '#10b981', fontSize: 14 }}>{Number(price.driverDeduction).toLocaleString()} د.ع</strong>
                        )}
                      </td>
                      {canUpdate && (
                        <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {editingPrice?.deliveryZoneId === price.deliveryZoneId ? (
                            <>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '5px 14px', fontSize: 12 }}
                                onClick={handleSaveEdit}
                                disabled={savingId === price.deliveryZoneId}
                              >
                                {savingId === price.deliveryZoneId ? '...' : 'حفظ'}
                              </button>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '5px 10px', fontSize: 12 }}
                                onClick={() => setEditingPrice(null)}
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="action-btn btn-edit"
                                onClick={() => setEditingPrice({
                                  deliveryZoneId: price.deliveryZoneId,
                                  deliveryPrice: String(price.deliveryPrice),
                                  driverDeduction: String(price.driverDeduction),
                                })}
                                title="تعديل السعر"
                              >
                                <EditIcon size={16} />
                              </button>
                              <button
                                className="action-btn btn-delete"
                                onClick={() => handleDelete(price.deliveryZoneId)}
                                title="حذف السعر"
                              >
                                <TrashIcon size={16} />
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* نموذج إضافة سعر جديد (Modal) */}
      {showAddForm && selectedOriginZoneId && (
        <div className="modal-overlay" onClick={() => { setShowAddForm(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal-title">إضافة سعر توصيل جديد</div>
            <div className="modal-subtitle">
              من: <strong>{selectedOriginZone?.name}</strong> ← إلى حي التوصيل المحدد
            </div>
            <form onSubmit={handleAddNew}>
              <div className="form-group">
                <label className="form-label">حي / منطقة التوصيل</label>
                <select
                  className="form-input"
                  value={newPriceData.deliveryZoneId}
                  onChange={e => setNewPriceData({ ...newPriceData, deliveryZoneId: e.target.value })}
                  required
                  style={{ padding: '10px 16px', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', height: 'auto' }}
                >
                  <option value="">-- اختر حي التوصيل --</option>
                  {availableToAdd.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name} {z.parentId ? `(${allZones.find(p => p.id === z.parentId)?.name || ''})` : '(مستقل)'}
                    </option>
                  ))}
                </select>
                {availableToAdd.length === 0 && (
                  <p style={{ color: '#10b981', fontSize: 12, marginTop: 6 }}>✅ تم تعريف أسعار لجميع الأحياء المتاحة</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر التوصيل (د.ع)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="مثال: 2000"
                    value={newPriceData.deliveryPrice}
                    onChange={e => setNewPriceData({ ...newPriceData, deliveryPrice: e.target.value })}
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
                    value={newPriceData.driverDeduction}
                    onChange={e => setNewPriceData({ ...newPriceData, driverDeduction: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={savingId === 'new' || availableToAdd.length === 0}
                >
                  {savingId === 'new' ? 'جاري الحفظ...' : 'حفظ السعر'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
