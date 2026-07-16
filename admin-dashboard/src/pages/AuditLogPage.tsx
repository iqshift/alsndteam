import React, { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { ClipboardIcon } from '../components/common/Icons';
import { useSearch } from '../hooks/useSearch';

export default function AuditLogPage() {
  const { searchQuery } = useSearch();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (action) params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await auditAPI.getAll(params);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = searchQuery.trim()
    ? logs.filter(l =>
        (l.action || '').includes(searchQuery) ||
        (l.description || '').includes(searchQuery) ||
        (l.user?.name || '').includes(searchQuery)
      )
    : logs;

  return (
    <div>
      <div className="page-header">
        <h1>سجل التدقيق</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الإجراء</label>
            <select className="form-input" value={action} onChange={e => setAction(e.target.value)}>
              <option value="">الكل</option>
              <option value="zone.create">إنشاء منطقة</option>
              <option value="restaurant.create">إنشاء مطعم</option>
              <option value="order.create">إنشاء طلب</option>
              <option value="wallet.recharge">شحن محفظة</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">من تاريخ</label>
            <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">إلى تاريخ</label>
            <input className="form-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadLogs} disabled={loading}>بحث</button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الإجراء</th>
              <th>الوصف</th>
              <th>المستخدم</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <ClipboardIcon size={48} />
                  </div>
                  <div className="empty-state-text">لا توجد سجلات</div>
                </div>
              </td></tr>
            ) : (
              filteredLogs.map((log, i) => (
                <tr key={log.id || i}>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(log.createdAt || log.timestamp).toLocaleString('ar-IQ')}</td>
                  <td><code style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 12 }}>{log.action}</code></td>
                  <td style={{ maxWidth: 300 }}>{log.description || log.details || '-'}</td>
                  <td>{log.actorName || log.actor?.name || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
