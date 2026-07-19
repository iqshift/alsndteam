import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI } from '../services/api';
import { UsersIcon, CheckCircleIcon, XCircleIcon, TicketIcon } from '../components/common/Icons';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    try {
      const { data } = await employeesAPI.getAll();
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await employeesAPI.create(form);
      setForm({ name: '', phone: '', password: '' });
      setShowCreate(false);
      loadEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إنشاء الوكيل');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await employeesAPI.updateStatus(id, newStatus);
      loadEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تحديث الحالة');
    }
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    suspended: employees.filter(e => e.status === 'suspended').length,
    todayCodes: employees.reduce((sum, e) => sum + (e.todayCodes || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <h1>وكلاء الشحن</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ إضافة وكيل شحن</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><UsersIcon size={24} /></div>
          <div className="stat-info"><h3>{stats.total}</h3><p>إجمالي الوكلاء</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircleIcon size={24} /></div>
          <div className="stat-info"><h3>{stats.active}</h3><p>نشط</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><XCircleIcon size={24} /></div>
          <div className="stat-info"><h3>{stats.suspended}</h3><p>معلق</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><TicketIcon size={24} /></div>
          <div className="stat-info"><h3>{stats.todayCodes}</h3><p>بطاقات اليوم</p></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>رقم الهاتف</th>
              <th>الحالة</th>
              <th>بطاقات اليوم</th>
              <th>إجمالي البطاقات</th>
              <th>تاريخ الإنشاء</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="empty-state-icon"><UsersIcon size={48} /></div>
                  <div className="empty-state-text">لا يوجد وكلاء شحن بعد</div>
                </div>
              </td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <button
                      style={{
                        background: 'none', border: 'none', color: 'var(--primary)',
                        fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline',
                        padding: 0, fontFamily: 'Cairo', fontSize: 13,
                      }}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      {emp.name}
                    </button>
                  </td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{emp.phone}</td>
                  <td>
                    <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {emp.status === 'active' ? 'نشط' : 'معلق'}
                    </span>
                  </td>
                  <td><strong>{emp.todayCodes || 0}</strong></td>
                  <td>{emp.totalCodes || 0}</td>
                  <td>{new Date(emp.createdAt).toLocaleDateString('ar-IQ')}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${emp.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleStatus(emp.id, emp.status)}
                      style={{ fontSize: 11, padding: '4px 12px' }}
                    >
                      {emp.status === 'active' ? 'تعليق' : 'تفعيل'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-title">إضافة وكيل شحن جديد</div>
            <div className="modal-subtitle">أدخل بيانات الوكيل لإنشاء حسابه على جهاز POS</div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">اسم الوكيل</label>
                <input className="form-input" type="text" placeholder="مثال: أحمد محمد" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-input" type="text" placeholder="مثال: 07801234567" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required style={{ direction: 'ltr', textAlign: 'right' }} />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور</label>
                <input className="form-input" type="password" placeholder="كلمة مرور قوية" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'جاري الإنشاء...' : 'إنشاء حساب الوكيل'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>إغلاق</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
