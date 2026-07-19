import React, { useState, useEffect } from 'react';
import { driversAPI, walletAPI, BACKEND_BASE_URL } from '../services/api';
import { TruckIcon, CheckCircleIcon, RadioIcon, ActivityIcon, WalletIcon, UserIcon } from '../components/common/Icons';
import { useSearch } from '../hooks/useSearch';
import { useAuth } from '../hooks/useAuth';
import io from 'socket.io-client';

const GiftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>
);

const socket = io(BACKEND_BASE_URL);

export default function DriversPage() {
  const { searchQuery } = useSearch();
  const { user } = useAuth();
  const canUpdate = user?.role === 'admin' || user?.permissions?.drivers?.update === true;

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number | ''>('');
  const [rewardMessage, setRewardMessage] = useState<string>('مبروك لقد حصلت على مكافئه');
  const [submittingReward, setSubmittingReward] = useState<boolean>(false);
  const [actionTab, setActionTab] = useState<'recharge' | 'reward'>('reward');
  const [rechargeAmount, setRechargeAmount] = useState<number | ''>('');
  const [submittingRecharge, setSubmittingRecharge] = useState<boolean>(false);
  const [viewingDriverDetailsId, setViewingDriverDetailsId] = useState<string | null>(null);
  const [driverDetailsData, setDriverDetailsData] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const loadDriverDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const { data } = await driversAPI.getDetails(id);
      setDriverDetailsData(data);
      setSelectedDriver(data.driver);
    } catch (err) {
      alert('فشل تحميل تفاصيل السائق');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadDrivers();

    // الاستماع الفوري لتحديث توفر السائقين
    socket.on('driver_availability_changed', (data: { driverId: string; status: string }) => {
      setDrivers(prev => prev.map(d =>
        d.id === data.driverId
          ? { ...d, availabilityStatus: data.status }
          : d
      ));
    });

    return () => {
      socket.off('driver_availability_changed');
    };
  }, []);

  const loadDrivers = async () => {
    try {
      const { data } = await driversAPI.getAll();
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await driversAPI.updateStatus(id, newStatus);
    loadDrivers();
  };

  const handleReward = async () => {
    if (!selectedDriver || !rewardAmount) return;
    setSubmittingReward(true);
    try {
      const { data } = await walletAPI.rewardDriver(selectedDriver.id, Number(rewardAmount), rewardMessage);
      setSelectedDriver({ ...selectedDriver, walletBalance: data.balance });
      loadDrivers();
      alert('تمت إضافة المكافأة إلى محفظة السائق وإرسال الإشعار بنجاح! 🎉');
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إضافة المكافأة');
    } finally {
      setSubmittingReward(false);
    }
  };

  const handleRecharge = async () => {
    if (!selectedDriver || !rechargeAmount) return;
    const confirmMessage = `هل انت متاكد من شحن محفظة السائق ${selectedDriver.name} بقيمة ${rechargeAmount} د.ع؟`;
    if (!window.confirm(confirmMessage)) return;

    setSubmittingRecharge(true);
    try {
      const defaultMessage = `تم شحن محفظتك بمبلغ ${rechargeAmount} د.ع`;
      const { data } = await walletAPI.rewardDriver(selectedDriver.id, Number(rechargeAmount), defaultMessage);
      setSelectedDriver({ ...selectedDriver, walletBalance: data.balance });
      loadDrivers();
      alert('تم شحن محفظة السائق بنجاح! 🎉');
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل شحن المحفظة');
    } finally {
      setSubmittingRecharge(false);
    }
  };

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    available: drivers.filter(d => d.availabilityStatus === 'available').length,
    onDelivery: drivers.filter(d => d.availabilityStatus === 'on_delivery').length,
  };

  const filteredDrivers = searchQuery.trim()
    ? drivers.filter(d =>
        (d.name || '').includes(searchQuery) ||
        (d.phone || '').includes(searchQuery)
      )
    : drivers;

  const availConfig: Record<string, { label: string; cls: string }> = {
    available: { label: 'متاح', cls: 'badge-success' },
    on_delivery: { label: 'في مهمة', cls: 'badge-warning' },
    offline: { label: 'غير متاح', cls: 'badge-gray' },
  };

  if (viewingDriverDetailsId) {
    if (loadingDetails || !driverDetailsData) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <h3>جاري تحميل تفاصيل السائق...</h3>
        </div>
      );
    }

    const { driver, stats: driverStats, orders: driverOrders, transactions: driverTx } = driverDetailsData;

    return (
      <div>
        {/* Back navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={() => {
                setViewingDriverDetailsId(null);
                setDriverDetailsData(null);
                setSelectedDriver(null);
              }}
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}
            >
              ← العودة للقائمة
            </button>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>تفاصيل السائق: {driver.name}</h2>
            <span className={`badge ${driver.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
              {driver.status === 'active' ? 'نشط' : 'معلق'}
            </span>
          </div>
          
          {canUpdate && (
            <div>
              <button
                type="button"
                className={`btn btn-sm ${driver.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                onClick={async () => {
                  const newStatus = driver.status === 'active' ? 'suspended' : 'active';
                  await driversAPI.updateStatus(driver.id, newStatus);
                  loadDriverDetails(driver.id);
                  loadDrivers();
                }}
              >
                {driver.status === 'active' ? 'تعليق الحساب' : 'تفعيل الحساب'}
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <TruckIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{driverStats.today.count} طلب</h3>
              <p>طلبات اليوم</p>
              <strong style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 16 }}>{driverStats.today.earnings} د.ع</strong>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircleIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{driverStats.week.count} طلب</h3>
              <p>طلبات هذا الأسبوع</p>
              <strong style={{ color: 'var(--success)', fontSize: 16 }}>{driverStats.week.earnings} د.ع</strong>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <RadioIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{driverStats.month.count} طلب</h3>
              <p>طلبات هذا الشهر</p>
              <strong style={{ color: 'var(--warning)', fontSize: 16 }}>{driverStats.month.earnings} د.ع</strong>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info">
              <WalletIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>{driver.walletBalance} د.ع</h3>
              <p>رصيد المحفظة الحالي</p>
              <strong style={{ color: 'var(--primary)', fontSize: 16 }}>إجمالي: {driverStats.allTime.count} طلب</strong>
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 24 }}>
          
          {/* Right column: Wallet management & Details info */}
          <div className="card">
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>إدارة رصيد المحفظة</h3>
            
            {/* Tab selection */}
            <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setActionTab('reward')}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: 14,
                  border: 'none',
                  background: 'none',
                  color: actionTab === 'reward' ? '#4f46e5' : '#64748b',
                  borderBottom: actionTab === 'reward' ? '2px solid #4f46e5' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <GiftIcon />
                <span>منح مكافأة</span>
              </button>
              <button
                type="button"
                onClick={() => setActionTab('recharge')}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: 14,
                  border: 'none',
                  background: 'none',
                  color: actionTab === 'recharge' ? '#4f46e5' : '#64748b',
                  borderBottom: actionTab === 'recharge' ? '2px solid #4f46e5' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <WalletIcon size={20} />
                <span>شحن المحفظة</span>
              </button>
            </div>

            {actionTab === 'reward' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>قيمة المكافأة (د.ع)</label>
                  <input
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      fontSize: 14,
                      fontWeight: 'bold'
                    }}
                    placeholder="مثال: 5000"
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>نص إشعار المكافأة للمستلم</label>
                  <input
                    type="text"
                    value={rewardMessage}
                    onChange={(e) => setRewardMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      fontSize: 13
                    }}
                    placeholder="اكتب رسالة الإشعار هنا..."
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={async () => {
                    await handleReward();
                    loadDriverDetails(driver.id);
                  }}
                  disabled={submittingReward || !rewardAmount || rewardAmount <= 0}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    fontWeight: 'bold',
                    fontSize: 14,
                    marginTop: 8,
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    cursor: (!rewardAmount || rewardAmount <= 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingReward ? 'جاري منح المكافأة...' : `منح مكافأة ${rewardAmount ? `بقيمة ${rewardAmount} د.ع` : ''}`}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>قيمة الشحن (د.ع)</label>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      fontSize: 14,
                      fontWeight: 'bold'
                    }}
                    placeholder="مثال: 10000"
                  />
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await handleRecharge();
                    loadDriverDetails(driver.id);
                  }}
                  disabled={submittingRecharge || !rechargeAmount || rechargeAmount <= 0}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    fontWeight: 'bold',
                    fontSize: 14,
                    marginTop: 8,
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    cursor: (!rechargeAmount || rechargeAmount <= 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingRecharge ? 'جاري شحن الرصيد...' : `شحن المحفظة ${rechargeAmount ? `بقيمة ${rechargeAmount} د.ع` : ''}`}
                </button>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 12px 0' }}>معلومات السائق الفنية</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div><strong>الهاتف:</strong> {driver.phone}</div>
                <div><strong>حالة التوفر:</strong> {availConfig[driver.availabilityStatus]?.label || driver.availabilityStatus}</div>
                <div><strong>تاريخ الانضمام:</strong> {new Date(driver.createdAt).toLocaleDateString('ar-IQ')}</div>
              </div>
            </div>
          </div>

          {/* Left column: Driver's recent orders & transactions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>الطلبات الأخيرة</h3>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>المطعم</th>
                    <th>القيمة</th>
                    <th>التوصيل</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {driverOrders.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>لا توجد طلبات بعد</td></tr>
                  ) : (
                    driverOrders.map((o: any) => (
                      <tr key={o.id}>
                        <td>#{o.orderNumber || 'غير محدد'}</td>
                        <td>{o.restaurant?.name || 'غير معروف'}</td>
                        <td>{o.orderValue} د.ع</td>
                        <td>{o.deliveryPrice} د.ع</td>
                        <td>
                          <span className={`badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                            {o.status === 'delivered' ? 'تم التوصيل' : o.status === 'cancelled' ? 'ملغي' : 'قيد التوصيل'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>الحركات المالية الأخيرة</h3>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>نوع الحركة</th>
                    <th>المبلغ</th>
                    <th>الرصيد بعد الحركة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {driverTx.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>لا توجد عمليات سابقة</td></tr>
                  ) : (
                    driverTx.map((t: any) => (
                      <tr key={t.id}>
                        <td>
                          <span style={{ color: t.type === 'recharge' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                            {t.type === 'recharge' ? 'شحن / مكافأة' : 'استقطاع طلب'}
                          </span>
                        </td>
                        <td>{t.amount} د.ع</td>
                        <td>{t.balanceAfter} د.ع</td>
                        <td>{new Date(t.createdAt).toLocaleString('ar-IQ')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>السائقون</h1>
        <button className="btn btn-ghost btn-sm" onClick={loadDrivers}>🔄 تحديث</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <TruckIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.total}</h3><p>إجمالي السائقين</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.active}</h3><p>نشطون</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">
            <RadioIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.available}</h3><p>متاحون</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <ActivityIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.onDelivery}</h3><p>في مهمة</p></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الرصيد</th>
              <th>الحالة</th>
              <th>التوفر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : drivers.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ color: 'var(--primary)' }}>
                    <UserIcon size={48} />
                  </div>
                  <div className="empty-state-text">لا يوجد سائقون بعد</div>
                </div>
              </td></tr>
            ) : (
              filteredDrivers.map(driver => (
                <tr 
                  key={driver.id} 
                  style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onClick={() => {
                    setViewingDriverDetailsId(driver.id);
                    loadDriverDetails(driver.id);
                    setRewardAmount('');
                    setRewardMessage('مبروك لقد حصلت على مكافئه');
                    setActionTab('reward');
                    setRechargeAmount('');
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                >
                  <td><strong style={{ color: '#1d4ed8', textDecoration: 'underline' }}>{driver.name}</strong></td>
                  <td><span style={{ direction: 'ltr', display: 'inline-block' }}>{driver.phone}</span></td>
                  <td><strong>{driver.walletBalance}</strong> د.ع</td>
                  <td>
                    <span className={`badge ${driver.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {driver.status === 'active' ? 'نشط' : 'معلق'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${availConfig[driver.availabilityStatus]?.cls || 'badge-gray'}`}>
                      {availConfig[driver.availabilityStatus]?.label || driver.availabilityStatus}
                    </span>
                  </td>
                  <td>
                    {canUpdate && (
                      <button
                        className={`btn btn-sm ${driver.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(driver.id, driver.status);
                        }}
                      >
                        {driver.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

