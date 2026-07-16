import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

export default function DeleteAccountPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [platformName, setPlatformName] = useState('منصة التوصيل');

  useEffect(() => {
    // Load public settings for theme/platform name
    settingsAPI.getPublic()
      .then(({ data }) => {
        if (data) {
          setPlatformName(data.platformName || 'منصة التوصيل');
          if (data.adminThemeColor) {
            document.documentElement.style.setProperty('--primary', data.adminThemeColor);
          }
        }
      })
      .catch((err) => console.error('Failed to load settings', err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div style={{
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      textAlign: 'right',
      background: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: 450,
        width: '100%',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        padding: '32px 24px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header/Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo_remove_bg.png" alt={platformName} style={{ height: 70, objectFit: 'contain', marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', margin: '0 0 4px 0' }}>طلب حذف الحساب</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>تقديم طلب لإزالة حسابك نهائياً من {platformName}</p>
        </div>

        {submitted ? (
          // Success State
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>تم استلام طلبك بنجاح</h3>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
              تم تسجيل طلب حذف الحساب بنجاح. سيتم مراجعة الطلب وتعطيل الحساب وحذف جميع البيانات الحساسة المرتبطة به تلقائياً خلال 14 يوماً عمل بما يتوافق مع سياسات الخصوصية الخاصة بالمنصة.
            </p>
            <div style={{ marginTop: 24, fontSize: 12, color: '#94a3b8' }}>يمكنك إغلاق هذه الصفحة الآن.</div>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit}>
            {/* Warning Banner */}
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              display: 'flex',
              gap: 10
            }}>
              <div style={{ color: '#d97706', marginTop: 2 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                <strong>تنبيه هام:</strong> حذف الحساب سيؤدي إلى حذف جميع البيانات الشخصية والمحفظة وسجل الطلبات بشكل نهائي ولا يمكن التراجع عن هذا الإجراء أو استرداد البيانات لاحقاً.
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>رقم الهاتف المسجل</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xxxxxxxxx"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: '#ef4444',
                color: 'white',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: 6 }}>
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                  </svg>
                  جاري تسجيل الطلب...
                </>
              ) : (
                'تأكيد حذف الحساب نهائياً'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
