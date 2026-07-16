import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantsAPI } from '../services/api';
import { StoreIcon, CheckCircleIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon } from '../components/common/Icons';
import { useSearch } from '../hooks/useSearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function generatePassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    imageUrl: '',
    billingMode: 'commission',
    subscriptionExpiresAt: '',
  });
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const fullMapRef = useRef<L.Map | null>(null);
  const fullMarkerRef = useRef<L.Marker | null>(null);
  const fullMapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadRestaurants(); }, []);

  useEffect(() => {
    if (showForm && mapContainerRef.current && !mapRef.current) {
      setTimeout(initMap, 100);
    }
    return () => {
      if (!showForm && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showForm]);

  useEffect(() => {
    if (mapFullscreen && fullMapContainerRef.current && !fullMapRef.current) {
      setTimeout(initFullMap, 100);
    }
    return () => {
      if (!mapFullscreen && fullMapRef.current) {
        fullMapRef.current.remove();
        fullMapRef.current = null;
        fullMarkerRef.current = null;
      }
    };
  }, [mapFullscreen]);

  const initMap = () => {
    if (!mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current).setView([33.3152, 44.3661], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      updateMarker(map, lat, lng);
      setSelectedLocation({ lat, lng });
      setLatInput(lat.toFixed(6));
      setLngInput(lng.toFixed(6));
    });
    mapRef.current = map;
  };

  const initFullMap = () => {
    if (!fullMapContainerRef.current) return;
    const center: [number, number] = selectedLocation
      ? [selectedLocation.lat, selectedLocation.lng]
      : [33.3152, 44.3661];
    const zoom = selectedLocation ? 16 : 12;
    const map = L.map(fullMapContainerRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    if (selectedLocation) {
      fullMarkerRef.current = L.marker(center).addTo(map);
    }
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (fullMarkerRef.current) {
        fullMarkerRef.current.setLatLng([lat, lng]);
      } else {
        fullMarkerRef.current = L.marker([lat, lng]).addTo(map);
      }
      setSelectedLocation({ lat, lng });
      setLatInput(lat.toFixed(6));
      setLngInput(lng.toFixed(6));
      if (mapRef.current) {
        updateMarker(mapRef.current, lat, lng);
        mapRef.current.setView([lat, lng], 15);
      }
    });
    fullMapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  };

  const updateMarker = (map: L.Map, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
  };

  const handleLatChange = (val: string) => {
    setLatInput(val);
    const lat = parseFloat(val);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
      setSelectedLocation({ lat, lng });
      updateMarker(mapRef.current, lat, lng);
      mapRef.current.setView([lat, lng], 15);
    }
  };

  const handleLngChange = (val: string) => {
    setLngInput(val);
    const lat = parseFloat(latInput);
    const lng = parseFloat(val);
    if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
      setSelectedLocation({ lat, lng });
      updateMarker(mapRef.current, lat, lng);
      mapRef.current.setView([lat, lng], 15);
    }
  };

  const handleGeneratePassword = () => {
    const pw = generatePassword(8);
    setFormData({ ...formData, password: pw, confirmPassword: pw });
    setShowPassword(true);
  };

  const loadRestaurants = async () => {
    try {
      const { data } = await restaurantsAPI.getAll();
      setRestaurants(data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    try {
      await restaurantsAPI.updateStatus(id, newStatus);
      loadRestaurants();
    } catch (err: any) {
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: currentStatus } : r));
      alert('فشل تغيير حالة المطعم');
    }
  };
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      imageUrl: '',
      billingMode: 'commission',
      subscriptionExpiresAt: '',
    });
    setLogoFile(null);
    setLogoPreview('');
    setSelectedLocation(null);
    setLatInput('');
    setLngInput('');
    setShowPassword(false);
    setEditingRestaurant(null);
  };

  const handleEditClick = (r: any) => {
    setEditingRestaurant(r);
    setFormData({
      name: r.name,
      phone: r.phone,
      password: '',
      confirmPassword: '',
      imageUrl: r.imageUrl || '',
      billingMode: r.billingMode || 'commission',
      subscriptionExpiresAt: r.subscriptionExpiresAt ? r.subscriptionExpiresAt.substring(0, 10) : '',
    });
    setLogoPreview(r.imageUrl || '');
    setLogoFile(null);
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    setSelectedLocation({ lat, lng });
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
    setShowForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المطعم نهائياً؟ سيتم حذف جميع الطلبات والبيانات المتعلقة به.')) return;
    try {
      await restaurantsAPI.delete(id);
      loadRestaurants();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حذف المطعم');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For edit, password is optional
    if (!editingRestaurant && !formData.password) {
      alert('يرجى إدخال كلمة المرور');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('كلمتا المرور غير متطابقتين');
      return;
    }
    if (!selectedLocation) {
      alert('حدد موقع المطعم على الخريطة أو أدخل الإحداثيات');
      return;
    }

    try {
      let imageUrl = formData.imageUrl.trim() || undefined;

      // Upload the local file first if chosen
      if (logoFile) {
        const { data } = await restaurantsAPI.uploadLogo(logoFile);
        imageUrl = data.url;
      }

      if (editingRestaurant) {
        await restaurantsAPI.update(editingRestaurant.id, {
          name: formData.name,
          phone: formData.phone,
          password: formData.password || undefined,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          imageUrl,
          billingMode: formData.billingMode,
          subscriptionExpiresAt: formData.billingMode === 'subscription' && formData.subscriptionExpiresAt ? formData.subscriptionExpiresAt : null,
        });
      } else {
        await restaurantsAPI.create({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          imageUrl,
          billingMode: formData.billingMode,
          subscriptionExpiresAt: formData.billingMode === 'subscription' && formData.subscriptionExpiresAt ? formData.subscriptionExpiresAt : null,
        });
      }

      setShowForm(false);
      resetForm();
      loadRestaurants();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حفظ المطعم');
    }
  };
  const filteredRestaurants = searchQuery.trim()
    ? restaurants.filter(r =>
        (r.name || '').includes(searchQuery) ||
        (r.phone || '').includes(searchQuery)
      )
    : restaurants;

  return (
    <div>
      <div className="page-header">
        <h1>المطاعم</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ مطعم جديد</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <StoreIcon size={24} />
          </div>
          <div className="stat-info"><h3>{restaurants.length}</h3><p>إجمالي المطاعم</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info"><h3>{restaurants.filter(r => r.status === 'active').length}</h3><p>مطاعم نشطة</p></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الحالة</th>
              <th>تاريخ التسجيل</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>جاري التحميل...</td></tr>
            ) : filteredRestaurants.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <StoreIcon size={48} />
                  </div>
                  <div className="empty-state-text">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مطاعم بعد'}</div>
                </div>
              </td></tr>
            ) : (
              filteredRestaurants.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/restaurants/${r.id}`)}>
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
                      {r.billingMode === 'subscription' && (
                        <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px', marginRight: 6, background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0' }}>
                          اشتراك شهري
                        </span>
                      )}
                    </div>
                  </td>
                  <td><span style={{ direction: 'ltr', display: 'inline-block' }}>{r.phone}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
                      <label className="toggle-switch" title={r.status === 'active' ? 'تعليق المطعم' : 'تفعيل المطعم'}>
                        <input
                          type="checkbox"
                          checked={r.status === 'active'}
                          onChange={() => handleToggleStatus(r.id, r.status)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.status === 'active' ? '#10b981' : '#ef4444' }}>
                        {r.status === 'active' ? 'نشط' : 'معلق'}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString('ar-IQ')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleEditClick(r); }}
                        style={{ fontSize: 11, padding: '4px 10px', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <EditIcon size={12} />
                        <span>تعديل</span>
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(r.id); }}
                        style={{ fontSize: 11, padding: '4px 10px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <TrashIcon size={12} />
                        <span>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-title">{editingRestaurant ? 'تعديل بيانات المطعم' : 'إضافة مطعم جديد'}</div>
            <div className="modal-subtitle">{editingRestaurant ? 'عدل بيانات المطعم وموقعه على الخريطة' : 'أدخل بيانات المطعم وحدد موقعه'}</div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">اسم المطعم</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-input" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              </div>              <div className="form-group">
                <label className="form-label">شعار أو صورة المطعم (اختياري)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 12,
                        objectFit: 'cover',
                        border: '2px solid var(--primary)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      background: 'var(--primary-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      fontWeight: 800,
                      fontSize: 16,
                    }}>
                      {formData.name ? formData.name.charAt(0) : 'R'}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr', gap: 16, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">نظام الفوترة</label>
                  <select
                    className="form-input"
                    value={formData.billingMode}
                    onChange={e => {
                      const mode = e.target.value;
                      let expires = formData.subscriptionExpiresAt;
                      if (mode === 'subscription') {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        expires = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      } else {
                        expires = '';
                      }
                      setFormData({ ...formData, billingMode: mode, subscriptionExpiresAt: expires });
                    }}
                    style={{ height: 42 }}
                  >
                    <option value="commission">عمولة لكل طلب</option>
                    <option value="subscription">اشتراك شهري</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء الاشتراك (اختياري)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.subscriptionExpiresAt}
                    onChange={e => setFormData({ ...formData, subscriptionExpiresAt: e.target.value })}
                    disabled={formData.billingMode !== 'subscription'}
                    style={{ height: 42 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{editingRestaurant ? 'كلمة المرور الجديدة (اختيارية)' : 'كلمة المرور'}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required={!editingRestaurant}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleGeneratePassword} style={{ flexShrink: 0 }}>
                    🎲 عشوائي
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPassword(!showPassword)} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36 }}>
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور</label>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required={!editingRestaurant && !!formData.password}
                />
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>كلمتا المرور غير متطابقتين</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">موقع المطعم</label>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>انقر على الخريطة أو أدخل الإحداثيات يدوياً</p>
                <div style={{ position: 'relative' }}>
                  <div ref={mapContainerRef} className="map-container-sm" />
                  <button
                    type="button"
                    onClick={() => setMapFullscreen(true)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 1000,
                      background: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ⛶ ملء الشاشة
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, display: 'block' }}>Latitude</label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      placeholder="33.3152"
                      value={latInput}
                      onChange={e => handleLatChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, display: 'block' }}>Longitude</label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      placeholder="44.3661"
                      value={lngInput}
                      onChange={e => handleLngChange(e.target.value)}
                    />
                  </div>
                </div>

                {selectedLocation && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
                      ✅ {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingRestaurant ? 'حفظ التغييرات' : 'إنشاء المطعم'}</button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowForm(false); resetForm(); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mapFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>تحديد الموقع — اضغط على الخريطة</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedLocation && (
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, fontFamily: 'monospace' }}>
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </span>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setMapFullscreen(false)}
              >
                ✅ تم التحديد
              </button>
            </div>
          </div>
          <div ref={fullMapContainerRef} style={{ flex: 1 }} />
        </div>
      )}
    </div>
  );
}
