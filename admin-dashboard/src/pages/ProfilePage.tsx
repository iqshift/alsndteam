import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'يرجى إدخال اسم المشرف' });
      return;
    }
    
    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'يرجى إدخال رقم الهاتف' });
      return;
    }

    if (password) {
      if (password.length < 6) {
        setMessage({ type: 'error', text: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين' });
        return;
      }
    }

    setLoading(true);
    try {
      const updateData: { name: string; phone: string; password?: string } = {
        name,
        phone,
      };
      if (password) {
        updateData.password = password;
      }

      const { data } = await authAPI.updateProfile(updateData);
      
      // Update context and localStorage
      updateUser({
        name: data.name,
        phone: data.phone,
      });

      // Clear password fields
      setPassword('');
      setConfirmPassword('');
      
      setMessage({ type: 'success', text: 'تم تحديث بيانات الملف الشخصي بنجاح!' });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'حدث خطأ أثناء تحديث البيانات، يرجى المحاولة لاحقاً';
      setMessage({ type: 'error', text: typeof errMsg === 'object' ? errMsg[0] : errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: '24px auto', padding: '0 16px', direction: 'rtl' }}>
      <div className="card" style={{ padding: '32px', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 18 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--primary-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            fontSize: 22,
            fontWeight: 800
          }}>
            {name.charAt(0) || 'A'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Cairo' }}>ملف المشرف الشخصي</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>تحديث بيانات الاسم ورقم الهاتف وكلمة المرور الخاصة بك</p>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 13.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: message.type === 'success' ? '#059669' : '#DC2626',
            border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
            fontFamily: 'Cairo'
          }}>
            {message.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* الاسم */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'Cairo' }}>الاسم الكامل للمشرف</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسم المشرف الكامل..."
                style={{ paddingRight: 40, width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)' }}
                required
              />
            </div>
          </div>

          {/* رقم الهاتف */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'Cairo' }}>رقم الهاتف (اسم المستخدم)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="أدخل رقم الهاتف..."
                style={{ paddingRight: 40, width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)' }}
                required
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }}></div>

          <div style={{
            background: 'rgba(92,115,255,0.03)',
            border: '1px dashed rgba(92,115,255,0.2)',
            padding: '16px',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Cairo' }}>تغيير كلمة المرور (اختياري)</h4>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8' }}>* اترك الحقول التالية فارغة في حال لم تكن ترغب في تعديل كلمة المرور الحالية.</p>

            {/* كلمة المرور الجديدة */}
            <div className="form-group">
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'Cairo' }}>كلمة المرور الجديدة</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة (6 أحرف كحد أدنى)..."
                  style={{ paddingRight: 40, width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'white' }}
                />
              </div>
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="form-group">
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'Cairo' }}>تأكيد كلمة المرور الجديدة</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة..."
                  style={{ paddingRight: 40, width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'white' }}
                />
              </div>
            </div>
          </div>

          {/* زر الحفظ */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              height: 46,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: 'Cairo',
              boxShadow: '0 4px 14px rgba(92,115,255,0.15)',
              marginTop: 10
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                جاري الحفظ...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                حفظ التغييرات
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
