import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';

const TYPE_LABELS = { courses: 'Курсы', jobs: 'Вакансии', research: 'Науч. проекты', internship: 'Стажировка' };

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/applications')
      .then(r => setApps(r.data.items || []))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: 'var(--color-primary)', fontSize: 24 }}>{t('nav.dashboard')}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>Ваши заявки и их статусы</p>
          </div>
          <button onClick={() => navigate('/apply')}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            + Новая заявка
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Загрузка...</p>
        ) : apps.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 10, padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Заявок пока нет</h3>
            <p style={{ color: '#888', marginBottom: 24 }}>Подайте первую заявку прямо сейчас</p>
            <button onClick={() => navigate('/apply')}
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
              Подать заявку
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#eef2fa' }}>
                  {['Тип заявки', 'Статус', 'Дата подачи', 'Создана', 'Комментарий'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f0f2f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-primary)' }}>{TYPE_LABELS[a.type] || a.type}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={a.status} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('ru') : '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{new Date(a.created_at).toLocaleDateString('ru')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#888', maxWidth: 200 }}>{a.admin_comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
