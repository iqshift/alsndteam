import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [platformName, setPlatformName] = useState<string>('منصة التوصيل');

  useEffect(() => {
    settingsAPI.getPublic()
      .then(({ data }) => {
        if (data) {
          setContent(data.privacyPolicy || '');
          setPlatformName(data.platformName || 'منصة التوصيل');
          if (data.adminThemeColor) {
            document.documentElement.style.setProperty('--primary', data.adminThemeColor);
          }
        }
      })
      .catch((err) => console.error('Failed to load settings', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      textAlign: 'right',
      background: '#f8fafc',
      minHeight: '100vh',
      padding: '40px 20px',
      color: '#1e293b'
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        padding: '40px 32px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          textAlign: 'center',
          borderBottom: '2px solid #f1f5f9',
          paddingBottom: 24,
          marginBottom: 32
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--primary, #5C73FF)',
            margin: '0 0 8px 0'
          }}>
            سياسة الخصوصية
          </h1>
          <p style={{
            fontSize: 14,
            color: '#64748b',
            margin: 0
          }}>
            السياسة الخاصة بـ {platformName}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>جاري التحميل...</div>
        ) : content ? (
          <div
            className="rich-content"
            style={{
              lineHeight: 1.8,
              fontSize: 15,
              color: '#334155'
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontStyle: 'italic' }}>
            لا يوجد محتوى لعرضه حالياً.
          </div>
        )}
      </div>
    </div>
  );
}
