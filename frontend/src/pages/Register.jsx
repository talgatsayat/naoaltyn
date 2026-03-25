import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Navbar from '../components/Navbar';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [applicantType, setApplicantType] = useState('individual');
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', middle_name: '',
    phone: '', iin: '', company_name: '', bin: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        middle_name: form.middle_name || null,
        phone: form.phone || null,
        iin: form.iin || null,
        applicant_type: applicantType,
        company_name: applicantType === 'company' ? form.company_name : null,
        bin: applicantType === 'company' ? form.bin : null,
      };
      await api.post('/api/auth/register', payload);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 440, margin: '60px auto', background: '#fff', padding: '36px 32px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: 'var(--color-success)', marginBottom: 12 }}>Регистрация успешна!</h2>
        <p style={{ color: '#555', marginBottom: 24 }}>Подтвердите email и войдите в систему.</p>
        <Link to="/login" style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', padding: '11px 28px', borderRadius: 'var(--radius)', fontWeight: 700 }}>
          Войти
        </Link>
      </div>
    </div>
  );

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 14 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 480, margin: '40px auto 60px', background: '#fff', padding: '36px 32px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: 6, fontSize: 24 }}>Регистрация</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>Создайте аккаунт для подачи заявок</p>

        {/* Applicant type toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          {[['individual', '👤 Физическое лицо'], ['company', '🏢 Юридическое лицо']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setApplicantType(val)}
              style={{ flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: applicantType === val ? 'var(--color-primary)' : '#f8f9fa',
                color: applicantType === val ? '#fff' : '#555' }}>
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>{t('form.last_name')} *</label><input style={inputStyle} value={form.last_name} onChange={set('last_name')} required /></div>
            <div><label style={labelStyle}>{t('form.first_name')} *</label><input style={inputStyle} value={form.first_name} onChange={set('first_name')} required /></div>
          </div>
          <div><label style={labelStyle}>{t('form.middle_name')}</label><input style={inputStyle} value={form.middle_name} onChange={set('middle_name')} /></div>
          <div><label style={labelStyle}>{t('form.phone')}</label><input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="+7 (777) 000-00-00" /></div>
          {applicantType === 'individual' && (
            <div><label style={labelStyle}>{t('form.iin')}</label><input style={inputStyle} value={form.iin} onChange={set('iin')} maxLength={12} placeholder="12 цифр" /></div>
          )}
          {applicantType === 'company' && (
            <>
              <div><label style={labelStyle}>{t('form.company_name')} *</label><input style={inputStyle} value={form.company_name} onChange={set('company_name')} required={applicantType === 'company'} /></div>
              <div><label style={labelStyle}>{t('form.bin')} *</label><input style={inputStyle} value={form.bin} onChange={set('bin')} maxLength={12} placeholder="12 цифр" required={applicantType === 'company'} /></div>
            </>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
          <div><label style={labelStyle}>Email *</label><input type="email" style={inputStyle} value={form.email} onChange={set('email')} required /></div>
          <div><label style={labelStyle}>Пароль *</label><input type="password" style={inputStyle} value={form.password} onChange={set('password')} required minLength={8} /></div>

          <button type="submit" disabled={loading}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? 'Регистрация...' : t('nav.register')}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
