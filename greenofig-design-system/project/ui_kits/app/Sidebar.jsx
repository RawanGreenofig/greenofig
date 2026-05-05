// Sidebar — fixed left, 256px wide, lime-active state.
function Sidebar({ active, onNav }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'coach',     label: 'AI Coach',  icon: 'bot' },
    { id: 'meals',     label: 'Meal Plans', icon: 'utensils' },
    { id: 'fitness',   label: 'Fitness',   icon: 'dumbbell' },
    { id: 'progress',  label: 'Progress',  icon: 'trend' },
    { id: 'messages',  label: 'Messages',  icon: 'message', badge: 2 },
    { id: 'appts',     label: 'Appointments', icon: 'calendar' },
  ];
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src="../../assets/logo.png" alt="" style={{ height: 32 }} />
        <span style={{ font: '700 17px/1 var(--font-sans)', letterSpacing: '-0.02em' }}>
          Greeno<span className="grad">Fig</span>
        </span>
      </div>

      <nav className="sb-nav">
        <div className="sb-section-label">Wellness</div>
        {items.map((it) => (
          <button key={it.id}
            className={`sb-item ${active === it.id ? 'sb-item-active' : ''}`}
            onClick={() => onNav(it.id)}>
            <SBIcon name={it.icon} />
            <span>{it.label}</span>
            {it.badge && <span className="sb-badge">{it.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="sb-upgrade">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#84cc16"><path d="M12 2L9 9 2 9.5l5.5 4.5L6 22l6-3.5L18 22l-1.5-8L22 9.5 15 9z"/></svg>
          <span style={{ font: '600 13px/1 var(--font-sans)', color: '#0f172a' }}>Upgrade to Premium</span>
        </div>
        <p style={{ font: '400 12px/1.5 var(--font-sans)', color: '#64748b', margin: '0 0 10px' }}>
          Unlock unlimited AI coaching, nutritionist access, and meal planning.
        </p>
        <button className="sb-upgrade-btn">Upgrade</button>
      </div>

      <div className="sb-foot">
        <button className="sb-item sb-item-sm"><SBIcon name="settings" /><span>Settings</span></button>
        <button className="sb-item sb-item-sm"><SBIcon name="help" /><span>Help</span></button>
      </div>
    </aside>
  );
}

function SBIcon({ name }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'grid': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'bot': return <svg {...props}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>;
    case 'utensils': return <svg {...props}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/></svg>;
    case 'dumbbell': return <svg {...props}><path d="M14.4 14.4l2.7 2.7M9.6 9.6L6.9 6.9M6.9 17.1l2.7-2.7M14.4 9.6l2.7-2.7M2 12h2M20 12h2M12 2v2M12 20v2"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'trend': return <svg {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
    case 'message': return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'help': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  }
}

window.Sidebar = Sidebar;
