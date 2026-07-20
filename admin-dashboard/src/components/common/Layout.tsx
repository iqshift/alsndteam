import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { useSearch } from '../../hooks/useSearch';
import { settingsAPI, ordersAPI, driversAPI, restaurantsAPI, supportAPI, BACKEND_BASE_URL } from '../../services/api';
import {
  PackageIcon,
  TruckIcon,
  MapPinIcon,
  MapIcon,
  StoreIcon,
  WalletIcon,
  DollarSignIcon,
  ChartIcon,
  ClipboardIcon,
  SettingsIcon,
  LogoutIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  MessageIcon,
  UsersIcon,
  CalendarIcon,
} from './Icons';

const navItems = [
  { path: '/', label: 'الطلبات', icon: PackageIcon, resource: 'orders' },
  { path: '/drivers', label: 'السائقون', icon: TruckIcon, resource: 'drivers' },
  { path: '/tracking', label: 'تتبع السائقين', icon: MapPinIcon, resource: 'drivers' },
  { path: '/zones', label: 'المناطق والأحياء', icon: MapIcon, resource: 'zones' },
  { path: '/restaurants', label: 'المطاعم', icon: StoreIcon, resource: 'restaurants' },
  { path: '/platform-revenue', label: 'أرباح المنصة', icon: DollarSignIcon, resource: 'reports' },
  { path: '/subscriptions', label: 'الاشتراكات', icon: CalendarIcon, resource: 'subscriptions' },
  { path: '/wallet', label: 'المحفظة', icon: WalletIcon, resource: 'wallet' },
  { path: '/employees', label: 'وكلاء الشحن', icon: UsersIcon, resource: 'rechargeAgents' },
  { path: '/support', label: 'الدعم', icon: MessageIcon, resource: 'support' },
  { path: '/reports', label: 'التقارير', icon: ChartIcon, resource: 'reports' },
  { path: '/audit', label: 'سجل التدقيق', icon: ClipboardIcon, resource: 'audit' },
  { path: '/settings', label: 'الإعدادات', icon: SettingsIcon, resource: 'settings' },
  { path: '/staff', label: 'الموظفون والمساعدون', icon: UsersIcon, resource: 'staff' },
];

// ─── Status maps ───
const orderStatusLabel: Record<string, string> = {
  searching_driver: 'بحث عن سائق',
  assigned: 'تم التعيين',
  arrived_at_restaurant: 'وصل للمطعم',
  heading_to_customer: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  no_drivers_available: 'لا يوجد سائقون',
};

const driverStatusLabel: Record<string, string> = {
  online: 'متاح',
  offline: 'غير متاح',
  busy: 'مشغول',
};

type SearchResult = {
  id: string;
  type: 'order' | 'driver' | 'restaurant';
  title: string;
  subtitle: string;
  path: string;
};

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);

  // ─── Unread Support Messages Sync ───
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await supportAPI.getChats();
      if (Array.isArray(data)) {
        const total = data.reduce((sum: number, chat: any) => sum + (chat.unreadCount || 0), 0);
        setUnreadSupportCount(total);
      }
    } catch (e) {
      // silent catch
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const socket = io(BACKEND_BASE_URL);

    socket.on('new_support_message', () => {
      fetchUnreadCount();
    });
    socket.on('support_chat_read', () => {
      fetchUnreadCount();
    });
    socket.on('support_chat_cleared', () => {
      fetchUnreadCount();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname, fetchUnreadCount]);

  // ─── Global search state ───
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data } = await settingsAPI.get();
        if (data && data.adminThemeColor) {
          document.documentElement.style.setProperty('--primary', data.adminThemeColor);
        }
      } catch (err) {
        // use default styles
      }
    };
    fetchTheme();
  }, []);

  // ─── Load all data for local search (once) ───
  const loadSearchData = useCallback(async () => {
    if (dataLoaded) return;
    try {
      const [ordersRes, driversRes, restaurantsRes] = await Promise.all([
        ordersAPI.getAll().catch(() => ({ data: [] })),
        driversAPI.getAll().catch(() => ({ data: [] })),
        restaurantsAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setAllOrders(ordersRes.data || []);
      setAllDrivers(driversRes.data || []);
      setAllRestaurants(restaurantsRes.data || []);
      setDataLoaded(true);
    } catch (e) {
      // silent
    }
  }, [dataLoaded]);

  // ─── Run instant search on query change ───
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    debounceTimer.current = setTimeout(async () => {
      await loadSearchData();

      const lq = q.toLowerCase();
      const results: SearchResult[] = [];

      // Search orders
      allOrders.forEach((o: any) => {
        if (
          (o.restaurant?.name || '').toLowerCase().includes(lq) ||
          (o.customerPhone || '').includes(lq) ||
          (o.zone?.name || '').toLowerCase().includes(lq) ||
          (String(o.orderNumber) || '').includes(lq)
        ) {
          results.push({
            id: o.id,
            type: 'order',
            title: `طلب #${o.orderNumber || o.id.slice(0, 8)} — ${o.restaurant?.name || ''}`,
            subtitle: `${o.customerPhone} · ${orderStatusLabel[o.status] || o.status}`,
            path: '/',
          });
        }
      });

      // Search drivers
      allDrivers.forEach((d: any) => {
        if (
          (d.name || '').toLowerCase().includes(lq) ||
          (d.phone || '').includes(lq)
        ) {
          results.push({
            id: d.id,
            type: 'driver',
            title: `سائق — ${d.name}`,
            subtitle: `${d.phone} · ${driverStatusLabel[d.availabilityStatus] || d.availabilityStatus}`,
            path: `/drivers`,
          });
        }
      });

      // Search restaurants
      allRestaurants.forEach((r: any) => {
        if (
          (r.name || '').toLowerCase().includes(lq) ||
          (r.phone || '').includes(lq)
        ) {
          results.push({
            id: r.id,
            type: 'restaurant',
            title: `مطعم — ${r.name}`,
            subtitle: `${r.phone} · ${r.status === 'active' ? 'نشط' : 'موقوف'}`,
            path: `/restaurants/${r.id}`,
          });
        }
      });

      setSearchResults(results.slice(0, 8));
      setSearching(false);
    }, 220);
  }, [searchQuery, allOrders, allDrivers, allRestaurants, loadSearchData]);

  // ─── Close dropdown on outside click ───
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setSearchFocused(false);
    setSearchResults([]);
    navigate(result.path);
  };

  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const getPageTitle = (pathname: string) => {
    const item = navItems.find((i) =>
      i.path === '/' ? pathname === '/' : pathname.startsWith(i.path)
    );
    return item ? item.label : 'لوحة التحكم';
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const typeIcon = (type: string) => {
    if (type === 'order') return '📦';
    if (type === 'driver') return '🛵';
    return '🍽️';
  };

  return (
    <div className={`app-layout ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && <h2>لوحة التحكم</h2>}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '☰' : '✕'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter(item => {
              // Hide staff management from non-master admins
              if (item.path === '/staff' && user?.role !== 'admin') {
                return false;
              }
              return true;
            })
            .map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              
              const isLocked = user?.role === 'staff' && item.resource && user?.permissions?.[item.resource]?.read !== true;

              if (isLocked) {
                return (
                  <div
                    key={item.path}
                    className="nav-item locked"
                    onClick={() => alert('عذراً، أنت غير مخول بالدخول إلى هذا القسم')}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 12,
                      margin: '4px 8px',
                      color: '#94a3b8',
                      transition: 'all 0.2s',
                    }}
                    title={collapsed ? `${item.label} (مغلق)` : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="nav-icon" style={{ display: 'flex', color: '#94a3b8' }}><Icon size={20} /></span>
                      {!collapsed && <span className="nav-label" style={{ fontWeight: 600, fontSize: 13.5 }}>{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <span style={{ color: '#ef4444', display: 'flex' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-icon"><Icon size={20} /></span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
        </nav>

        <Link to="/profile" className="sidebar-user" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="avatar">{user?.name?.charAt(0) || 'A'}</div>
          {!collapsed && (
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-phone">{user?.phone}</div>
            </div>
          )}
        </Link>

        <button onClick={logout} className="logout-btn">
          <span className="nav-icon"><LogoutIcon size={20} /></span>
          {!collapsed && <span>خروج</span>}
        </button>
      </aside>

      <main className="main-content">
        <header className="app-header">
          <div className="header-left-section">
            <h1 className="header-title">{getPageTitle(location.pathname)}</h1>
            <span className="header-date">{getFormattedDate()}</span>
          </div>

          <div className="header-right-section">
            {/* ─── Global Instant Search ─── */}
            <div className="header-search" ref={searchRef} style={{ position: 'relative' }}>
              <span className="search-icon"><SearchIcon size={16} /></span>
              <input
                type="text"
                placeholder="بحث في الطلبات، السائقين، المطاعم..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  loadSearchData();
                }}
                autoComplete="off"
              />
              {/* Clear button */}
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '0 4px',
                  }}
                >×</button>
              )}

              {/* ─── Dropdown Results ─── */}
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  left: 0,
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
                  border: '1px solid #f1f5f9',
                  zIndex: 9999,
                  overflow: 'hidden',
                  minWidth: 360,
                  maxHeight: 400,
                  overflowY: 'auto',
                  direction: 'rtl',
                }}>
                  {searching && (
                    <div style={{
                      padding: '18px 20px',
                      color: '#94a3b8',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      جاري البحث...
                    </div>
                  )}

                  {!searching && searchResults.length === 0 && (
                    <div style={{
                      padding: '24px 20px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 13,
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                      لا توجد نتائج لـ "<strong>{searchQuery}</strong>"
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <>
                      <div style={{
                        padding: '10px 16px 6px',
                        fontSize: 11,
                        color: '#94a3b8',
                        fontWeight: 700,
                        letterSpacing: 1,
                        borderBottom: '1px solid #f8fafc',
                      }}>
                        {searchResults.length} نتيجة
                      </div>
                      {searchResults.map((result, idx) => (
                        <div
                          key={result.id + idx}
                          onClick={() => handleResultClick(result)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: idx < searchResults.length - 1 ? '1px solid #f8fafc' : 'none',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: result.type === 'order' ? 'rgba(177,18,77,0.08)'
                              : result.type === 'driver' ? 'rgba(16,185,129,0.08)'
                              : 'rgba(59,130,246,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            flexShrink: 0,
                          }}>
                            {typeIcon(result.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#1e293b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {result.title}
                            </div>
                            <div style={{
                              fontSize: 11.5,
                              color: '#94a3b8',
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {result.subtitle}
                            </div>
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: '#cbd5e1',
                            flexShrink: 0,
                          }}>→</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="theme-toggle" onClick={toggleTheme} title="تغيير المظهر">
              {theme === 'light' ? (
                <span className="sun-icon"><MoonIcon size={20} /></span>
              ) : (
                <span className="sun-icon"><SunIcon size={20} /></span>
              )}
            </div>

            <div
              className="chat-notification"
              onClick={() => navigate('/support')}
              title="الدعم الفني والمحادثات"
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <span><MessageIcon size={20} /></span>
              {unreadSupportCount > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 800,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                    lineHeight: 1,
                  }}
                >
                  {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                </span>
              ) : (
                <span className="notification-dot"></span>
              )}
            </div>

            <Link to="/profile" className="header-profile" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="profile-info">
                <span className="profile-name">{user?.name || 'المدير'}</span>
                <span className="profile-role">مدير النظام</span>
              </div>
              <div className="profile-avatar">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </Link>
          </div>
        </header>

        <div className="page-body">
          <Outlet />
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
