import { useState, useRef } from 'react';
import api from '../api/client';

const DOC_TYPES = [
  { value: 'id', label: 'Удостоверение личности / паспорт' },
  { value: 'diploma', label: 'Диплом об образовании' },
  { value: 'cv', label: 'Резюме / CV' },
  { value: 'certificate', label: 'Сертификаты' },
  { value: 'workbook', label: 'Трудовая книжка' },
  { value: 'photo', label: 'Фото 3×4' },
];

export default function FileUpload({ appId }) {
  const [uploaded, setUploaded] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [docType, setDocType] = useState('id');
  const inputRef = useRef();

  const upload = async (file) => {
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('document_type', docType);
    formData.append('file', file);
    try {
      const { data } = await api.post(`/api/applications/${appId}/documents`, formData);
      setUploaded(u => [...u, data]);
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      inputRef.current.value = '';
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Тип документа</label>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
          {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div
        onClick={() => inputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ border: '2px dashed var(--color-border)', borderRadius: 8, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#f8faff', marginBottom: 12, transition: 'border-color 0.2s' }}
        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
        <p style={{ color: '#666', fontSize: 14, fontWeight: 500 }}>Нажмите для выбора или перетащите файл</p>
        <span style={{ fontSize: 12, color: '#aaa' }}>PDF, JPG, PNG · до 10 МБ</span>
      </div>

      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
        onChange={e => e.target.files[0] && upload(e.target.files[0])} />

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 8, padding: '8px 12px', background: '#fee2e2', borderRadius: 5 }}>{error}</p>}
      {uploading && <p style={{ fontSize: 13, color: '#888', padding: '8px 12px' }}>⏳ Загрузка...</p>}

      {uploaded.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0f4ff', border: '1px solid #dae4ff', borderRadius: 5, padding: '8px 12px', fontSize: 13, marginBottom: 6 }}>
          <span>📄</span>
          <span style={{ flex: 1 }}>{d.original_filename}</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ Загружен</span>
        </div>
      ))}
    </div>
  );
}
