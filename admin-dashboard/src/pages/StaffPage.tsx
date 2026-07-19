import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';
import { UsersIcon, TrashIcon, EditIcon, CheckCircleIcon, XCircleIcon } from '../components/common/Icons';

const RESOURCES = [
  { id: 'orders', name: 'الطلبات' },
  { id: 'drivers', name: 'السائقون' },
  { id: 'restaurants', name: 'المطاعم' },
  { id: 'zones', name: 'المناطق' },
  { id: 'settings', name: 'الإعدادات' },
  { id: 'support', name: 'الدعم' }
];

const DEFAULT_PERMISSIONS = {
  orders: { read: false, create: false, update: false, delete: false },
  drivers: { read: false, create: false, update: false, delete: false },
  restaurants: { read: false, create: false, update: false, delete: false },
  zones: { read: false, create: false, update: false, delete: false },
  settings: { read: false, create: false, update: false, delete: false },
  support: { read: false, create: false, update: false, delete: false }
};

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<any>(DEFAULT_PERMISSIONS);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const { data } = await staffAPI.getAll();
      setStaffList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPassword('');
    setPermissions(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    setShowModal(true);
  };

  const handleOpenEdit = (staff: any) => {
    setEditingId(staff.id);
    setName(staff.name);
    setPhone(staff.phone);
    setPassword(''); // leave blank for no change
    
    // Merge existing permissions with defaults in case of new resources
    const mergedPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    if (staff.permissions) {
      Object.keys(staff.permissions).forEach(res => {
        if (mergedPerms[res]) {
          mergedPerms[res] = { ...mergedPerms[res], ...staff.permissions[res] };
        }
      });
    }
    setPermissions(mergedPerms);
    setShowModal(true);
  };

  const handlePermissionChange = (resourceId: string, action: 'read' | 'create' | 'update' | 'delete', checked: boolean) => {
    setPermissions((prev: any) => {
      const next = { ...prev };
      next[resourceId] = {
        ...next[resourceId],
        [action]: checked
      };
      
      // If setting read to false, also clear create, update, delete
      if (action === 'read' && !checked) {
        next[resourceId].create = false;
        next[resourceId].update = false;
        next[resourceId].delete = false;
      }
      
      // If setting create, update, or delete to true, automatically set read to true
      if ((action === 'create' || action === 'update' || action === 'delete') && checked) {
        next[resourceId].read = true;
      }

      return next;
    });
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المساعد "${staffName}" نهائياً؟`)) {
      return;
    }

    try {
      await staffAPI.delete(id);
      loadStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف المساعد');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!editingId && !password) {
      alert('يرجى تعيين كلمة مرور للحساب الجديد');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name,
        phone,
        permissions
      };
      if (password) {
        payload.password = password;
      }

      if (editingId) {
        await staffAPI.update(editingId, payload);
      } else {
        await staffAPI.create(payload);
      }

      setShowModal(false);
      loadStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <UsersIcon size={32} style={{ color: 'var(--primary)' }} />
            <span>الموظفون والمساعدون</span>
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: 13 }}>إنشاء وإدارة حسابات موظفي لوحة التحكم والمشرفين المساعدين وتعيين صلاحياتهم بدقة.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>+ إضافة مساعد جديد</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>رقم الهاتف</th>
              <th>الأقسام المرخصة</th>
              <th>تاريخ الإنشاء</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : staffList.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon"><UsersIcon size={48} /></div>
                  <div className="empty-state-text">لا يوجد مساعدون بعد. قم بإضافة أول مساعد بالضغط على الزر أعلاه!</div>
                </div>
              </td></tr>
            ) : (
              staffList.map((staff: any) => {
                // Get list of permitted resources for display
                const activePerms = RESOURCES.filter(res => staff.permissions?.[res.id]?.read === true).map(res => res.name);
                return (
                  <tr key={staff.id}>
                    <td><strong>{staff.name}</strong></td>
                    <td style={{ direction: 'ltr', textAlign: 'right' }}>{staff.phone}</td>
                    <td>
                      {activePerms.length === 0 ? (
                        <span className="badge badge-danger">بلا صلاحيات (مقفل)</span>
                      ) : activePerms.length === RESOURCES.length ? (
                        <span className="badge badge-success">كامل الصلاحيات</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {activePerms.map(name => (
                            <span key={name} className="badge badge-info" style={{ background: 'rgba(92,115,255,0.1)', color: 'var(--primary)' }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{new Date(staff.createdAt).toLocaleDateString('ar-IQ')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleOpenEdit(staff)}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <EditIcon size={14} /> تعديل الصلاحيات
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(staff.id, staff.name)}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                        >
                          <TrashIcon size={14} /> حذف
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 650, borderRadius: 24, padding: 32 }}>
            <div className="modal-title" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
              {editingId ? `تعديل صلاحيات المساعد: ${name}` : 'إضافة موظف مساعد جديد'}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>اسم المساعد</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="مثال: أحمد محمد"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>رقم الهاتف (اسم المستخدم)</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="مثال: 07701234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {editingId ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التعديل)' : 'كلمة المرور'}
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="أدخل كلمة مرور قوية (6 رموز كحد أدنى)..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required={!editingId}
                  minLength={6}
                />
              </div>

              {/* لوحة تحديد الصلاحيات */}
              <div style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)', marginBottom: 12, borderBottom: '2px solid rgba(92,115,255,0.1)', paddingBottom: 6 }}>
                  جدول تعيين صلاحيات المساعد:
                </label>
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>القسم / المورد</th>
                        <th style={{ padding: 12 }}>رؤية واطلاع</th>
                        <th style={{ padding: 12 }}>إضافة (+)</th>
                        <th style={{ padding: 12 }}>تعديل (✎)</th>
                        <th style={{ padding: 12 }}>حذف (🗑)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESOURCES.map(res => {
                        const perm = permissions[res.id] || { read: false, create: false, update: false, delete: false };
                        return (
                          <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>{res.name}</td>
                            <td style={{ padding: 12 }}>
                              <input
                                type="checkbox"
                                checked={perm.read}
                                onChange={e => handlePermissionChange(res.id, 'read', e.target.checked)}
                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: 12 }}>
                              <input
                                type="checkbox"
                                checked={perm.create}
                                onChange={e => handlePermissionChange(res.id, 'create', e.target.checked)}
                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: 12 }}>
                              <input
                                type="checkbox"
                                checked={perm.update}
                                onChange={e => handlePermissionChange(res.id, 'update', e.target.checked)}
                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: 12 }}>
                              <input
                                type="checkbox"
                                checked={perm.delete}
                                onChange={e => handlePermissionChange(res.id, 'delete', e.target.checked)}
                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 14 }} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : editingId ? 'تعديل وحفظ الصلاحيات' : 'إنشاء حساب المساعد'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={() => setShowModal(false)}>إلغلاق</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
