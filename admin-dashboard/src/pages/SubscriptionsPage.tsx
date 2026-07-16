import React, { useState, useEffect } from 'react';
import { restaurantsAPI } from '../services/api';
import { CalendarIcon, CheckCircleIcon, XCircleIcon, SearchIcon, StoreIcon, TicketIcon } from '../components/common/Icons';
import { useSearch } from '../hooks/useSearch';

export default function SubscriptionsPage() {
  const { searchQuery } = useSearch();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [selectedRestId, setSelectedRestId] = useState('');
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState('');
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);

  // Search filter inside the add subscriber modal
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await restaurantsAPI.getAll();
      setRestaurants(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (id: string, currentBillingMode: string) => {
    const newBillingMode = currentBillingMode === 'subscription' ? 'sub_suspended' : 'subscription';
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, billingMode: newBillingMode } : r));
    try {
      await restaurantsAPI.update(id, {
        billingMode: newBillingMode,
      });
      loadData();
    } catch (err: any) {
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, billingMode: currentBillingMode } : r));
      alert('فشل تغيير حالة الاشتراك');
    }
  };

  const handleOpenAddModal = () => {
    const nonSubscribed = restaurants.filter(r => r.billingMode !== 'subscription' && r.billingMode !== 'sub_suspended');
    if (nonSubscribed.length === 0) {
      alert('جميع المطاعم مسجلة بنظام الاشتراك بالفعل!');
      return;
    }
    
    // Set default value 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const defaultDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    setSelectedRestId(nonSubscribed[0]?.id || '');
    setSubscriptionExpiresAt(defaultDate);
    setModalSearch('');
    setShowAddModal(true);
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestId || !subscriptionExpiresAt) {
      alert('يرجى تحديد المطعم وتاريخ انتهاء الاشتراك');
      return;
    }

    try {
      await restaurantsAPI.update(selectedRestId, {
        billingMode: 'subscription',
        subscriptionExpiresAt: subscriptionExpiresAt,
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تفعيل الاشتراك');
    }
  };

  const handleOpenEditModal = (r: any) => {
    setEditingRestaurant(r);
    const dateStr = r.subscriptionExpiresAt ? r.subscriptionExpiresAt.substring(0, 10) : '';
    setSubscriptionExpiresAt(dateStr);
    setShowEditModal(true);
  };

  const handleEditSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant || !subscriptionExpiresAt) {
      alert('يرجى تحديد تاريخ انتهاء الاشتراك');
      return;
    }

    try {
      await restaurantsAPI.update(editingRestaurant.id, {
        billingMode: 'subscription',
        subscriptionExpiresAt: subscriptionExpiresAt,
      });
      setShowEditModal(false);
      setEditingRestaurant(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تعديل الاشتراك');
    }
  };

  const handleCancelSubscription = async (r: any) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء اشتراك مطعم "${r.name}" والعودة لنظام العمولة للطلب؟`)) return;
    try {
      await restaurantsAPI.update(r.id, {
        billingMode: 'commission',
        subscriptionExpiresAt: null,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إلغاء الاشتراك');
    }
  };

  // Filter calculations
  const subscribed = restaurants.filter(r => r.billingMode === 'subscription' || r.billingMode === 'sub_suspended');
  const nonSubscribed = restaurants.filter(r => r.billingMode !== 'subscription' && r.billingMode !== 'sub_suspended');

  const now = new Date();
  const activeSubscribed = subscribed.filter(r => {
    if (r.billingMode === 'sub_suspended') return false;
    if (!r.subscriptionExpiresAt) return true; // perpetual
    return new Date(r.subscriptionExpiresAt) > now;
  });
  const expiredSubscribed = subscribed.filter(r => {
    if (r.billingMode === 'sub_suspended') return false;
    if (!r.subscriptionExpiresAt) return false;
    return new Date(r.subscriptionExpiresAt) <= now;
  });

  const filteredSubscribers = searchQuery.trim()
    ? subscribed.filter(r =>
        (r.name || '').includes(searchQuery) ||
        (r.phone || '').includes(searchQuery)
      )
    : subscribed;

  // Filter non-subscribed in modal
  const filteredNonSubscribed = nonSubscribed.filter(r =>
    (r.name || '').includes(modalSearch) ||
    (r.phone || '').includes(modalSearch)
  );

  const getDaysRemaining = (expiryStr: string | null) => {
    if (!expiryStr) return 'دائم';
    const diff = new Date(expiryStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} يوم` : 'منتهي';
  };

  return (
    <div>
      <div className="page-header">
        <h1>إدارة الاشتراكات</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={loadData}
            style={{
              padding: '8px 16px',
              fontSize: '13.5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            تحديث
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{
              padding: '8px 16px',
              fontSize: '13.5px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            تفعيل اشتراك لمطعم
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <CalendarIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{subscribed.length}</h3>
            <p>إجمالي المطاعم المشتركة</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{activeSubscribed.length}</h3>
            <p>اشتراكات نشطة</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">
            <XCircleIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{expiredSubscribed.length}</h3>
            <p>اشتراكات منتهية</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>المطعم</th>
              <th>الهاتف</th>
              <th>تاريخ انتهاء الاشتراك</th>
              <th>الأيام المتبقية</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : filteredSubscribers.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ color: 'var(--primary)' }}>
                    <TicketIcon size={40} />
                  </div>
                  <div className="empty-state-text">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مطاعم مشتركة حالياً'}</div>
                </div>
              </td></tr>
            ) : (
              filteredSubscribers.map(r => {
                const isExpired = r.subscriptionExpiresAt ? new Date(r.subscriptionExpiresAt) <= now : false;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={r.name}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'var(--primary-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)', fontWeight: 800, fontSize: 15, flexShrink: 0,
                          }}>
                            {r.name?.charAt(0)}
                          </div>
                        )}
                        <strong style={{ color: 'var(--primary)' }}>{r.name}</strong>
                      </div>
                    </td>
                    <td><span style={{ direction: 'ltr', display: 'inline-block' }}>{r.phone}</span></td>
                    <td>
                      {r.subscriptionExpiresAt
                        ? new Date(r.subscriptionExpiresAt).toLocaleDateString('ar-IQ')
                        : 'اشتراك دائم'}
                    </td>
                    <td>
                      <strong style={{ color: isExpired ? '#ef4444' : '#10b981' }}>
                        {getDaysRemaining(r.subscriptionExpiresAt)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label className="toggle-switch" title={r.billingMode === 'subscription' ? 'تعليق الاشتراك' : 'تفعيل الاشتراك'}>
                          <input
                            type="checkbox"
                            checked={r.billingMode === 'subscription'}
                            onChange={() => handleToggleSubscription(r.id, r.billingMode)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <span style={{ fontSize: 12, fontWeight: 700, color: r.billingMode === 'subscription' ? '#10b981' : '#ef4444' }}>
                          {r.billingMode === 'subscription' ? 'نشط' : 'معلق'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleOpenEditModal(r)}
                          style={{
                            fontSize: 12,
                            padding: '6px 14px',
                            backgroundColor: 'var(--primary-bg)',
                            color: 'var(--primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          تعديل المدة
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleCancelSubscription(r)}
                          style={{
                            fontSize: 12,
                            padding: '6px 14px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--danger)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          إلغاء الاشتراك
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-title">تفعيل اشتراك لمطعم</div>
            <div className="modal-subtitle">اختر مطعماً عادياً لتحويله لنظام الاشتراك الشهري (بدون عمولات)</div>

            <form onSubmit={handleAddSubscription}>
              {/* Search Inside Modal */}
              <div className="form-group">
                <label className="form-label">البحث عن مطعم</label>
                <div style={{ position: 'relative' }}>
                  <span className="search-icon" style={{ right: 12, left: 'auto' }}><SearchIcon size={16} /></span>
                  <input
                    type="text"
                    placeholder="ابحث عن مطعم باسمه أو هاتفه..."
                    className="form-input"
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                    style={{ paddingRight: 36, paddingLeft: 12, height: 42 }}
                  />
                </div>
              </div>

              {/* Scrollable Restaurant List */}
              <div className="form-group">
                <label className="form-label">اختر المطعم من القائمة</label>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {filteredNonSubscribed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                      لا توجد مطاعم مطابقة للبحث
                    </div>
                  ) : (
                    filteredNonSubscribed.map(r => {
                      const isSelected = selectedRestId === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRestId(r.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-xs)',
                            background: isSelected ? 'var(--primary-bg)' : 'white',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: isSelected ? 'white' : 'var(--bg-page)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--primary)', fontWeight: 800, fontSize: 13,
                              border: '1px solid var(--border)',
                              flexShrink: 0
                            }}>
                              {r.name?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.phone}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 14 }}>✓</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ انتهاء الاشتراك</label>
                <input
                  type="date"
                  className="form-input"
                  value={subscriptionExpiresAt}
                  onChange={e => setSubscriptionExpiresAt(e.target.value)}
                  required
                  style={{ height: 42 }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">تفعيل الاشتراك</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && editingRestaurant && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingRestaurant(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">تعديل اشتراك مطعم {editingRestaurant.name}</div>
            <div className="modal-subtitle">تعديل تاريخ انتهاء الاشتراك الشهري للمطعم</div>

            <form onSubmit={handleEditSubscription}>
              <div className="form-group">
                <label className="form-label">تاريخ انتهاء الاشتراك الجديد</label>
                <input
                  type="date"
                  className="form-input"
                  value={subscriptionExpiresAt}
                  onChange={e => setSubscriptionExpiresAt(e.target.value)}
                  required
                  style={{ height: 42 }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowEditModal(false); setEditingRestaurant(null); }}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التغييرات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
