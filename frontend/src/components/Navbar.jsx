import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const LANGS = ['ru', 'kz', 'en'];

const navStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--color-primary)', padding: '0 24px', height: 60,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100
};

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('access_token');

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>
        НАО <span style={{ color: 'var(--color-accent)' }}>Алтынсарина</span>
      </Link>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <Link to="/" style={{ color: '#cde', fontSize: 14 }}>{t('nav.home')}</Link>
        {isLoggedIn && <Link to="/dashboard" style={{ color: '#cde', fontSize: 14 }}>{t('nav.dashboard')}</Link>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {LANGS.map(l => (
          <button key={l}
            onClick={() => i18n.changeLanguage(l)}
            style={{
              background: i18n.language === l ? 'var(--color-accent)' : 'transparent',
              color: i18n.language === l ? '#1a3a6b' : '#cde',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4, padding: '3px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}>
            {l.toUpperCase()}
          </button>
        ))}
        {isLoggedIn
          ? <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>{t('nav.logout')}</button>
          : <>
              <Link to="/login" style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', padding: '7px 16px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14, marginLeft: 8 }}>{t('nav.login')}</Link>
              <Link to="/register" style={{ color: '#1a3a6b', background: 'var(--color-accent)', padding: '7px 16px', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 14 }}>{t('nav.register')}</Link>
            </>
        }
      </div>
    </nav>
  );
}
