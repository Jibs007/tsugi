const MAP = {
  completed: { bg: '#16a34a22', color: '#4ade80', label: 'Completed' },
  airing:    { bg: '#0ea5e922', color: '#38bdf8', label: 'Airing' },
  upcoming:  { bg: '#d9770622', color: '#fbbf24', label: 'Upcoming' },
};

export default function StatusBadge({ status, small }) {
  const s = MAP[status] || { bg: '#ffffff11', color: '#888', label: status };
  return (
    <span
      style={{
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        borderRadius: 4,
        padding: small ? '2px 6px' : '3px 8px',
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
}
