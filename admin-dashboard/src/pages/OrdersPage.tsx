import React, { useState, useEffect } from 'react';
import { ordersAPI, driversAPI } from '../services/api';
import { PackageIcon, ClockIcon, CheckCircleIcon, XCircleIcon, TruckIcon, CalendarIcon, StoreIcon } from '../components/common/Icons';
import { useSearch } from '../hooks/useSearch';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  searching_driver: { label: 'بحث عن سائق', color: '#b45309', bg: 'rgba(245,158,11,0.1)' },
  assigned: { label: 'تم التعيين', color: '#1d4ed8', bg: 'rgba(59,130,246,0.1)' },
  arrived_at_restaurant: { label: 'وصل للمطعم', color: '#7c3aed', bg: 'rgba(139,92,246,0.1)' },
  heading_to_customer: { label: 'في الطريق', color: '#059669', bg: 'rgba(16,185,129,0.1)' },
  delivered: { label: 'تم التوصيل', color: '#059669', bg: 'rgba(16,185,129,0.1)' },
  cancelled: { label: 'ملغي', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  no_drivers_available: { label: 'لا يوجد سائقون', color: '#b45309', bg: 'rgba(245,158,11,0.1)' },
};

export default function OrdersPage() {
  const { searchQuery } = useSearch();
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewDriver, setViewDriver] = useState<any | null>(null);
  const [viewOrder, setViewOrder] = useState<any | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, driversRes] = await Promise.all([
        ordersAPI.getAll().catch(() => ({ data: [] })),
        driversAPI.getAvailable().catch(() => ({ data: [] })),
      ]);
      setOrders(ordersRes.data || []);
      setDrivers(driversRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (orderId: string, driverId: string) => {
    try {
      await ordersAPI.manuallyAssign(orderId, driverId);
      setSelectedOrder(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل التعيين');
    }
  };

  const statusFiltered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const filtered = searchQuery.trim()
    ? statusFiltered.filter(o =>
        (o.restaurant?.name || '').includes(searchQuery) ||
        (o.customerPhone || '').includes(searchQuery) ||
        (o.zone?.name || '').includes(searchQuery) ||
        (o.id || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : statusFiltered;

  const stats = {
    total: orders.length,
    active: orders.filter(o => ['searching_driver', 'assigned', 'arrived_at_restaurant', 'heading_to_customer'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>الطلبات</h1>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>🔄 تحديث</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <PackageIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>إجمالي الطلبات</p>
            <span className="stat-percentage">جميع الطلبات المكتملة والنشطة</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <ClockIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>طلبات نشطة</p>
            <span className="stat-percentage">+5% زيادة هذا الأسبوع</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.delivered}</h3>
            <p>تم التوصيل</p>
            <span className="stat-percentage">معدل إكمال 98% هذا الشهر</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">
            <XCircleIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.cancelled}</h3>
            <p>ملغية</p>
            <span className="stat-percentage">-2% انخفاض عن الشهر الماضي</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <span className="card-title">قائمة الطلبات</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'searching_driver', 'delivered', 'cancelled'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'الكل' : statusConfig[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المطعم</th>
              <th>المنطقة</th>
              <th>هاتف العميل</th>
              <th>الحالة</th>
              <th>السعر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <PackageIcon size={48} />
                  </div>
                  <div className="empty-state-text">لا توجد طلبات</div>
                </div>
              </td></tr>
            ) : (
              filtered.map((order) => {
                const st = statusConfig[order.status] || { label: order.status, color: '#6b7280', bg: '#f3f4f6' };
                return (
                  <tr key={order.id}>
                    <td>
                      <span 
                        style={{ fontFamily: 'monospace', fontSize: 13, color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                        onClick={() => setViewOrder(order)}
                      >
                        {String(order.orderNumber || parseInt(order.id.replace(/-/g, '').slice(0, 8), 16)).slice(0, 6)}
                      </span>
                    </td>
                    <td><strong>{order.restaurant?.name || '-'}</strong></td>
                    <td>{order.zone?.name || '-'}</td>
                    <td><span style={{ direction: 'ltr', display: 'inline-block' }}>{order.customerPhone}</span></td>
                    <td>
                      <div>
                        <span className="badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                        {order.driver && (
                          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>
                            السائق:{' '}
                            <span
                              style={{ cursor: 'pointer', textDecoration: 'underline', color: '#1d4ed8', fontWeight: 'bold' }}
                              onClick={() => setViewDriver(order.driver)}
                            >
                              {order.driver.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td><strong>{order.deliveryPrice} د.ع</strong></td>
                    <td>
                      {['searching_driver', 'no_drivers_available'].includes(order.status) && (
                        <button className="btn btn-primary btn-sm" onClick={() => setSelectedOrder(order.id)}>
                          تعيين يدوي
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">تعيين سائق يدوياً</div>
            <div className="modal-subtitle">اختر سائقاً متاحاً لهذا الطلب</div>

            {drivers.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-state-icon">
                  <TruckIcon size={48} />
                </div>
                <div className="empty-state-text">لا يوجد سائقون متاحون حالياً</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
                {drivers.map(driver => (
                  <div key={driver.id} className="driver-card">
                    <div className="driver-info">
                      <h4>{driver.name}</h4>
                      <p>{driver.phone} — الرصيد: {driver.walletBalance} د.ع</p>
                    </div>
                    <button className="btn btn-success btn-sm" onClick={() => handleAssign(selectedOrder, driver.id)}>
                      تعيين
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSelectedOrder(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {viewDriver && (
        <div className="modal-overlay" onClick={() => setViewDriver(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">تفاصيل السائق</div>
            <div className="modal-subtitle">معلومات شريك التوصيل</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span style={{ color: '#9ca3af' }}>الاسم:</span>
                <strong>{viewDriver.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span style={{ color: '#9ca3af' }}>رقم الهاتف:</span>
                <strong style={{ direction: 'ltr' }}>{viewDriver.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span style={{ color: '#9ca3af' }}>الرصيد بالمحفظة:</span>
                <strong>{viewDriver.walletBalance ? `${viewDriver.walletBalance} د.ع` : '0 د.ع'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span style={{ color: '#9ca3af' }}>حالة الحساب:</span>
                <span className={`badge ${viewDriver.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {viewDriver.status === 'active' ? 'نشط' : 'معلق'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span style={{ color: '#9ca3af' }}>التوفر الحالي:</span>
                <strong style={{ color: viewDriver.availabilityStatus === 'available' ? '#10b981' : '#f59e0b' }}>
                  {viewDriver.availabilityStatus === 'available' ? 'متاح' : viewDriver.availabilityStatus === 'on_delivery' ? 'في مهمة' : 'غير متصل'}
                </strong>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setViewDriver(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {viewOrder && (
        <div className="modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">تفاصيل الطلب #{String(viewOrder.orderNumber || parseInt(viewOrder.id.replace(/-/g, '').slice(0, 8), 16)).slice(0, 6)}</div>
            <div className="modal-subtitle">عرض كامل لبيانات وحالة الطلب</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxHeight: '60vh', overflowY: 'auto', padding: '10px 0' }}>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>المطعم</div>
                <strong>{viewOrder.restaurant?.name || '-'}</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>المنطقة</div>
                <strong>{viewOrder.zone?.name || '-'}</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>هاتف العميل</div>
                <strong style={{ direction: 'ltr', display: 'inline-block' }}>{viewOrder.customerPhone}</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>عنوان التوصيل</div>
                <strong>{viewOrder.customerAddress}</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>النقطة الدالة</div>
                <strong>{viewOrder.nearestLandmark || '-'}</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>سعر التوصيل</div>
                <strong>{viewOrder.deliveryPrice} د.ع</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>خصم السائق</div>
                <strong>{viewOrder.driverDeduction} د.ع</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>قيمة الطلب</div>
                <strong>{viewOrder.orderValue} د.ع</strong>
              </div>
              <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6, gridColumn: 'span 2' }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>الحالة الحالية</div>
                <span className="badge" style={{ color: statusConfig[viewOrder.status]?.color, background: statusConfig[viewOrder.status]?.bg }}>
                  {statusConfig[viewOrder.status]?.label || viewOrder.status}
                </span>
              </div>
              {viewOrder.driver && (
                <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 6, gridColumn: 'span 2' }}>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>السائق المعين</div>
                  <strong style={{ color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setViewDriver(viewOrder.driver); setViewOrder(null); }}>
                    {viewOrder.driver.name} ({viewOrder.driver.phone})
                  </strong>
                </div>
              )}
              
              <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#374151' }}>المخطط الزمني للطلب</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, paddingLeft: 8, borderLeft: '2px solid #e5e7eb' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CalendarIcon size={12} />
                    <span>تاريخ الإنشاء: {new Date(viewOrder.createdAt).toLocaleString('ar-IQ')}</span>
                  </div>
                  {viewOrder.assignedAt && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <TruckIcon size={12} />
                      <span>وقت التعيين: {new Date(viewOrder.assignedAt).toLocaleString('ar-IQ')}</span>
                    </div>
                  )}
                  {viewOrder.arrivedRestaurantAt && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <StoreIcon size={12} />
                      <span>الوصول للمطعم: {new Date(viewOrder.arrivedRestaurantAt).toLocaleString('ar-IQ')}</span>
                    </div>
                  )}
                  {viewOrder.pickedUpAt && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <PackageIcon size={12} />
                      <span>استلام الطلب: {new Date(viewOrder.pickedUpAt).toLocaleString('ar-IQ')}</span>
                    </div>
                  )}
                  {viewOrder.deliveredAt && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircleIcon size={12} style={{ color: '#10b981' }} />
                      <span>تم التوصيل: {new Date(viewOrder.deliveredAt).toLocaleString('ar-IQ')}</span>
                    </div>
                  )}
                  {viewOrder.cancelledAt && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <XCircleIcon size={12} style={{ color: '#ef4444' }} />
                      <span>تم الإلغاء: {new Date(viewOrder.cancelledAt).toLocaleString('ar-IQ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setViewOrder(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
