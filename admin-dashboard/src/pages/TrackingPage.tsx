import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const socket = io('http://localhost:3000');

interface DriverLocation {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  availabilityStatus: string;
  locationUpdatedAt: string;
}

const statusColors: Record<string, string> = {
  available: '#10b981',
  on_delivery: '#f59e0b',
  offline: '#9ca3af',
};

const statusLabels: Record<string, string> = {
  available: 'متاح',
  on_delivery: 'في مهمة',
  offline: 'غير متاح',
};

function createDriverIcon(color: string, name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;text-align:center">
        <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;position:relative;z-index:1">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="3.5"></circle>
            <circle cx="18.5" cy="17.5" r="3.5"></circle>
            <path d="M5.5 17.5 L9 10 L14 10 L18.5 17.5"></path>
            <path d="M9 10 L12 5 L15 5"></path>
            <path d="M15 5 L18 5 L18.5 8"></path>
            <line x1="9" y1="10" x2="14" y2="10"></line>
          </svg>
        </div>
        <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.15);color:#1f2937">
          ${name}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function TrackingPage({ fullscreen = false }: { fullscreen?: boolean }) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreenSearch, setFullscreenSearch] = useState('');

  useEffect(() => {
    // init map after DOM mounts
    const timer = setTimeout(initMap, 100);

    loadDrivers();

    socket.on('driver_location_changed', (data: { driverId: string; lat: number; lng: number }) => {
      setDrivers(prev => {
        const next = prev.map(d =>
          d.id === data.driverId
            ? { ...d, lat: data.lat, lng: data.lng, locationUpdatedAt: new Date().toISOString() }
            : d
        );
        const driver = next.find(d => d.id === data.driverId);
        if (driver) {
          updateMarkerOnMap(data.driverId, data.lat, data.lng, driver);
        }
        return next;
      });
    });

    socket.on('driver_availability_changed', (data: { driverId: string; status: string }) => {
      setDrivers(prev => {
        const next = prev.map(d =>
          d.id === data.driverId
            ? { ...d, availabilityStatus: data.status }
            : d
        );
        const driver = next.find(d => d.id === data.driverId);
        if (driver && driver.lat && driver.lng) {
          updateMarkerOnMap(data.driverId, driver.lat, driver.lng, driver);
        }
        return next;
      });
    });

    const interval = setInterval(loadDrivers, 15000);

    return () => {
      clearTimeout(timer);
      socket.off('driver_location_changed');
      socket.off('driver_availability_changed');
      clearInterval(interval);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen]);

  const initMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([33.3152, 44.3661], 12);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; ali',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    // force resize after card renders
    setTimeout(() => map.invalidateSize(), 200);
  };

  const loadDrivers = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/drivers/admin', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });
      const allDrivers = await res.json();
      const withLocation = allDrivers.filter((d: any) => d.lat && d.lng);
      setDrivers(withLocation);
      withLocation.forEach((d: any) => updateMarkerOnMap(d.id, parseFloat(d.lat), parseFloat(d.lng), d));
    } catch { }
  };

  const updateMarkerOnMap = (driverId: string, lat: number, lng: number, driverData?: any) => {
    if (!mapRef.current) return;
    const existing = markersRef.current.get(driverId);
    const driver = driverData || drivers.find(d => d.id === driverId);
    const color = statusColors[driver?.availabilityStatus || 'offline'] || '#9ca3af';
    const name = driver?.name || driverId.slice(0, 6);

    const popupContent = `
      <div style="direction: rtl; text-align: right; font-family: Cairo, system-ui; min-width: 140px;">
        <h4 style="margin: 0 0 4px 0; font-weight: 700; color: #1f2937;">${name}</h4>
        <p style="margin: 0 0 6px 0; font-size: 11px; color: #4b5563; direction: ltr; text-align: right;">${driver?.phone || ''}</p>
        <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; background: ${color}20; color: ${color};">
          ${statusLabels[driver?.availabilityStatus || 'offline']}
        </span>
      </div>
    `;

    if (existing) {
      existing.setLatLng([lat, lng]);
      existing.setIcon(createDriverIcon(color, name));
      existing.setPopupContent(popupContent);
    } else {
      const marker = L.marker([lat, lng], { icon: createDriverIcon(color, name) })
        .bindPopup(popupContent)
        .addTo(mapRef.current!);
      marker.on('click', () =>
        setSelectedDriver(driver || {
          id: driverId, name, lat, lng, phone: '',
          availabilityStatus: 'offline', locationUpdatedAt: '',
        })
      );
      markersRef.current.set(driverId, marker);
    }
  };

  const focusDriver = (driver: DriverLocation) => {
    if (mapRef.current) {
      mapRef.current.setView([driver.lat, driver.lng], 16);
      markersRef.current.get(driver.id)?.openPopup();
    }
    setSelectedDriver(driver);
  };

  const available = drivers.filter(d => d.availabilityStatus === 'available');
  const onDelivery = drivers.filter(d => d.availabilityStatus === 'on_delivery');
  const offline = drivers.filter(d => d.availabilityStatus === 'offline');

  if (fullscreen) {
    const filteredDrivers = drivers.filter(d =>
      (d.name || '').includes(fullscreenSearch) ||
      (d.phone || '').includes(fullscreenSearch)
    );

    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative', margin: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row-reverse' }}>
        {/* local stylesheet for the morphing menu button */}
        <style>{`
          .menu-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: white;
            border: 1px solid var(--border);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s ease;
            outline: none;
            gap: 5px;
            position: relative;
            z-index: 1100;
            flex-shrink: 0;
          }
          .menu-btn:hover {
            box-shadow: 0 6px 16px rgba(92, 115, 255, 0.15);
            border-color: var(--primary);
          }
          .menu-btn span {
            display: block;
            width: 18px;
            height: 2px;
            background-color: var(--primary);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
          }
          .menu-btn.open span:nth-child(1) {
            transform: translateY(7px) rotate(45deg);
          }
          .menu-btn.open span:nth-child(2) {
            opacity: 0;
            transform: scale(0);
          }
          .menu-btn.open span:nth-child(3) {
            transform: translateY(-7px) rotate(-45deg);
          }
        `}</style>

        {/* Map Container */}
        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
 
          {/* Floating Controls Row (ALWAYS VISIBLE) */}
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Toggle Sidebar Button with Morphing Hamburger-to-Cross Icon */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`menu-btn ${sidebarOpen ? 'open' : ''}`}
              title={sidebarOpen ? "إغلاق قائمة السائقين" : "فتح قائمة السائقين"}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {/* Status Counts */}
            <div style={{
              background: 'white',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontFamily: 'Cairo',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              gap: 16,
              direction: 'rtl'
            }}>
              <span style={{ color: '#10b981' }}>🟢 متاح ({available.length})</span>
              <span style={{ color: '#f59e0b' }}>🟡 في مهمة ({onDelivery.length})</span>
              <span style={{ color: '#9ca3af' }}>⚫ غير متاح ({offline.length})</span>
            </div>
 
            {/* Refresh Button */}
            <button
              className="btn btn-primary"
              onClick={loadDrivers}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 12px rgba(92, 115, 255, 0.2)',
                fontSize: '13.5px',
                fontWeight: 700,
                gap: 8,
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              تحديث مواقع السائقين
            </button>
          </div>
        </div>

        {/* Sidebar panel (slides from right) */}
        <div
          style={{
            width: sidebarOpen ? '340px' : '0px',
            opacity: sidebarOpen ? 1 : 0,
            overflow: 'hidden',
            height: '100%',
            backgroundColor: 'white',
            boxShadow: sidebarOpen ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            flexShrink: 0
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'Cairo' }}>تتبع السائقين</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{drivers.length} سائق مرصود</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              title="إغلاق القائمة"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search box inside Sidebar */}
          <div style={{ padding: '16px 20px 12px 20px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="ابحث باسم السائق أو الهاتف..."
                className="form-input"
                value={fullscreenSearch}
                onChange={e => setFullscreenSearch(e.target.value)}
                style={{ paddingRight: 36, paddingLeft: 12, height: 40, fontSize: 13, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%' }}
              />
            </div>
          </div>

          {/* Drivers List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredDrivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Cairo' }}>
                لا يوجد سائقون مطبقون للبحث
              </div>
            ) : (
              filteredDrivers.map(d => {
                const isSelected = selectedDriver?.id === d.id;
                const statusColor = statusColors[d.availabilityStatus] || '#9ca3af';
                return (
                  <div
                    key={d.id}
                    onClick={() => focusDriver(d)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary-bg)' : '#f8fafc',
                      border: isSelected ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, width: '100%' }}>
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'white',
                        border: `2px solid ${statusColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-primary)', fontWeight: 800, fontSize: 13,
                        flexShrink: 0,
                        position: 'relative'
                      }}>
                        {d.name?.charAt(0)}
                        <span style={{
                          position: 'absolute', bottom: -1, right: -1,
                          width: 8, height: 8, borderRadius: '50%',
                          background: statusColor,
                          border: '1.5px solid white'
                        }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Cairo' }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', direction: 'ltr', textAlign: 'right' }}>{d.phone}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Page Header ─── */}
      <div className="page-header">
        <h1>تتبع السائقين</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={() => window.open('/tracking-fullscreen', '_blank')}
            style={{
              padding: '8px 16px',
              fontSize: '13.5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            عرض بملء الشاشة
          </button>
          <button
            className="btn btn-primary"
            onClick={loadDrivers}
            style={{
              padding: '8px 16px',
              fontSize: '13.5px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            تحديث المواقع
          </button>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="stats-grid">
        {/* إجمالي */}
        <div className="stat-card">
          <div className="stat-icon primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path d="M5.5 17.5 L9 10 L14 10 L18.5 17.5" />
              <path d="M9 10 L12 5 L15 5" />
              <path d="M15 5 L18 5 L18.5 8" />
              <line x1="9" y1="10" x2="14" y2="10" />
            </svg>
          </div>
          <div className="stat-info">
            <h3>{drivers.length}</h3>
            <p>إجمالي السائقين</p>
          </div>
        </div>

        {/* متاح */}
        <div className="stat-card">
          <div className="stat-icon success">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-info">
            <h3>{available.length}</h3>
            <p>متاحون الآن</p>
          </div>
        </div>

        {/* في مهمة */}
        <div className="stat-card">
          <div className="stat-icon warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-info">
            <h3>{onDelivery.length}</h3>
            <p>في مهمة توصيل</p>
          </div>
        </div>

        {/* غير متاح */}
        <div className="stat-card">
          <div className="stat-icon danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <div className="stat-info">
            <h3>{offline.length}</h3>
            <p>غير متاحون</p>
          </div>
        </div>
      </div>

      {/* ─── Map + Driver List ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* خريطة */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 999,
            background: 'var(--bg-card)', borderRadius: 12,
            padding: '8px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            border: '1px solid var(--border)',
            display: 'flex', gap: 14,
            fontSize: 12, fontWeight: 600,
            direction: 'rtl',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> متاح
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> في مهمة
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#9ca3af', display: 'inline-block' }} /> غير متاح
            </span>
          </div>
          <div ref={mapContainerRef} style={{ width: '100%', height: 460 }} />
        </div>

        {/* قائمة السائقين */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', margin: 0 }}>
            <div>
              <div className="card-title">قائمة السائقين</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{drivers.length} سائق مرصود</div>
            </div>
          </div>

          <div style={{ padding: '12px' }}>
            {drivers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ paddingTop: 30 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="5.5" cy="17.5" r="3.5" />
                    <circle cx="18.5" cy="17.5" r="3.5" />
                    <path d="M5.5 17.5 L9 10 L14 10 L18.5 17.5" />
                    <path d="M9 10 L12 5 L15 5" />
                    <path d="M15 5 L18 5 L18.5 8" />
                    <line x1="9" y1="10" x2="14" y2="10" />
                  </svg>
                </div>
                <div className="empty-state-text">لا يوجد سائقون بمواقع حالية</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {drivers.map(driver => (
                  <div
                    key={driver.id}
                    onClick={() => focusDriver(driver)}
                    className="driver-card"
                    style={{
                      border: selectedDriver?.id === driver.id
                        ? '2px solid var(--primary)'
                        : '1px solid var(--border)',
                      background: selectedDriver?.id === driver.id
                        ? 'var(--primary-bg)'
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="driver-info">
                      <h4>{driver.name}</h4>
                      <p style={{ direction: 'ltr', textAlign: 'left' }}>{driver.phone}</p>
                      {driver.locationUpdatedAt && (
                        <p style={{ marginTop: 2, fontSize: 11 }}>
                          آخر تحديث: {new Date(driver.locationUpdatedAt).toLocaleTimeString('ar-IQ')}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${driver.availabilityStatus === 'available' ? 'badge-success' :
                        driver.availabilityStatus === 'on_delivery' ? 'badge-warning' : 'badge-gray'
                      }`}>
                      {statusLabels[driver.availabilityStatus]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
