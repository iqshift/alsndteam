import React, { useState, useEffect } from 'react';
import { walletAPI } from '../services/api';
import { TicketIcon, CheckCircleIcon, XCircleIcon, WalletIcon, UserIcon } from '../components/common/Icons';

export default function WalletPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  useEffect(() => { loadCodes(); }, []);

  const loadCodes = async () => {
    try {
      const { data } = await walletAPI.getAllCodes();
      setCodes(data);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await walletAPI.generateCodes(parseFloat(codeValue), 1);
      setGeneratedCode(data.codes[0]);
      setCodeValue('');
      loadCodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل التوليد');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: codes.length,
    used: codes.filter(c => c.isUsed).length,
    available: codes.filter(c => !c.isUsed).length,
    totalValue: codes.reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <h1>أكواد الشحن</h1>
        <button className="btn btn-primary" onClick={() => { setShowGenerate(true); setGeneratedCode(''); }}>+ توليد كود</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <TicketIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.total}</h3><p>إجمالي الأكواد</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.available}</h3><p>متاحة</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">
            <XCircleIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.used}</h3><p>مستخدمة</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <WalletIcon size={24} />
          </div>
          <div className="stat-info"><h3>{stats.totalValue.toLocaleString()}</h3><p>إجمالي القيمة د.ع</p></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>القيمة</th>
              <th>الحالة</th>
              <th>المنشئ</th>
              <th>من استخدمه</th>
              <th>تاريخ الاستخدام</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <TicketIcon size={48} />
                  </div>
                  <div className="empty-state-text">لا توجد أكواد بعد</div>
                </div>
              </td></tr>
            ) : (
              codes.map(code => (
                <tr key={code.id}>
                  <td><code style={{ padding: '3px 10px', background: '#f3f4f6', borderRadius: 6, fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>{code.code}</code></td>
                  <td><strong>{parseFloat(code.value).toLocaleString()}</strong> د.ع</td>
                  <td><span className={`badge ${code.isUsed ? 'badge-danger' : 'badge-success'}`}>{code.isUsed ? 'مستخدم' : 'متاح'}</span></td>
                  <td>
                    {code.createdByEmployee ? (
                      <span style={{ fontWeight: 600, color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <UserIcon size={12} />
                        <span>{code.createdByEmployee.name} (POS)</span>
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>🏢 الإدارة</span>
                    )}
                  </td>
                  <td>
                    {code.walletTransactions?.[0]?.driver ? (
                      <button
                        className="btn-link"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          fontFamily: 'Cairo',
                          fontSize: 13,
                        }}
                        onClick={() => setSelectedDriver(code.walletTransactions[0].driver)}
                      >
                        {code.walletTransactions[0].driver.name}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{code.usedAt ? new Date(code.usedAt).toLocaleString('ar-IQ') : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showGenerate && (
        <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-title">توليد كود شحن جديد</div>
            <div className="modal-subtitle">أدخل قيمة الكود بالدينار العراقي</div>

            {generatedCode && (
              <div style={{ marginBottom: 20, padding: 16, background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#059669', marginBottom: 8, fontWeight: 600 }}>تم إنشاء الكود بنجاح</div>
                <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#1f2937', letterSpacing: 2, direction: 'ltr' }}>
                  {generatedCode}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => { navigator.clipboard.writeText(generatedCode); }}
                >
                  📋 نسخ الكود
                </button>
              </div>
            )}

            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label className="form-label">قيمة الكود (د.ع)</label>
                <input
                  className="form-input"
                  type="number"
                  min="1000"
                  step="500"
                  placeholder="مثال: 5000"
                  value={codeValue}
                  onChange={e => setCodeValue(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'جاري التوليد...' : 'توليد كود'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowGenerate(false)}>إغلاق</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400, direction: 'rtl', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>تفاصيل السائق</div>
              <button 
                onClick={() => setSelectedDriver(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              {selectedDriver.photo ? (
                <img
                  src={`http://localhost:3000${selectedDriver.photo}`}
                  alt={selectedDriver.name}
                  style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', marginBottom: 12 }}
                />
              ) : (
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <UserIcon size={32} style={{ color: 'var(--primary)' }} />
                </div>
              )}
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontWeight: 800, fontSize: 16 }}>{selectedDriver.name}</h3>
              <span className={`badge ${selectedDriver.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                {selectedDriver.status === 'active' ? 'نشط' : 'معلق'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>رقم الهاتف</span>
                <strong style={{ direction: 'ltr', fontSize: 13 }}>{selectedDriver.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>رصيد المحفظة</span>
                <strong style={{ color: 'var(--primary)', fontSize: 13 }}>{parseFloat(selectedDriver.walletBalance).toLocaleString()} د.ع</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => setSelectedDriver(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
