import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 420, margin: '60px auto', background: '#fff', padding: '36px 32px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: 6, fontSize: 24 }}>Вход в систему</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>Портал подачи заявок НАО «Алтынсарина»</p>

        {error && (
          <div style={{ background: '#fee2e2', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Пароль</label>
            <input type="password" value={form.password} onChange={set('password')} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 14 }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Вход...' : t('nav.login')}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
