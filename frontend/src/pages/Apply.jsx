import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';

const STEPS = ['Тип заявки', 'Личные данные', 'Дополнительно', 'Документы'];
const APP_TYPES = [
  { key: 'courses', icon: '📚', label: 'Курсы повышения квалификации' },
  { key: 'jobs', icon: '💼', label: 'Трудоустройство / Вакансии' },
  { key: 'research', icon: '🔬', label: 'Научные проекты и гранты' },
  { key: 'internship', icon: '🎓', label: 'Стажировка' },
];

export default function Apply() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState(null);
  const [type, setType] = useState('');
  const [personal, setPersonal] = useState({ first_name: '', last_name: '', iin: '', phone: '' });
  const [extra, setExtra] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setP = field => e => setPersonal(p => ({ ...p, [field]: e.target.value }));
  const setE = field => e => setExtra(x => ({ ...x, [field]: e.target.value }));

  const createDraft = async (selectedType) => {
    try {
      const { data } = await api.post('/api/applications', { type: selectedType, extra_data: {} });
      setAppId(data.id);
      setType(selectedType);
      setStep(1);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else setError('Ошибка создания заявки. Пожалуйста, войдите в систему.');
    }
  };

  const savePersonal = async () => {
    try {
      await api.patch(`/api/applications/${appId}`, { extra_data: { ...extra, ...personal } });
      setStep(2);
    } catch {
      setError('Ошибка сохранения данных');
    }
  };

  const saveExtra = async () => {
    try {
      await api.patch(`/api/applications/${appId}`, { extra_data: { ...personal, ...extra } });
      setStep(3);
    } catch {
      setError('Ошибка сохранения данных');
    }
  };

  const submitApp = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/applications/${appId}/submit`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при подаче заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 14 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 720, margin: '32px auto 60px', padding: '0 16px' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: 24, fontSize: 22 }}>Подача заявки</h2>

        {/* Progress bar */}
        <div style={{ display: 'flex', marginBottom: 28, background: '#fff', borderRadius: 8, padding: '4px', boxShadow: 'var(--shadow)' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', fontSize: 12, fontWeight: 600,
              borderBottom: `3px solid ${i === step ? 'var(--color-primary)' : i < step ? 'var(--color-success)' : 'var(--color-border)'}`,
              color: i === step ? 'var(--color-primary)' : i < step ? 'var(--color-success)' : '#aaa' }}>
              {i < step ? '✓ ' : `${i + 1}. `}{s}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: '28px 32px', boxShadow: 'var(--shadow)' }}>
          {error && <div style={{ background: '#fee2e2', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>{error}</div>}

          {/* Step 0: Type */}
          {step === 0 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 20, fontSize: 18 }}>Выберите тип заявки</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {APP_TYPES.map(({ key, icon, label }) => (
                  <button key={key} onClick={() => createDraft(key)}
                    style={{ padding: '20px 16px', border: '2px solid var(--color-border)', borderRadius: 8, background: '#fafbfd', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#f0f4ff'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = '#fafbfd'; }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>{label}</div>
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 20, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                Для подачи заявки требуется авторизация.{' '}
                <a href="/login" style={{ color: 'var(--color-primary)' }}>Войдите</a> или{' '}
                <a href="/register" style={{ color: 'var(--color-primary)' }}>зарегистрируйтесь</a>.
              </p>
            </div>
          )}

          {/* Step 1: Personal data */}
          {step === 1 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 20, fontSize: 18 }}>Личные данные</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>{t('form.last_name')}</label><input style={inputStyle} value={personal.last_name} onChange={setP('last_name')} /></div>
                  <div><label style={labelStyle}>{t('form.first_name')}</label><input style={inputStyle} value={personal.first_name} onChange={setP('first_name')} /></div>
                </div>
                <div><label style={labelStyle}>{t('form.phone')}</label><input style={inputStyle} value={personal.phone} onChange={setP('phone')} /></div>
                <div><label style={labelStyle}>{t('form.iin')}</label><input style={inputStyle} value={personal.iin} onChange={setP('iin')} maxLength={12} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button onClick={savePersonal} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
                  {t('form.next')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Extra */}
          {step === 2 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 20, fontSize: 18 }}>Дополнительные данные</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {type === 'courses' && (
                  <div><label style={labelStyle}>Название курса / направление</label>
                    <input style={inputStyle} value={extra.course_name || ''} onChange={setE('course_name')} /></div>
                )}
                {type === 'jobs' && (
                  <div><label style={labelStyle}>Желаемая должность</label>
                    <input style={inputStyle} value={extra.desired_position || ''} onChange={setE('desired_position')} /></div>
                )}
                {type === 'research' && (
                  <>
                    <div><label style={labelStyle}>Тема исследования</label>
                      <input style={inputStyle} value={extra.topic || ''} onChange={setE('topic')} /></div>
                    <div><label style={labelStyle}>Описание проекта</label>
                      <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={extra.description || ''} onChange={setE('description')} /></div>
                  </>
                )}
                {type === 'internship' && (
                  <div><label style={labelStyle}>Направление стажировки</label>
                    <input style={inputStyle} value={extra.direction || ''} onChange={setE('direction')} /></div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={{ background: '#fff', color: 'var(--color-primary)', border: '2px solid var(--color-primary)', padding: '11px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>← {t('form.back')}</button>
                <button onClick={saveExtra} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>{t('form.next')} →</button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 8, fontSize: 18 }}>Загрузка документов</h3>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Загрузите необходимые документы. Вы можете загрузить несколько файлов разных типов.</p>
              {appId && <FileUpload appId={appId} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setStep(2)} style={{ background: '#fff', color: 'var(--color-primary)', border: '2px solid var(--color-primary)', padding: '11px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>← {t('form.back')}</button>
                <button onClick={submitApp} disabled={submitting}
                  style={{ background: 'var(--color-success)', color: '#fff', border: 'none', padding: '11px 32px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Отправка...' : t('form.submit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
