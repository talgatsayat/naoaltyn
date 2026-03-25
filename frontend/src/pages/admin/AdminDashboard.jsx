import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';

const FILTERS = ['all', 'pending', 'approved', 'rejected'];
const TYPE_LABELS = { courses: 'Курсы', jobs: 'Вакансии', research: 'Научные проекты', internship: 'Стажировка' };
const TYPE_ICONS = { courses: '📚', jobs: '💼', research: '🔬', internship: '🎓' };

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async (status, type) => {
    setLoading(true);
    const params = {};
    if (status !== 'all') params.status = status;
    if (type !== 'all') params.type = type;
    try {
      const { data } = await api.get('/api/admin/applications', { params });
      setApps(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter, typeFilter); }, [filter, typeFilter]);

  const sidebarItemStyle = (active) => ({
    padding: '10px 16px', color: active ? '#fff' : '#a8c4e0', fontSize: 13, cursor: 'pointer',
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
    transition: 'all 0.2s'
  });

  return (
    <div>
      <Navbar />
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <aside style={{ background: 'var(--color-primary)', paddingTop: 16 }}>
          <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#6a9cc0', textTransform: 'uppercase', letterSpacing: 1 }}>
            Администратор
          </div>
          <div style={sidebarItemStyle(typeFilter === 'all')} onClick={() => setTypeFilter('all')}>
            📋 Все заявки ({total})
          </div>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <div key={key} style={sidebarItemStyle(typeFilter === key)} onClick={() => setTypeFilter(key)}>
              {TYPE_ICONS[key]} {label}
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ padding: 24, background: '#f7f9fc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: 'var(--color-primary)', fontSize: 20 }}>
              {typeFilter === 'all' ? 'Все заявки' : TYPE_LABELS[typeFilter]} — {total} шт.
            </h3>
          </div>

          {/* Status filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid var(--color-border)', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  background: filter === f ? 'var(--color-primary)' : '#fff',
                  color: filter === f ? '#fff' : '#555' }}>
                {f === 'all' ? 'Все статусы' : t(`status.${f}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: '#aaa', padding: 40, textAlign: 'center' }}>Загрузка...</p>
          ) : apps.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
              <p style={{ color: '#aaa', fontSize: 16 }}>Заявок не найдено</p>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#eef2fa' }}>
                    {['ID', 'Тип заявки', 'Дата подачи', 'Статус', 'Действие'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f0f2f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                      <td style={{ padding: '11px 14px', fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{a.id.slice(0, 8)}…</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {TYPE_ICONS[a.type]} {TYPE_LABELS[a.type] || a.type}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: '#666' }}>
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('ru') : '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}><StatusBadge status={a.status} /></td>
                      <td style={{ padding: '11px 14px' }}>
                        <button onClick={() => navigate(`/admin/applications/${a.id}`)}
                          style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Открыть →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
