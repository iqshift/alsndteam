import React, { useState, useEffect, useMemo } from 'react';
import { reportsAPI } from '../services/api';
import {
  DollarSignIcon,
  WalletIcon,
  StoreIcon,
  TruckIcon,
  ClockIcon,
  PrinterIcon,
  UserIcon,
  MapPinIcon,
  TicketIcon,
  SearchIcon,
  FileTextIcon,
} from '../components/common/Icons';

interface SummaryData {
  totalRevenue: number;
  rechargeCodesRevenue: number;
  restaurantCommissions: number;
  driverDeductions: number;
  totalRechargeCodesCount: number;
  usedRechargeCodesCount: number;
  totalDeliveredOrdersCount: number;
}

interface RechargeLog {
  id: string;
  type: 'recharge_code';
  amount: number;
  code: string;
  isUsed: boolean;
  createdByEmployee: { id: string; name: string };
  usedByDriver: { id: string; name: string; phone: string } | null;
  createdAt: string;
  usedAt: string | null;
}

interface OrderLog {
  id: string;
  type: 'order' | 'driver_deduction';
  orderNumber: number | null;
  driver: { id: string; name: string; phone: string } | null;
  restaurantName: string;
  zoneName: string;
  restaurantCommission: number;
  driverDeduction: number;
  totalOrderRevenue: number;
  createdAt: string;
}

export default function PlatformRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData>({
    totalRevenue: 0,
    rechargeCodesRevenue: 0,
    restaurantCommissions: 0,
    driverDeductions: 0,
    totalRechargeCodesCount: 0,
    usedRechargeCodesCount: 0,
    totalDeliveredOrdersCount: 0,
  });

  const [rechargeLogs, setRechargeLogs] = useState<RechargeLog[]>([]);
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Active Card Filter ('all' | 'recharge' | 'restaurant' | 'driver')
  const [activeCard, setActiveCard] = useState<'all' | 'recharge' | 'restaurant' | 'driver'>('all');

  useEffect(() => {
    loadRevenueData();
  }, [dateRange, fromDate, toDate]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      let params: { from?: string; to?: string } = {};

      if (dateRange === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        params = { from: todayStr, to: todayStr };
      } else if (dateRange === 'week') {
        const now = new Date();
        const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        params = { from: weekAgo, to: todayStr };
      } else if (dateRange === 'month') {
        const now = new Date();
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        params = { from: monthAgo, to: todayStr };
      } else if (dateRange === 'custom' && fromDate && toDate) {
        params = { from: fromDate, to: toDate };
      }

      const { data } = await reportsAPI.getPlatformRevenue(params);
      if (data && data.summary) {
        setSummary(data.summary);
        setRechargeLogs(data.rechargeLogs || []);
        setOrderLogs(data.orderLogs || []);
      }
    } catch (err) {
      console.error('Failed to load platform revenue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered Logs dynamically shown below the cards
  const filteredLogs = useMemo(() => {
    let list: Array<(RechargeLog | OrderLog) & { sortDate: Date }> = [];

    if (activeCard === 'all' || activeCard === 'recharge') {
      rechargeLogs.forEach((r) => {
        list.push({ ...r, sortDate: new Date(r.createdAt) });
      });
    }

    if (activeCard === 'all') {
      orderLogs.forEach((o) => {
        list.push({ ...o, sortDate: new Date(o.createdAt) });
      });
    } else if (activeCard === 'restaurant') {
      orderLogs
        .filter(o => o.restaurantCommission > 0 || o.type === 'order')
        .forEach((o) => {
          list.push({ ...o, sortDate: new Date(o.createdAt) });
        });
    } else if (activeCard === 'driver') {
      orderLogs
        .filter(o => o.driverDeduction > 0 || o.type === 'driver_deduction')
        .forEach((o) => {
          list.push({ ...o, sortDate: new Date(o.createdAt) });
        });
    }

    list.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        if (item.type === 'recharge_code') {
          return (
            item.code.toLowerCase().includes(q) ||
            item.createdByEmployee?.name?.toLowerCase().includes(q) ||
            item.usedByDriver?.name?.toLowerCase().includes(q) ||
            item.usedByDriver?.phone?.includes(q) ||
            item.amount.toString().includes(q)
          );
        } else {
          return (
            (item.orderNumber && item.orderNumber.toString().includes(q)) ||
            item.driver?.name?.toLowerCase().includes(q) ||
            item.driver?.phone?.includes(q) ||
            item.restaurantName?.toLowerCase().includes(q) ||
            item.zoneName?.toLowerCase().includes(q) ||
            item.driverDeduction?.toString().includes(q) ||
            item.restaurantCommission?.toString().includes(q)
          );
        }
      });
    }

    return list;
  }, [activeCard, rechargeLogs, orderLogs, searchQuery]);

  return (
    <div className="platform-revenue-page" style={{ paddingBottom: 40 }}>
      {/* ─── Page Header ─── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            أرباح المنصة
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
            سجل مالي دقيق لمبيعات كروت الشحن، عمولات التوصيل للمطاعم، واستقطاعات محفظة السائقين
          </p>
        </div>

        {/* Filter Presets and Print */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handlePrint}
            className="btn btn-ghost"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              height: 40,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <PrinterIcon size={16} />
            <span>طباعة التقرير</span>
          </button>

          {/* Preset Ranges */}
          <div style={{ display: 'flex', background: 'var(--border-light)', padding: 4, borderRadius: 'var(--radius-sm)', gap: 4 }}>
            <button
              className={`btn ${dateRange === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateRange('all')}
              style={{ fontSize: 12.5, height: 32, padding: '0 14px', borderRadius: 'var(--radius-xs)' }}
            >
              الكل
            </button>
            <button
              className={`btn ${dateRange === 'today' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateRange('today')}
              style={{ fontSize: 12.5, height: 32, padding: '0 14px', borderRadius: 'var(--radius-xs)' }}
            >
              اليوم
            </button>
            <button
              className={`btn ${dateRange === 'week' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateRange('week')}
              style={{ fontSize: 12.5, height: 32, padding: '0 14px', borderRadius: 'var(--radius-xs)' }}
            >
              الأسبوع
            </button>
            <button
              className={`btn ${dateRange === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateRange('month')}
              style={{ fontSize: 12.5, height: 32, padding: '0 14px', borderRadius: 'var(--radius-xs)' }}
            >
              الشهر
            </button>
            <button
              className={`btn ${dateRange === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateRange('custom')}
              style={{ fontSize: 12.5, height: 32, padding: '0 14px', borderRadius: 'var(--radius-xs)' }}
            >
              تاريخ مخصص
            </button>
          </div>
        </div>
      </div>

      {/* ─── Custom Date Picker Bar ─── */}
      {dateRange === 'custom' && (
        <div style={{ background: 'var(--bg-card)', padding: '14px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            />
          </div>
          <button onClick={loadRevenueData} className="btn btn-primary" style={{ fontSize: 13, height: 34, padding: '0 16px', borderRadius: 'var(--radius-xs)' }}>
            تطبيق الفلتر
          </button>
        </div>
      )}

      {/* ─── Interactive 4 KPI Cards (Clicking a card switches the view below directly on page) ─── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Total Platform Revenue */}
        <div
          className={`stat-card ${activeCard === 'all' ? 'active-card' : ''}`}
          onClick={() => setActiveCard('all')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            outline: activeCard === 'all' ? '3px solid var(--primary-light)' : 'none',
            outlineOffset: 2,
          }}
        >
          <div className="stat-icon">
            <DollarSignIcon size={24} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: 24, fontWeight: 800, margin: '2px 0' }}>
              {summary.totalRevenue.toLocaleString('en-US')} <span style={{ fontSize: 13, fontWeight: 600 }}>د.ع</span>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>إجمالي أرباح المنصة</p>
              {activeCard === 'all' && (
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>معروض حالياً</span>
              )}
            </div>
          </div>
        </div>

        {/* Recharge Codes Revenue */}
        <div
          className={`stat-card ${activeCard === 'recharge' ? 'active-card' : ''}`}
          onClick={() => setActiveCard('recharge')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            border: activeCard === 'recharge' ? '2px solid var(--info)' : '1px solid var(--border)',
            boxShadow: activeCard === 'recharge' ? '0 0 0 3px var(--info-bg)' : 'none',
          }}
        >
          <div className="stat-icon info">
            <WalletIcon size={24} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
              {summary.rechargeCodesRevenue.toLocaleString('en-US')} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>د.ع</span>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                مبيعات كروت الشحن ({summary.usedRechargeCodesCount} / {summary.totalRechargeCodesCount})
              </p>
              {activeCard === 'recharge' && (
                <span style={{ fontSize: 10, color: 'var(--info)', background: 'var(--info-bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>معروض حالياً</span>
              )}
            </div>
          </div>
        </div>

        {/* Restaurant Delivery Commissions */}
        <div
          className={`stat-card ${activeCard === 'restaurant' ? 'active-card' : ''}`}
          onClick={() => setActiveCard('restaurant')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            border: activeCard === 'restaurant' ? '2px solid var(--warning)' : '1px solid var(--border)',
            boxShadow: activeCard === 'restaurant' ? '0 0 0 3px var(--warning-bg)' : 'none',
          }}
        >
          <div className="stat-icon warning">
            <StoreIcon size={24} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
              {summary.restaurantCommissions.toLocaleString('en-US')} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>د.ع</span>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                عمولات المطاعم ({summary.totalDeliveredOrdersCount} طلب)
              </p>
              {activeCard === 'restaurant' && (
                <span style={{ fontSize: 10, color: 'var(--warning)', background: 'var(--warning-bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>معروض حالياً</span>
              )}
            </div>
          </div>
        </div>

        {/* Driver Wallet Deductions */}
        <div
          className={`stat-card ${activeCard === 'driver' ? 'active-card' : ''}`}
          onClick={() => setActiveCard('driver')}
          style={{
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            border: activeCard === 'driver' ? '2px solid var(--success)' : '1px solid var(--border)',
            boxShadow: activeCard === 'driver' ? '0 0 0 3px var(--success-bg)' : 'none',
          }}
        >
          <div className="stat-icon success">
            <TruckIcon size={24} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
              {summary.driverDeductions.toLocaleString('en-US')} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>د.ع</span>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                استقطاعات محفظة السائقين
              </p>
              {activeCard === 'driver' && (
                <span style={{ fontSize: 10, color: 'var(--success)', background: 'var(--success-bg)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>معروض حالياً</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Dynamic Section Header (Renders Below Cards) ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {activeCard === 'all' && `السجل العام لكافة العمليات (${filteredLogs.length})`}
            {activeCard === 'recharge' && `تفاصيل مبيعات واستخدام كروت الشحن (${filteredLogs.length})`}
            {activeCard === 'restaurant' && `تفاصيل عمولات التوصيل للمطاعم (${filteredLogs.length})`}
            {activeCard === 'driver' && `تفاصيل استقطاعات محفظة السائقين (${filteredLogs.length})`}
          </h2>

          {activeCard !== 'all' && (
            <button
              onClick={() => setActiveCard('all')}
              className="btn btn-ghost"
              style={{ fontSize: 12, height: 28, padding: '0 10px', borderRadius: 'var(--radius-xs)', color: 'var(--primary)', background: 'var(--primary-bg)' }}
            >
              إعادة عرض الكل ↩
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: 320 }}>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            placeholder="بحث عن موظف، كابتن، مطعم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 40px 10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: 13,
              outline: 'none',
              transition: 'all 0.2s',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* ─── Main Data Table (Rendered Directly Below Cards) ─── */}
      <div className="table-container">
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'var(--border-light)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>نوع العملية</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>الجهة المنشئة / المطعم</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>السائق والمنطقة</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>القيمة والعمولات</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 45, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="spinner" style={{ width: 26, height: 26, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>جاري تحميل البيانات...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <FileTextIcon size={40} style={{ opacity: 0.5 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>لا توجد سجلات أرباح مطابقة</span>
                    <span style={{ fontSize: 12 }}>جرب اختيار كارت آخر أو تغيير خيارات البحث والتاريخ</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((item, idx) => {
                const formattedDate = new Date(item.createdAt).toLocaleString('ar-IQ', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                if (item.type === 'recharge_code') {
                  const rechargeItem = item as RechargeLog;

                  return (
                    <tr key={`recharge-${rechargeItem.id}-${idx}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <span className="badge badge-purple" style={{ fontWeight: 700, gap: 6 }}>
                          <TicketIcon size={14} />
                          <span>كرت شحن</span>
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UserIcon size={14} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              المنشئ: {rechargeItem.createdByEmployee?.name || 'الأدمن الرئيسي'}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {rechargeItem.isUsed ? 'تم استخدام الكرت' : 'قيد الانتظار'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        {rechargeItem.usedByDriver ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <TruckIcon size={14} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {rechargeItem.usedByDriver.name}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {rechargeItem.usedByDriver.phone}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-gray" style={{ fontSize: 11 }}>
                            لم يشحن بعد
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>
                          {rechargeItem.amount.toLocaleString('en-US')} د.ع
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ClockIcon size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                } else if (item.type === 'driver_deduction') {
                  const deductionItem = item as OrderLog;

                  return (
                    <tr key={`deduction-${deductionItem.id}-${idx}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <span className="badge badge-info" style={{ fontWeight: 700, gap: 6 }}>
                          <TruckIcon size={14} />
                          <span>استقطاع سائق</span>
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <WalletIcon size={14} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {deductionItem.restaurantName}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              خصم مباشر من محفظة الكابتن
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {deductionItem.driver ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <TruckIcon size={13} style={{ color: 'var(--text-secondary)' }} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {deductionItem.driver.name}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>غير محدد</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPinIcon size={12} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {deductionItem.zoneName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--info)' }}>
                            إجمالي الخصم: {deductionItem.totalOrderRevenue.toLocaleString('en-US')} د.ع
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            مطعم: {deductionItem.restaurantCommission.toLocaleString('en-US')} | سائق: {deductionItem.driverDeduction.toLocaleString('en-US')}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ClockIcon size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  const orderItem = item as OrderLog;

                  return (
                    <tr key={`order-${orderItem.id}-${idx}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <span className="badge badge-success" style={{ fontWeight: 700, gap: 6 }}>
                          <StoreIcon size={14} />
                          <span>طلب توصيل</span>
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <StoreIcon size={14} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                              طلب #{orderItem.orderNumber || orderItem.id.substring(0, 6)}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>
                              {orderItem.restaurantName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {orderItem.driver ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <TruckIcon size={13} style={{ color: 'var(--text-secondary)' }} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {orderItem.driver.name}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>غير محدد</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPinIcon size={12} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {orderItem.zoneName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--success)' }}>
                            إجمالي: {orderItem.totalOrderRevenue.toLocaleString('en-US')} د.ع
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            مطعم: {orderItem.restaurantCommission.toLocaleString('en-US')} | سائق: {orderItem.driverDeduction.toLocaleString('en-US')}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ClockIcon size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        @media print {
          .page-header div:last-child,
          .table-container ~ *,
          input,
          button {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .table-container {
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}