import React, { useState } from 'react';
import { reportsAPI } from '../services/api';
import { PackageIcon, CheckCircleIcon, WalletIcon, XCircleIcon, ChartIcon } from '../components/common/Icons';

export default function ReportsPage() {
  const [from, setFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any>(null);
  const [driversReport, setDriversReport] = useState<any[]>([]);
  const [zonesReport, setZonesReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [s, d, z] = await Promise.all([
        reportsAPI.getSummary({ from, to }).catch(() => ({ data: null })),
        reportsAPI.getDrivers({ from, to }).catch(() => ({ data: [] })),
        reportsAPI.getZones({ from, to }).catch(() => ({ data: [] })),
      ]);
      setSummary(s.data);
      setDriversReport(d.data || []);
      setZonesReport(z.data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>التقارير</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">من تاريخ</label>
            <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">إلى تاريخ</label>
            <input className="form-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadReports} disabled={loading}>
            {loading ? 'جاري...' : 'عرض التقرير'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <PackageIcon size={24} />
            </div>
            <div className="stat-info"><h3>{summary.totalOrders || 0}</h3><p>إجمالي الطلبات</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircleIcon size={24} />
            </div>
            <div className="stat-info"><h3>{summary.deliveredOrders || 0}</h3><p>تم التوصيل</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <WalletIcon size={24} />
            </div>
            <div className="stat-info"><h3>{summary.totalRevenue || 0}</h3><p>الإيرادات د.ع</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <XCircleIcon size={24} />
            </div>
            <div className="stat-info"><h3>{summary.cancelledOrders || 0}</h3><p>ملغية</p></div>
          </div>
        </div>
      )}

      {driversReport.length > 0 && (
        <div className="table-container" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <span className="card-title">أداء السائقين</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>السائق</th>
                <th>الطلبات</th>
                <th>تم التوصيل</th>
                <th>الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {driversReport.map((d: any, i: number) => (
                <tr key={i}>
                  <td><strong>{d.driverName || d.name || '-'}</strong></td>
                  <td>{d.totalOrders || 0}</td>
                  <td>{d.deliveredOrders || 0}</td>
                  <td>{d.totalRevenue || 0} د.ع</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {zonesReport.length > 0 && (
        <div className="table-container">
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <span className="card-title">تقرير المناطق</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>المنطقة</th>
                <th>الطلبات</th>
                <th>الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {zonesReport.map((z: any, i: number) => (
                <tr key={i}>
                  <td><strong>{z.zoneName || z.name || '-'}</strong></td>
                  <td>{z.totalOrders || 0}</td>
                  <td>{z.totalRevenue || 0} د.ع</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!summary && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ChartIcon size={48} />
          </div>
          <div className="empty-state-text">اختر التاريخ واضغط عرض التقرير</div>
        </div>
      )}
    </div>
  );
}
