import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesAPI } from '../services/api';
import { UsersIcon, TicketIcon, CheckCircleIcon, XCircleIcon, UserIcon } from '../components/common/Icons';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEmployeeDetails();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadEmployeeReport();
    }
  }, [id, period]);

  const loadEmployeeDetails = async () => {
    try {
      const { data } = await employeesAPI.getById(id!);
      setEmployee(data);
    } catch {
      alert('فشل تحميل تفاصيل الوكيل');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeReport = async () => {
    setReportLoading(true);
    try {
      const { data } = await employeesAPI.getReport(id!, period);
      setReport(data);
    } catch {
      alert('فشل تحميل تقرير الوكيل');
    } finally {
      setReportLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!employee) return;
    const newStatus = employee.status === 'active' ? 'suspended' : 'active';
    try {
      await employeesAPI.updateStatus(employee.id, newStatus);
      setEmployee({ ...employee, status: newStatus });
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تحديث الحالة');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontFamily: 'Cairo' }}>جاري التحميل...</div>;
  }

  if (!employee) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#ef4444', fontFamily: 'Cairo' }}>الوكيل غير موجود</div>;
  }

  const stats = report?.stats || {
    totalCodes: 0,
    totalValue: 0,
    usedCodes: 0,
    availableCodes: 0,
  };

  return (
    <div style={{ fontFamily: 'Cairo', direction: 'rtl', textAlign: 'right' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <button 
            className="btn btn-ghost" 
            style={{ marginBottom: 12, padding: '4px 8px', fontSize: 13 }}
            onClick={() => navigate('/employees')}
          >
            ← العودة لوكلاء الشحن
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <UserIcon size={32} style={{ color: 'var(--primary)' }} />
            <span>{employee.name}</span>
          </h1>
        </div>
        <button 
          className={`btn ${employee.status === 'active' ? 'btn-danger' : 'btn-success'}`}
          onClick={toggleStatus}
        >
          {employee.status === 'active' ? 'تعليق حساب الوكيل' : 'تفعيل حساب الوكيل'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>البيانات الأساسية</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>رقم الهاتف</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', direction: 'ltr', textAlign: 'right' }}>{employee.phone}</p>
          </div>
          <div>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>الحالة</span>
            <p style={{ margin: '4px 0 0 0' }}>
              <span className={`badge ${employee.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                {employee.status === 'active' ? 'نشط' : 'معلق'}
              </span>
            </p>
          </div>
          <div>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>تاريخ الانضمام</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>{new Date(employee.createdAt).toLocaleDateString('ar-IQ')}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>تقرير النشاط والمبيعات</h2>
        <div style={{ display: 'flex', gap: 8, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                border: 'none',
                background: period === p ? 'var(--primary)' : 'transparent',
                color: period === p ? 'white' : '#4b5563',
                padding: '6px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'Cairo',
                fontWeight: 600,
                fontSize: 12,
                transition: 'all 0.2s',
              }}
            >
              {p === 'daily' ? 'اليوم' : p === 'weekly' ? 'هذا الأسبوع' : 'هذا الشهر'}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon primary"><TicketIcon size={24} /></div>
          <div className="stat-info">
            <h3>{stats.totalCodes}</h3>
            <p>إجمالي البطاقات المنشأة</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><TicketIcon size={24} /></div>
          <div className="stat-info">
            <h3>{(stats.totalValue || 0).toLocaleString()} <span style={{ fontSize: 12 }}>د.ع</span></h3>
            <p>إجمالي المبيعات (القيمة)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircleIcon size={24} /></div>
          <div className="stat-info">
            <h3>{stats.usedCodes}</h3>
            <p>البطاقات المستخدمة</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><XCircleIcon size={24} /></div>
          <div className="stat-info">
            <h3>{stats.availableCodes}</h3>
            <p>البطاقات المتاحة (لم تشحن بعد)</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ padding: 20, borderBottom: '1px solid #f3f4f6', margin: 0 }}>تفاصيل الأكواد المنشأة</h3>
        <div className="table-container" style={{ borderRadius: 0, boxShadow: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>القيمة</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>تاريخ الاستخدام</th>
              </tr>
            </thead>
            <tbody>
              {reportLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري تحميل التقرير...</td></tr>
              ) : !report?.codes || report.codes.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><TicketIcon size={48} /></div>
                    <div className="empty-state-text">لا توجد بطاقات منشأة في هذه الفترة</div>
                  </div>
                </td></tr>
              ) : (
                report.codes.map((code: any) => (
                  <tr key={code.id}>
                    <td>
                      <code style={{ padding: '3px 10px', background: '#f3f4f6', borderRadius: 6, fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>
                        {code.code}
                      </code>
                    </td>
                    <td><strong>{parseFloat(code.value).toLocaleString()}</strong> د.ع</td>
                    <td>
                      <span className={`badge ${code.isUsed ? 'badge-danger' : 'badge-success'}`}>
                        {code.isUsed ? 'مستخدمة' : 'متاحة'}
                      </span>
                    </td>
                    <td>{new Date(code.createdAt).toLocaleString('ar-IQ')}</td>
                    <td>{code.usedAt ? new Date(code.usedAt).toLocaleString('ar-IQ') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
