// Top bar — search + notifications + avatar.
function Topbar({ title }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1 style={{ font: '700 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ font: '400 13px/1 var(--font-sans)', color: '#64748b', marginTop: 4 }}>
          Good morning, Sarah · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="topbar-actions">
        <div className="topbar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input placeholder="Search recipes, plans, messages..." />
          <kbd>⌘K</kbd>
        </div>
        <button className="topbar-icon-btn" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="topbar-dot" />
        </button>
        <button className="topbar-avatar">
          <span style={{ background: 'linear-gradient(135deg, #84cc16, #f59e0b)' }}>SA</span>
        </button>
      </div>
    </header>
  );
}

window.Topbar = Topbar;
