export default function KpiCard({ label, value, icon, bg, accent }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: 20,
      border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: accent, marginTop: 8, letterSpacing: -0.5 }}>
        {value}
      </div>
    </div>
  );
}
