import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { restaurantsAPI } from '../services/api';

/* ─── Status config ─── */
const statusConfig: Record<string, { label: string; cls: string }> = {
  searching_driver:     { label: 'بحث عن سائق',    cls: 'badge-warning' },
  assigned:             { label: 'تم التعيين',      cls: 'badge-info'    },
  arrived_at_restaurant:{ label: 'وصل للمطعم',     cls: 'badge-purple'  },
  heading_to_customer:  { label: 'في الطريق',       cls: 'badge-info'    },
  delivered:            { label: 'تم التوصيل',      cls: 'badge-success' },
  cancelled:            { label: 'ملغي',             cls: 'badge-danger'  },
  no_drivers_available: { label: 'لا يوجد سائقون', cls: 'badge-warning' },
};

/* ─── Date range presets ─── */
function getRange(preset: string): { from: string; to: string } {
  const now  = new Date();
  const pad  = (n: number) => String(n).padStart(2, '0');
  const fmt  = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  switch (preset) {
    case 'today': {
      return { from: today, to: today };
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { from: fmt(start), to: today };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: today };
    }
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

export default function RestaurantDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  // حساب تاريخ اليوم كقيمة افتراضية
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [preset,     setPreset]     = useState('today');     // ← اليوم افتراضياً
  const [fromDate,   setFromDate]   = useState(todayStr);
  const [toDate,     setToDate]     = useState(todayStr);
  const [exporting,  setExporting]  = useState(false);

  /* ─── Fetch ─── */
  const load = useCallback(async (from?: string, to?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to)   params.to   = to;

      const [restRes, ordersRes] = await Promise.all([
        restaurantsAPI.getById(id).catch(() => ({ data: null })),
        restaurantsAPI.getOrders(id, params).catch(() => ({ data: [] })),
      ]);
      setRestaurant(restRes.data);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // تحميل بيانات اليوم افتراضياً عند فتح الصفحة
  useEffect(() => { load(todayStr, todayStr); }, [load]);

  /* ─── Apply preset ─── */
  const applyPreset = (p: string) => {
    setPreset(p);
    if (p === 'custom') return;          // let user pick dates
    const { from, to } = getRange(p);
    setFromDate(from);
    setToDate(to);
    load(from || undefined, to || undefined);
  };

  const applyCustom = () => {
    load(fromDate || undefined, toDate || undefined);
  };

  /* ─── Stats ─── */
  const total     = orders.length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;
  const revenue   = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (parseFloat(o.orderValue || 0)), 0);

  /* ─── PDF Export ─── */
  const exportPDF = () => {
    setExporting(true);
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const dateStr = new Date().toLocaleDateString('ar-IQ');
      const timeStr = new Date().toLocaleTimeString('ar-IQ');

      const statusLabels: Record<string, string> = {
        searching_driver: 'بحث عن سائق',
        assigned: 'تم التعيين',
        arrived_at_restaurant: 'وصل للمطعم',
        heading_to_customer: 'في الطريق',
        delivered: 'تم التوصيل',
        cancelled: 'ملغي',
        no_drivers_available: 'لا يوجد سائقون',
      };

      const tableRowsHTML = orders.map(o => {
        const oDate = new Date(o.createdAt);
        const amount = parseFloat(o.orderValue || 0);
        return `
          <tr>
            <td>#${parseInt(String(o.id).replace(/-/g, '').slice(0, 8), 16)}</td>
            <td>${oDate.toLocaleDateString('ar-IQ')}</td>
            <td style="direction: ltr; text-align: center;">${oDate.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="direction: ltr;">${o.customerPhone || '-'}</td>
            <td>${o.zone?.name || '-'}</td>
            <td><strong>${amount.toLocaleString('ar-IQ')} د.ع</strong></td>
            <td>${statusLabels[o.status] || o.status}</td>
          </tr>
        `;
      }).join('');

      const periodLabel = (() => {
        if (preset === 'today') return 'اليوم';
        if (preset === 'week') return 'هذا الأسبوع';
        if (preset === 'month') return 'هذا الشهر';
        if (preset === 'custom') return `الفترة مخصص من: ${fromDate} إلى: ${toDate}`;
        return 'الكل';
      })();

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقرير مبيعات مطعم ${restaurant?.name || ''}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Cairo', sans-serif;
              color: #1e293b;
              padding: 40px;
              background: #fff;
              line-height: 1.5;
            }
            header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #5c73ff;
            }
            .meta {
              text-align: left;
              font-size: 13px;
              color: #64748b;
            }
            .restaurant-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 24px;
            }
            .restaurant-name {
              font-size: 18px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 4px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 28px;
            }
            .stat-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
            }
            .stat-card h3 {
              font-size: 20px;
              font-weight: 800;
              color: #1e293b;
              margin-bottom: 4px;
            }
            .stat-card p {
              font-size: 12px;
              color: #64748b;
            }
            .table-title {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 10px 12px;
              font-size: 12px;
              text-align: right;
            }
            th {
              background: #f1f5f9;
              font-weight: 700;
              color: #475569;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px dashed #e2e8f0;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="title">تقرير طلبات ومبيعات المطعم</div>
              <div style="font-size: 14px; font-weight: 600; color: #475569; margin-top: 4px;">فترة التقرير: ${periodLabel}</div>
            </div>
            <div class="meta">
              <div>تاريخ الطباعة: ${dateStr}</div>
              <div>وقت الطباعة: ${timeStr}</div>
            </div>
          </header>

          <div class="restaurant-box">
            <div class="restaurant-name">${restaurant?.name || ''}</div>
            <div style="font-size: 13px; color: #64748b;">رقم الهاتف: <span style="direction: ltr; display: inline-block;">${restaurant?.phone || ''}</span></div>
          </div>

          <div class="stats-grid">
            <div class="stat-card" style="border-top: 4px solid #5c73ff;">
              <h3>${total}</h3>
              <p>إجمالي الطلبات</p>
            </div>
            <div class="stat-card" style="border-top: 4px solid #10b981;">
              <h3>${delivered}</h3>
              <p>تم التوصيل</p>
            </div>
            <div class="stat-card" style="border-top: 4px solid #ef4444;">
              <h3>${cancelled}</h3>
              <p>ملغية</p>
            </div>
            <div class="stat-card" style="border-top: 4px solid #f59e0b;">
              <h3>${revenue.toLocaleString('ar-IQ')} د.ع</h3>
              <p>الإيرادات الإجمالية</p>
            </div>
          </div>

          <div class="table-title">قائمة تفاصيل الطلبات</div>
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>التاريخ</th>
                <th>الوقت</th>
                <th>رقم العميل</th>
                <th>المنطقة</th>
                <th>قيمة الطلب</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>

          <footer>
            هذا التقرير تم إنشاؤه تلقائياً بواسطة منصة إدارة التوصيل.
          </footer>
        </body>
        </html>
      `;

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          setExporting(false);
        }, 1000);
      }, 500);

    } catch (err) {
      console.error(err);
      setExporting(false);
    }
  };

  /* ─── Render ─── */
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/restaurants')}
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            ← العودة للمطاعم
          </button>
          <h1 style={{ margin: 0 }}>
            {loading ? 'جاري التحميل...' : (restaurant?.name || 'تفاصيل المطعم')}
          </h1>
          {restaurant && (
            <span className={`badge ${restaurant.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
              {restaurant.status === 'active' ? 'نشط' : 'معلق'}
            </span>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={exportPDF}
          disabled={exporting || orders.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          تصدير PDF
        </button>
      </div>

      {/* Restaurant Info Card */}
      {restaurant && (
        <div className="card" style={{ marginBottom: 24, padding: '20px 28px' }}>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--primary-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 22, fontWeight: 800, flexShrink: 0,
              }}>
                {restaurant.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{restaurant.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right', marginTop: 2 }}>{restaurant.phone}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>تاريخ التسجيل</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {new Date(restaurant.createdAt).toLocaleDateString('ar-IQ')}
                </div>
              </div>
              {restaurant.zone && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>المنطقة</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{restaurant.zone.name}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>نظام الفوترة</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {restaurant.billingMode === 'subscription' ? 'اشتراك شهري' : 'عمولة لكل طلب'}
                </div>
              </div>
              {restaurant.billingMode === 'subscription' && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>تاريخ انتهاء الاشتراك</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {restaurant.subscriptionExpiresAt ? new Date(restaurant.subscriptionExpiresAt).toLocaleDateString('ar-IQ') : 'دائم'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div className="stat-info"><h3>{total}</h3><p>إجمالي الطلبات</p></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="stat-info"><h3>{delivered}</h3><p>تم التوصيل</p></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="stat-info"><h3>{cancelled}</h3><p>ملغية</p></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="stat-info">
            <h3>{revenue.toLocaleString('ar-IQ')}</h3>
            <p>الإيرادات (د.ع)</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 4 }}>الفترة:</span>

          {[
            { key: 'all',    label: 'الكل' },
            { key: 'today',  label: 'اليوم' },
            { key: 'week',   label: 'هذا الأسبوع' },
            { key: 'month',  label: 'هذا الشهر' },
            { key: 'custom', label: 'مخصص' },
          ].map(p => (
            <button
              key={p.key}
              className={`btn btn-sm ${preset === p.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <>
              <input
                type="date"
                className="form-input"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ width: 140, padding: '6px 10px', fontSize: 13 }}
              />
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              <input
                type="date"
                className="form-input"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ width: 140, padding: '6px 10px', fontSize: 13 }}
              />
              <button className="btn btn-primary btn-sm" onClick={applyCustom}>بحث</button>
            </>
          )}

          {total > 0 && (
            <span style={{ marginRight: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              {total} طلب في الفترة المحددة
            </span>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>رقم العميل</th>
              <th>المنطقة / العنوان</th>
              <th>قيمة الطلب</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                      </svg>
                    </div>
                    <div className="empty-state-text">لا توجد طلبات في الفترة المحددة</div>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order, idx) => {
                const date    = new Date(order.createdAt);
                const status  = statusConfig[order.status] || { label: order.status, cls: 'badge-gray' };
                const amount  = parseFloat(order.orderValue || 0);
                return (
                  <tr key={order.id || idx}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                        #{parseInt(String(order.id).replace(/-/g, '').slice(0, 8), 16)}
                      </span>
                    </td>
                    <td>{date.toLocaleDateString('ar-IQ')}</td>
                    <td style={{ direction: 'ltr', textAlign: 'center' }}>{date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{order.customerPhone || '-'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{order.zone?.name || '-'}</div>
                      {order.customerAddress && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.customerAddress}</div>
                      )}
                    </td>
                    <td>
                      <strong>{amount.toLocaleString('ar-IQ')}</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>د.ع</span>
                    </td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
