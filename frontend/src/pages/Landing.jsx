import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const APP_TYPES = [
  { key: 'courses', icon: '📚' },
  { key: 'jobs', icon: '💼' },
  { key: 'research', icon: '🔬' },
  { key: 'internship', icon: '🎓' },
];

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <Navbar />
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #102550 100%)', color: '#fff', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, maxWidth: 700, margin: '0 auto 16px' }}>
          {t('landing.hero_title')}
        </h1>
        <p style={{ fontSize: 18, color: '#b8cff0', marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
          {t('landing.hero_subtitle')}
        </p>
        <button onClick={() => navigate('/apply')}
          style={{ background: 'var(--color-accent)', color: '#1a3a6b', border: 'none', padding: '14px 36px', borderRadius: 6, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          {t('landing.apply_btn')}
        </button>
      </section>

      {/* App types */}
      <section style={{ maxWidth: 900, margin: '60px auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: 32, fontSize: 26 }}>
          {t('landing.types_title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {APP_TYPES.map(({ key, icon }) => (
            <div key={key} onClick={() => navigate('/apply')}
              style={{ background: '#fff', borderRadius: 10, padding: '28px 20px', textAlign: 'center', boxShadow: 'var(--shadow)', cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
              <h3 style={{ color: 'var(--color-primary)', fontSize: 15, fontWeight: 700 }}>{t(`app_types.${key}`)}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--color-primary)', color: '#8aaad0', textAlign: 'center', padding: '24px', marginTop: 60, fontSize: 13 }}>
        © 2025 НАО «Алтынсарина» — Портал подачи заявок
      </footer>
    </div>
  );
}
