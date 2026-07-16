import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { SettingsIcon, KeyIcon, FileTextIcon, EditIcon, EyeIcon, ScaleIcon } from '../components/common/Icons';


interface Settings {
  codeLength: number;
  codeChars: string;
  codeSeparator: string;
  codeSeparatorEvery: number;
  platformName: string;
  platformPhone: string;
  maxSearchDuration: number;
  maxSearchRadius: number;
  driverDecisionDuration: number;
  driverDeduction: number;
  restaurantCommission: number;
  adminThemeColor?: string;
  restaurantThemeColor?: string;
  driverThemeColor?: string;
  posThemeColor?: string;
  privacyPolicy?: string;
  termsOfUse?: string;
}

const defaultSettings: Settings = {
  codeLength: 12,
  codeChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  codeSeparator: '',
  codeSeparatorEvery: 0,
  platformName: 'منصة التوصيل',
  platformPhone: '',
  maxSearchDuration: 20,
  maxSearchRadius: 10,
  driverDecisionDuration: 30,
  driverDeduction: 500,
  restaurantCommission: 500,
  adminThemeColor: '#5C73FF',
  restaurantThemeColor: '#5C73FF',
  driverThemeColor: '#5C73FF',
  posThemeColor: '#5C73FF',
  privacyPolicy: 'سياسة الخصوصية الافتراضية للمنصة...',
  termsOfUse: 'شروط الاستخدام الافتراضية للمنصة...',
};

const FormattingToolbar = ({ field, onFormat }: { field: 'privacyPolicy' | 'termsOfUse'; onFormat: (field: 'privacyPolicy' | 'termsOfUse', type: string) => void }) => (
  <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: '8px 12px', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottom: '1px solid #cbd5e1' }}>
    <button
      type="button"
      onClick={() => onFormat(field, 'bold')}
      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 'bold', background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      title="نص عريض <b>"
    >
      B
    </button>
    <button
      type="button"
      onClick={() => onFormat(field, 'italic')}
      style={{ padding: '4px 10px', fontSize: 12, fontStyle: 'italic', background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      title="نص مائل <i>"
    >
      I
    </button>
    <button
      type="button"
      onClick={() => onFormat(field, 'heading1')}
      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 'bold', background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      title="عنوان رئيسي <h1>"
    >
      H1
    </button>
    <button
      type="button"
      onClick={() => onFormat(field, 'heading2')}
      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 'bold', background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      title="عنوان فرعي <h2>"
    >
      H2
    </button>
    <button
      type="button"
      onClick={() => onFormat(field, 'para')}
      style={{ padding: '4px 10px', fontSize: 12, background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      title="فقرة جديدة <p>"
    >
      P
    </button>
    <button
      type="button"
      onClick={() => onFormat(field, 'list')}
      style={{ padding: '4px 10px', fontSize: 12, background: 'white', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      title="قائمة نقطية <ul>"
    >
      • عنصر قائمة
    </button>
  </div>
);

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'codes' | 'privacy'>('general');
  const [privacyPreview, setPrivacyPreview] = useState<boolean>(false);
  const [termsPreview, setTermsPreview] = useState<boolean>(false);

  const insertFormatting = (field: 'privacyPolicy' | 'termsOfUse', type: string) => {
    const textarea = document.getElementById(field) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    switch (type) {
      case 'bold':
        replacement = `<b>${selected || 'نص عريض'}</b>`;
        break;
      case 'italic':
        replacement = `<i>${selected || 'نص مائل'}</i>`;
        break;
      case 'heading1':
        replacement = `<h1>${selected || 'عنوان رئيسي'}</h1>`;
        break;
      case 'heading2':
        replacement = `<h2>${selected || 'عنوان فرعي'}</h2>`;
        break;
      case 'list':
        replacement = `\n<ul>\n  <li>${selected || 'عنصر قائمة'}</li>\n</ul>`;
        break;
      case 'para':
        replacement = `<p>${selected || 'فقرة جديدة'}</p>`;
        break;
      default:
        replacement = selected;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setSettings({ ...settings, [field]: newValue });

    // Refocus and select
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    const chars = settings.codeChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const len = settings.codeLength || 12;
    const sep = settings.codeSeparator || '';
    const every = settings.codeSeparatorEvery || 4;
    let code = '';
    for (let i = 0; i < len; i++) {
      if (sep && every > 0 && i > 0 && i % every === 0) code += sep;
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPreview(code);
  }, [settings.codeLength, settings.codeChars, settings.codeSeparator, settings.codeSeparatorEvery]);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      if (data) {
        setSettings({ ...defaultSettings, ...data });
        if (data.adminThemeColor) {
          document.documentElement.style.setProperty('--primary', data.adminThemeColor);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const chars = settings.codeChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const len = settings.codeLength || 12;
    const sep = settings.codeSeparator || '';
    const every = settings.codeSeparatorEvery || 4;
    let code = '';
    for (let i = 0; i < len; i++) {
      if (sep && every > 0 && i > 0 && i % every === 0) code += sep;
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPreview(code);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await settingsAPI.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>إعدادات المنصة</h1>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid #e2e8f0', marginBottom: 24, paddingBottom: 1 }}>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 'bold',
            color: activeTab === 'general' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'general' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <SettingsIcon size={18} />
          الإعدادات العامة والعمولات
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('codes')}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 'bold',
            color: activeTab === 'codes' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'codes' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <KeyIcon size={18} />
          إعدادات الأكواد وبث الطلبات
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 'bold',
            color: activeTab === 'privacy' ? 'var(--primary)' : '#64748b',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'privacy' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <FileTextIcon size={18} />
          سياسة الخصوصية والشروط
        </button>
      </div>

      {activeTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* General Settings */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">الإعدادات العامة</span>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">اسم المنصة</label>
              <input
                className="form-input"
                value={settings.platformName}
                onChange={e => setSettings({ ...settings, platformName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">هاتف المنصة</label>
              <input
                className="form-input"
                type="tel"
                value={settings.platformPhone}
                onChange={e => setSettings({ ...settings, platformPhone: e.target.value })}
                placeholder="07xxxxxxxxx"
              />
            </div>
          </div>

          {/* Color Settings */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ألوان المظهر للهوية البصرية</span>
            </div>
            
            {/* Admin Theme Color */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>لون لوحة التحكم (الأدمن)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  type="text"
                  value={settings.adminThemeColor || '#5C73FF'}
                  onChange={e => {
                    const color = e.target.value;
                    setSettings({ ...settings, adminThemeColor: color });
                    document.documentElement.style.setProperty('--primary', color);
                  }}
                  style={{ flex: 1 }}
                  placeholder="#5C73FF"
                />
                <input
                  type="color"
                  value={settings.adminThemeColor || '#5C73FF'}
                  onChange={e => {
                    const color = e.target.value;
                    setSettings({ ...settings, adminThemeColor: color });
                    document.documentElement.style.setProperty('--primary', color);
                  }}
                  style={{
                    width: 48,
                    height: 40,
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none'
                  }}
                />
              </div>
            </div>

            {/* Restaurant Theme Color */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>لون تطبيق المطعم</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  type="text"
                  value={settings.restaurantThemeColor || '#5C73FF'}
                  onChange={e => setSettings({ ...settings, restaurantThemeColor: e.target.value })}
                  style={{ flex: 1 }}
                  placeholder="#5C73FF"
                />
                <input
                  type="color"
                  value={settings.restaurantThemeColor || '#5C73FF'}
                  onChange={e => setSettings({ ...settings, restaurantThemeColor: e.target.value })}
                  style={{
                    width: 48,
                    height: 40,
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none'
                  }}
                />
              </div>
            </div>

            {/* Driver Theme Color */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>لون تطبيق كابتن التوصيل</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  type="text"
                  value={settings.driverThemeColor || '#5C73FF'}
                  onChange={e => setSettings({ ...settings, driverThemeColor: e.target.value })}
                  style={{ flex: 1 }}
                  placeholder="#5C73FF"
                />
                <input
                  type="color"
                  value={settings.driverThemeColor || '#5C73FF'}
                  onChange={e => setSettings({ ...settings, driverThemeColor: e.target.value })}
                  style={{
                    width: 48,
                    height: 40,
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none'
                  }}
                />
              </div>
            </div>

            {/* POS Theme Color */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>لون تطبيق نقاط البيع POS</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  type="text"
                  value={settings.posThemeColor || '#5C73FF'}
                  onChange={e => setSettings({ ...settings, posThemeColor: e.target.value })}
                  style={{ flex: 1 }}
                  placeholder="#5C73FF"
                />
                <input
                  type="color"
                  value={settings.posThemeColor || '#5C73FF'}
                  onChange={e => setSettings({ ...settings, posThemeColor: e.target.value })}
                  style={{
                    width: 48,
                    height: 40,
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'codes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Dispatch Settings */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">إعدادات بث الطلبات والبحث</span>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">أقصى مدة للبحث عن سائق (بالدقائق)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="120"
                value={settings.maxSearchDuration}
                onChange={e => setSettings({ ...settings, maxSearchDuration: parseInt(e.target.value) || 20 })}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>بعد انتهاء هذه المدة، يتم إلغاء الطلب تلقائياً لعدم توفر سائقين.</p>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">أقصى نطاق للبحث عن سائق (كيلومتر)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="100"
                value={settings.maxSearchRadius}
                onChange={e => setSettings({ ...settings, maxSearchRadius: parseInt(e.target.value) || 10 })}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>يتوسع نطاق البحث تدريجياً مع كل دورة بث إلى أن يصل لهذا الحد الأقصى.</p>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">مهلة قرار السائق للطلب الجديد (بالثواني)</label>
              <input
                className="form-input"
                type="number"
                min="5"
                max="300"
                value={settings.driverDecisionDuration}
                onChange={e => setSettings({ ...settings, driverDecisionDuration: parseInt(e.target.value) || 30 })}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>المهلة الزمنية المتاحة للسائق لقبول أو تخطي الطلب قبل أن تختفي البطاقة تلقائياً.</p>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">قيمة استقطاع السائق الافتراضية للطلب (د.ع)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={settings.driverDeduction}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setSettings({ ...settings, driverDeduction: isNaN(val) ? 0 : val });
                }}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>القيمة الافتراضية التي تُخصم تلقائياً من محفظة السائق عند إتمام كل طلب.</p>
            </div>
            <div className="form-group">
              <label className="form-label">قيمة عمولة المطعم الافتراضية للطلب (د.ع)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={settings.restaurantCommission}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setSettings({ ...settings, restaurantCommission: isNaN(val) ? 0 : val });
                }}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>القيمة الافتراضية التي يتم خصمها من حساب المطعم للطلب (والتي يخصمها السائق عند استلام الطعام نقداً من المطعم).</p>
            </div>
          </div>

          {/* Code Settings */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">إعدادات كود الشحن</span>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">طول الكود (عدد الأحرف)</label>
              <input
                className="form-input"
                type="number"
                min="4"
                max="32"
                value={settings.codeLength}
                onChange={e => setSettings({ ...settings, codeLength: parseInt(e.target.value) || 12 })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">نوع كود الشحن</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${settings.codeChars === '0123456789' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSettings({ ...settings, codeChars: '0123456789', codeSeparator: '', codeSeparatorEvery: 0 })}
                  style={{ flex: 1, height: 38 }}
                >
                  أرقام فقط
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${settings.codeChars !== '0123456789' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSettings({ ...settings, codeChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', codeSeparator: '', codeSeparatorEvery: 0 })}
                  style={{ flex: 1, height: 38 }}
                >
                  أحرف وأرقام
                </button>
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>معاينة الكود:</div>
              <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#1f2937', letterSpacing: 1.5, direction: 'ltr', textAlign: 'center' }}>
                {preview}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={generatePreview}>
                🔄 توليد معاينة جديدة
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Privacy Policy Editor */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileTextIcon size={18} />
                <span>سياسة الخصوصية</span>
              </span>
              <button
                type="button"
                className={`btn btn-sm ${privacyPreview ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPrivacyPreview(!privacyPreview)}
                style={{ fontSize: 12, fontWeight: 'bold' }}
              >
                {privacyPreview ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EditIcon size={12} />
                    <span>تعديل النص</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EyeIcon size={12} />
                    <span>معاينة التنسيق</span>
                  </span>
                )}
              </button>
            </div>

            {privacyPreview ? (
              <div 
                style={{ 
                  padding: '16px 20px', 
                  borderRadius: 12, 
                  border: '1px solid #cbd5e1', 
                  backgroundColor: '#f8fafc', 
                  minHeight: 300, 
                  overflowY: 'auto',
                  fontSize: 14,
                  lineHeight: '1.6',
                  color: '#1e293b'
                }}
                dangerouslySetInnerHTML={{ __html: settings.privacyPolicy || '<i>لا يوجد محتوى لعرضه</i>' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <FormattingToolbar field="privacyPolicy" onFormat={insertFormatting} />
                <textarea
                  id="privacyPolicy"
                  className="form-input"
                  value={settings.privacyPolicy || ''}
                  onChange={e => setSettings({ ...settings, privacyPolicy: e.target.value })}
                  rows={12}
                  placeholder="اكتب سياسة الخصوصية هنا..."
                  style={{ 
                    fontFamily: 'Cairo', 
                    fontSize: 13, 
                    resize: 'vertical', 
                    minHeight: 250, 
                    width: '100%', 
                    padding: '12px 14px', 
                    borderBottomLeftRadius: 8, 
                    borderBottomRightRadius: 8, 
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    border: '1px solid #cbd5e1', 
                    borderTop: 'none',
                    backgroundColor: '#f8fafc', 
                    color: '#1e293b',
                    lineHeight: '1.6'
                  }}
                />
              </div>
            )}
          </div>

          {/* Terms of Use Editor */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ScaleIcon size={18} />
                <span>شروط وأحكام الاستخدام</span>
              </span>
              <button
                type="button"
                className={`btn btn-sm ${termsPreview ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTermsPreview(!termsPreview)}
                style={{ fontSize: 12, fontWeight: 'bold' }}
              >
                {termsPreview ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EditIcon size={12} />
                    <span>تعديل النص</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <EyeIcon size={12} />
                    <span>معاينة التنسيق</span>
                  </span>
                )}
              </button>
            </div>

            {termsPreview ? (
              <div 
                style={{ 
                  padding: '16px 20px', 
                  borderRadius: 12, 
                  border: '1px solid #cbd5e1', 
                  backgroundColor: '#f8fafc', 
                  minHeight: 300, 
                  overflowY: 'auto',
                  fontSize: 14,
                  lineHeight: '1.6',
                  color: '#1e293b'
                }}
                dangerouslySetInnerHTML={{ __html: settings.termsOfUse || '<i>لا يوجد محتوى لعرضه</i>' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <FormattingToolbar field="termsOfUse" onFormat={insertFormatting} />
                <textarea
                  id="termsOfUse"
                  className="form-input"
                  value={settings.termsOfUse || ''}
                  onChange={e => setSettings({ ...settings, termsOfUse: e.target.value })}
                  rows={12}
                  placeholder="اكتب شروط الاستخدام هنا..."
                  style={{ 
                    fontFamily: 'Cairo', 
                    fontSize: 13, 
                    resize: 'vertical', 
                    minHeight: 250, 
                    width: '100%', 
                    padding: '12px 14px', 
                    borderBottomLeftRadius: 8, 
                    borderBottomRightRadius: 8, 
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    border: '1px solid #cbd5e1', 
                    borderTop: 'none',
                    backgroundColor: '#f8fafc', 
                    color: '#1e293b',
                    lineHeight: '1.6'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 160, justifyContent: 'center' }}>
          {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600, fontSize: 14 }}>
            ✅ تم الحفظ بنجاح
          </span>
        )}
      </div>
    </div>
  );
}
