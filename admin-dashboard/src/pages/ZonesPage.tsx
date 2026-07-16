import React, { useState, useEffect, useMemo } from 'react';
import { zonesAPI, settingsAPI } from '../services/api';
import { MapIcon, CheckCircleIcon, MapPinIcon, FolderIcon, EditIcon, TrashIcon, PlusIcon, EyeIcon, EyeOffIcon } from '../components/common/Icons';



export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState<'parent' | 'child' | null>(null);
  const [formData, setFormData] = useState({ name: '', deliveryPrice: '', driverDeduction: '', isGroup: false, parentId: '' });
  const [saving, setSaving] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [defaultDriverDeduction, setDefaultDriverDeduction] = useState(500);

  useEffect(() => {
    loadZones();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      if (data && data.driverDeduction !== undefined) {
        setDefaultDriverDeduction(data.driverDeduction);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadZones = async () => {
    try {
      const { data } = await zonesAPI.getAll();
      setZones(data);
    } finally {
      setLoading(false);
    }
  };

  // توسيع كافة المجموعات تلقائياً عند تحميل البيانات لأول مرة
  useEffect(() => {
    if (zones.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      zones.forEach(z => {
        if (z.isGroup) {
          initialExpanded[z.id] = true;
        }
      });
      setExpandedZones(prev => ({ ...initialExpanded, ...prev }));
    }
  }, [zones]);

  // توسيع المجموعات تلقائياً عند كتابة بحث يطابق عناصر بداخلها
  useEffect(() => {
    if (searchQuery) {
      const toExpand: Record<string, boolean> = {};
      const groups = zones.filter(z => z.isGroup);
      const children = zones.filter(z => !z.isGroup && z.parentId);
      groups.forEach(g => {
        const hasMatchingChild = children.some(c => c.parentId === g.id && c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (hasMatchingChild) {
          toExpand[g.id] = true;
        }
      });
      setExpandedZones(prev => ({ ...prev, ...toExpand }));
    }
  }, [searchQuery, zones]);

  const toggleExpand = (id: string) => {
    setExpandedZones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreateParent = () => {
    setFormData({ name: '', deliveryPrice: '', driverDeduction: '', isGroup: true, parentId: '' });
    setFormType('parent');
  };

  const handleOpenCreateChild = () => {
    setFormData({ name: '', deliveryPrice: '', driverDeduction: defaultDriverDeduction.toString(), isGroup: false, parentId: '' });
    setFormType('child');
  };

  const handleOpenCreateChildForParent = (parentId: string) => {
    setFormData({ name: '', deliveryPrice: '', driverDeduction: defaultDriverDeduction.toString(), isGroup: false, parentId: parentId });
    setFormType('child');
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await zonesAPI.create({
        name: formData.name,
        deliveryPrice: 0,
        driverDeduction: 0,
        isGroup: true,
        parentId: null,
        boundaryGeoJson: null,
      });
      setFormType(null);
      setFormData({ name: '', deliveryPrice: '', driverDeduction: '', isGroup: false, parentId: '' });
      loadZones();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إنشاء المنطقة الرئيسية');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await zonesAPI.create({
        name: formData.name,
        deliveryPrice: parseFloat(formData.deliveryPrice || '0'),
        driverDeduction: parseFloat(formData.driverDeduction || '0'),
        isGroup: false,
        parentId: formData.parentId || null,
        boundaryGeoJson: null,
      });
      setFormType(null);
      setFormData({ name: '', deliveryPrice: '', driverDeduction: '', isGroup: false, parentId: '' });
      loadZones();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل إضافة الحي');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (zone: any) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      deliveryPrice: zone.deliveryPrice ? zone.deliveryPrice.toString() : '0',
      driverDeduction: zone.driverDeduction ? zone.driverDeduction.toString() : '0',
      isGroup: zone.isGroup || false,
      parentId: zone.parentId || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await zonesAPI.update(editingZone.id, {
        name: formData.name,
        deliveryPrice: editingZone.isGroup ? 0 : parseFloat(formData.deliveryPrice || '0'),
        driverDeduction: editingZone.isGroup ? 0 : parseFloat(formData.driverDeduction || '0'),
        isGroup: editingZone.isGroup,
        parentId: editingZone.isGroup ? null : (formData.parentId || null),
      });
      setEditingZone(null);
      setFormData({ name: '', deliveryPrice: '', driverDeduction: '', isGroup: false, parentId: '' });
      loadZones();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تحديث المنطقة');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await zonesAPI.update(id, { isActive: !isActive });
    loadZones();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المنطقة؟ (حذف المنطقة الرئيسية سيؤدي لحذف كل الأحياء التابعة لها تلقائياً)')) return;
    await zonesAPI.delete(id);
    loadZones();
  };

  // هيكلة وتصفية المجموعات والأحياء مع البحث
  const groups = useMemo(() => zones.filter(z => z.isGroup), [zones]);
  const children = useMemo(() => zones.filter(z => !z.isGroup && z.parentId), [zones]);
  const standalones = useMemo(() => zones.filter(z => !z.isGroup && !z.parentId), [zones]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g => {
      const gMatches = g.name.toLowerCase().includes(searchQuery.toLowerCase());
      const cMatches = children.some(c => c.parentId === g.id && c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return gMatches || cMatches;
    });
  }, [groups, children, searchQuery]);

  const filteredStandalones = useMemo(() => {
    if (!searchQuery) return standalones;
    return standalones.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [standalones, searchQuery]);

  const parentGroups = zones.filter(z => z.isGroup && (!editingZone || z.id !== editingZone.id));

  return (
    <div>
      <div className="page-header">
        <h1>المناطق والأحياء</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleOpenCreateParent} style={{ border: '1.5px solid var(--primary)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FolderIcon size={16} />
            <span>إنشاء منطقة رئيسية (قسم)</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreateChild} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MapPinIcon size={16} />
            <span>إضافة حي فرعي / مستقل</span>
          </button>
        </div>
      </div>

      {/* شريط البحث الفوري */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="البحث عن اسم حي أو منطقة رئيسية..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="form-input"
          style={{ paddingRight: 40, width: '100%', height: 44, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'white' }}
        />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <MapIcon size={24} />
          </div>
          <div className="stat-info"><h3>{zones.length}</h3><p>إجمالي المناطق والأحياء</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info"><h3>{zones.filter(z => z.isActive).length}</h3><p>المناطق النشطة</p></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>الاسم</th>
              <th>النوع</th>
              <th>التبعية (القسم)</th>
              <th>سعر التوصيل</th>
              <th>استقطاع السائق</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : filteredGroups.length === 0 && filteredStandalones.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <MapIcon size={48} />
                  </div>
                  <div className="empty-state-text">لا توجد نتائج مطابقة للبحث</div>
                </div>
              </td></tr>
            ) : (
              <>
                {/* 1. المجموعات الرئيسية والأحياء التابعة لها */}
                {filteredGroups.map(group => {
                  const isExpanded = !!expandedZones[group.id];
                  const groupChildren = children.filter(c => c.parentId === group.id && (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())));

                  return (
                    <React.Fragment key={group.id}>
                      {/* صف المجموعة الرئيسية */}
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {groupChildren.length > 0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              style={{
                                transform: isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                cursor: 'pointer',
                                verticalAlign: 'middle'
                              }}
                              onClick={() => toggleExpand(group.id)}
                            >
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                          )}
                        </td>
                        <td onClick={() => toggleExpand(group.id)} style={{ cursor: 'pointer' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>📁 {group.name}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(92, 115, 255, 0.08)', color: 'var(--primary)', fontWeight: 700 }}>منطقة رئيسية (قسم)</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({groupChildren.length} أحياء)</span>
                        </td>
                        <td>—</td>
                        <td>—</td>
                        <td>
                          <span className={`badge ${group.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {group.isActive ? 'مفعلة' : 'معطلة'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="action-btn btn-plus"
                            onClick={() => handleOpenCreateChildForParent(group.id)}
                            title="إضافة حي فرعي لهذا القسم"
                          >
                            <PlusIcon size={16} />
                          </button>
                          <button 
                            className="action-btn btn-edit" 
                            onClick={() => handleEdit(group)}
                            title="تعديل القسم"
                          >
                            <EditIcon size={16} />
                          </button>
                          <button 
                            className={`action-btn ${group.isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'}`} 
                            onClick={() => handleToggleActive(group.id, group.isActive)}
                            title={group.isActive ? "تعطيل القسم" : "تفعيل القسم"}
                          >
                            {group.isActive ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                          </button>
                          <button 
                            className="action-btn btn-delete" 
                            onClick={() => handleDelete(group.id)}
                            title="حذف القسم"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </td>
                      </tr>

                      {/* صفوف الأحياء التابعة (تظهر فقط عند توسيع القسم) */}
                      {isExpanded && groupChildren.map(child => (
                        <tr key={child.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td></td>
                          <td style={{ paddingRight: 36 }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span>┕</span>
                              <MapPinIcon size={14} style={{ color: 'var(--primary)' }} />
                              <span>{child.name}</span>
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', fontSize: 11 }}>حي فرعي</span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <FolderIcon size={14} style={{ color: 'var(--text-muted)' }} />
                              <span>{group.name}</span>
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{child.deliveryPrice} د.ع</td>
                          <td style={{ fontWeight: 600 }}>{child.driverDeduction} د.ع</td>
                          <td>
                            {!group.isActive ? (
                              <span className="badge badge-danger" title="القسم الرئيسي معطل" style={{ opacity: 0.6 }}>معطلة تلقائياً</span>
                            ) : (
                              <span className={`badge ${child.isActive ? 'badge-success' : 'badge-danger'}`}>
                                {child.isActive ? 'مفعلة' : 'معطلة'}
                              </span>
                            )}
                          </td>
                          <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button 
                              className="action-btn btn-edit" 
                              onClick={() => handleEdit(child)}
                              title="تعديل الحي"
                            >
                              <EditIcon size={16} />
                            </button>
                            <button 
                              className={`action-btn ${child.isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'}`} 
                              disabled={!group.isActive}
                              onClick={() => handleToggleActive(child.id, child.isActive)}
                              style={{ opacity: !group.isActive ? 0.5 : 1 }}
                              title={child.isActive ? "تعطيل الحي" : "تفعيل الحي"}
                            >
                              {child.isActive ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                            </button>
                            <button 
                              className="action-btn btn-delete" 
                              onClick={() => handleDelete(child.id)}
                              title="حذف الحي"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* 2. الأحياء المستقلة (لا تتبع لقسم) */}
                {filteredStandalones.length > 0 && (
                  <>
                    <tr style={{ background: '#f1f5f9' }}>
                      <td colSpan={8} style={{ padding: '10px 24px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: 12 }}>
                        🌍 أحياء مستقلة (لا تتبع لأي منطقة رئيسية)
                      </td>
                    </tr>
                    {filteredStandalones.map(standalone => (
                      <tr key={standalone.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td></td>
                        <td><strong>{standalone.name}</strong></td>
                        <td>
                          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>حي مستقل</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>مستقل</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{standalone.deliveryPrice} د.ع</td>
                        <td style={{ fontWeight: 600 }}>{standalone.driverDeduction} د.ع</td>
                        <td>
                          <span className={`badge ${standalone.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {standalone.isActive ? 'مفعلة' : 'معطلة'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button 
                            className="action-btn btn-edit" 
                            onClick={() => handleEdit(standalone)}
                            title="تعديل الحي"
                          >
                            <EditIcon size={16} />
                          </button>
                          <button 
                            className={`action-btn ${standalone.isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'}`} 
                            onClick={() => handleToggleActive(standalone.id, standalone.isActive)}
                            title={standalone.isActive ? "تعطيل الحي" : "تفعيل الحي"}
                          >
                            {standalone.isActive ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                          </button>
                          <button 
                            className="action-btn btn-delete" 
                            onClick={() => handleDelete(standalone.id)}
                            title="حذف الحي"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {formType === 'parent' && (
        <div className="modal-overlay" onClick={() => setFormType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-title">إنشاء منطقة رئيسية (قسم)</div>
            <div className="modal-subtitle">سيتم إنشاء قسم جديد لتوزيع الأحياء بداخله</div>
            <form onSubmit={handleCreateParent}>
              <div className="form-group">
                <label className="form-label">اسم المنطقة الرئيسية (القسم)</label>
                <input className="form-input" placeholder="مثال: الدورة، المنصور..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setFormType(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {formType === 'child' && (
        <div className="modal-overlay" onClick={() => setFormType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-title">إضافة حي فرعي / مستقل</div>
            <div className="modal-subtitle">حدد تفاصيل الحي والأسعار والقسم التابع له</div>
            <form onSubmit={handleCreateChild}>
              <div className="form-group">
                <label className="form-label">اسم الحي / المنطقة</label>
                <input className="form-input" placeholder="مثال: حي الصحة، حي الطعمة..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">القسم التابع له (اختياري)</label>
                <select
                  className="form-input"
                  value={formData.parentId}
                  onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                  style={{ padding: '8px 16px', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', height: 'auto' }}
                >
                  <option value="">حي مستقل (لا يتبع لقسم)</option>
                  {parentGroups.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر التوصيل (د.ع)</label>
                  <input className="form-input" type="number" min="0" value={formData.deliveryPrice} onChange={e => setFormData({ ...formData, deliveryPrice: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">استقطاع السائق (د.ع)</label>
                  <input className="form-input" type="number" min="0" value={formData.driverDeduction} onChange={e => setFormData({ ...formData, driverDeduction: e.target.value })} required />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setFormType(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingZone && (
        <div className="modal-overlay" onClick={() => setEditingZone(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-title">{editingZone.isGroup ? 'تعديل المنطقة الرئيسية (القسم)' : 'تعديل الحي / المنطقة'}</div>
            <div className="modal-subtitle">تعديل بيانات "{editingZone.name}"</div>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">الاسم</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>

              {!editingZone.isGroup && (
                <>
                  <div className="form-group">
                    <label className="form-label">القسم التابع له (اختياري)</label>
                    <select
                      className="form-input"
                      value={formData.parentId}
                      onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                      style={{ padding: '8px 16px', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', height: 'auto' }}
                    >
                      <option value="">حي مستقل (لا يتبع لقسم)</option>
                      {parentGroups.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">سعر التوصيل (د.ع)</label>
                      <input className="form-input" type="number" min="0" value={formData.deliveryPrice} onChange={e => setFormData({ ...formData, deliveryPrice: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">استقطاع السائق (د.ع)</label>
                      <input className="form-input" type="number" min="0" value={formData.driverDeduction} onChange={e => setFormData({ ...formData, driverDeduction: e.target.value })} required />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditingZone(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
