import { useTranslation } from 'react-i18next';

const COLORS = {
  draft: { bg: '#f8f9fa', color: '#555' },
  pending: { bg: '#fff3cd', color: '#856404' },
  approved: { bg: '#d1fae5', color: '#065f46' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const { bg, color } = COLORS[status] || COLORS.draft;
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
      {t(`status.${status}`)}
    </span>
  );
}
