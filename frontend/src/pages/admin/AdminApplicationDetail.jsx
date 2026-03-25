import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';

const TYPE_LABELS = { courses: 'Курсы повышения квалификации', jobs: 'Вакансии', research: 'Научные проекты', internship: 'Стажировка' };
const EXTRA_LABELS = {
  first_name: 'Имя', last_name: 'Фамилия', phone: 'Телефон', iin: 'ИИН',
  course_name: 'Курс', desired_position: 'Желаемая должность', topic: 'Тема', description: 'Описание', direction: 'Направление'
};

export default function AdminApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [docs, setDocs] = useState([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const reload = () => {
    api.get(`/api/admin/applications/${id}`).then(r => setApp(r.data));
    api.get(`/api/applications/${id}/documents`).then(r => setDocs(r.data)).catch(() => {});
  };

  useEffect(() => { reload(); }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    setSaved('');
    try {
      await api.patch(`/api/admin/applications/${id}/status`, { status, comment });
      setSaved(status === 'approved' ? 'Заявка одобрена' : 'Заявка отклонена');
      reload();
    } catch {
      setSaved('Ошибка при изменении статуса');
    } finally {
      setSaving(false);
    }
  };

  const downloadDoc = async (doc) => {
    const resp = await api.get(`/api/documents/${doc.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!app) return (
    <div><Navbar /><p style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Загрузка...</p></div>
  );

  const card = { background: '#fff', borderRadius: 10, padding: '24px 28px', boxShadow: 'var(--shadow)', marginBottom: 20 };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '28px auto 60px', padding: '0 16px' }}>
        <button onClick={() => navigate('/admin')}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 16, padding: 0 }}>
          ← Назад к списку
        </button>

        {/* Header */}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: 'var(--color-primary)', fontSize: 20 }}>
              {TYPE_LABELS[app.type] || app.type}
            </h3>
            <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>ID: {app.id}</p>
            {app.submitted_at && (
              <p style={{ color: '#888', fontSize: 13 }}>Подана: {new Date(app.submitted_at).toLocaleString('ru')}</p>
            )}
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Extra data */}
        {Object.keys(app.extra_data || {}).length > 0 && (
          <div style={card}>
            <h4 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Данные заявки</h4>
            <table style={{ fontSize: 14, width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(app.extra_data).filter(([, v]) => v).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f0f2f8' }}>
                    <td style={{ padding: '8px 0', color: '#888', width: '40%', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>
                      {EXTRA_LABELS[k] || k}
                    </td>
                    <td style={{ padding: '8px 0', color: '#333' }}>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Admin comment */}
        {app.admin_comment && (
          <div style={{ ...card, background: '#fef9e7', border: '1px solid #fde68a' }}>
            <h4 style={{ color: '#856404', marginBottom: 8 }}>Комментарий администратора</h4>
            <p style={{ color: '#555', fontSize: 14 }}>{app.admin_comment}</p>
          </div>
        )}

        {/* Documents */}
        <div style={card}>
          <h4 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Документы ({docs.length})</h4>
          {docs.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>Документы не загружены</p>
          ) : docs.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '10px 14px', background: '#f8faff', borderRadius: 6, border: '1px solid #e8eeff' }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.original_filename}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{d.document_type} · {(d.file_size / 1024).toFixed(0)} KB</div>
              </div>
              <button onClick={() => downloadDoc(d)}
                style={{ background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', padding: '5px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ⬇ Скачать
              </button>
            </div>
          ))}
        </div>

        {/* Status management */}
        {app.status === 'pending' && (
          <div style={card}>
            <h4 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Принять решение</h4>
            {saved && (
              <div style={{ padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 14,
                background: saved.includes('Ошибка') ? '#fee2e2' : '#d1fae5',
                color: saved.includes('Ошибка') ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {saved}
              </div>
            )}
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Комментарий для заявителя (необязательно)"
              rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', marginBottom: 16, resize: 'vertical', fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => updateStatus('approved')} disabled={saving}
                style={{ background: 'var(--color-success)', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                ✓ Одобрить
              </button>
              <button onClick={() => updateStatus('rejected')} disabled={saving}
                style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                ✗ Отклонить
              </button>
            </div>
          </div>
        )}

        {/* Already decided */}
        {app.status !== 'pending' && app.status !== 'draft' && (
          <div style={{ ...card, background: '#f8f9fa', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: 14 }}>Решение по заявке уже принято.</p>
          </div>
        )}
      </div>
    </div>
  );
}
