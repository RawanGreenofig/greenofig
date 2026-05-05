// Dashboard — stat cards + today's plan + streak + quick actions.
function Dashboard() {
  const stats = [
    { label: 'Calories',  value: '1,240', target: '/ 1,840', icon: 'flame', color: '#f97316', pct: 67 },
    { label: 'Protein',   value: '78g',   target: '/ 120g',  icon: 'target', color: '#3b82f6', pct: 65 },
    { label: 'Water',     value: '2.4L',  target: '/ 3.0L',  icon: 'drop', color: '#06b6d4', pct: 80 },
    { label: 'Sleep',     value: '7h 24m', target: '/ 8h',   icon: 'moon', color: '#a855f7', pct: 92 },
  ];
  return (
    <div className="page">
      <div className="dash-grid">
        {stats.map((s) => (
          <div key={s.label} className="card stat-card">
            <div className="stat-head">
              <div className="stat-ic" style={{ background: s.color + '15', color: s.color }}>
                <DashIcon name={s.icon} />
              </div>
              <span style={{ font: '500 12px/1 var(--font-sans)', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div className="stat-val">{s.value}<span style={{ font: '400 13px var(--font-sans)', color: '#64748b', marginLeft: 4 }}>{s.target}</span></div>
            <div className="stat-bar"><div className="stat-bar-fill" style={{ width: s.pct + '%', background: s.color }}/></div>
          </div>
        ))}
      </div>

      <div className="dash-row">
        {/* Today's plan */}
        <div className="card" style={{ flex: 2 }}>
          <div className="card-head">
            <h3 style={{ font: '600 18px/1.3 var(--font-sans)' }}>Today's Plan</h3>
            <button className="link-btn">View all <ArrowR/></button>
          </div>
          <div className="meals">
            {[
              { time: '08:00', name: 'Greek Yogurt Bowl', kcal: 320, tag: 'Breakfast', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop&q=80', done: true },
              { time: '12:30', name: 'Quinoa Power Salad', kcal: 480, tag: 'Lunch',     img: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=200&h=200&fit=crop&q=80', done: true },
              { time: '15:30', name: 'Apple & Almond Butter', kcal: 240, tag: 'Snack',  img: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&h=200&fit=crop&q=80', done: false },
              { time: '19:00', name: 'Grilled Salmon, Greens', kcal: 540, tag: 'Dinner', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200&h=200&fit=crop&q=80', done: false },
            ].map((m) => (
              <div key={m.time} className={`meal-row ${m.done ? 'done' : ''}`}>
                <div className="meal-time">{m.time}</div>
                <div className="meal-img" style={{ backgroundImage: `url(${m.img})` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ font: '600 14px/1.3 var(--font-sans)', color: '#0f172a' }}>{m.name}</span>
                    <span className="tag-pill">{m.tag}</span>
                  </div>
                  <div style={{ font: '400 12px/1.4 var(--font-sans)', color: '#64748b', marginTop: 2 }}>{m.kcal} kcal · 28g protein · 12g fat</div>
                </div>
                <button className={`meal-check ${m.done ? 'done' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Streak + upgrade */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          <div className="card streak-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14a8 8 0 0 0 16 0C20 9.33 17.85 5.5 13.5.67z"/></svg>
              </div>
              <div>
                <div style={{ font: '600 14px/1 var(--font-sans)' }}>Streak</div>
                <div style={{ font: '400 12px/1 var(--font-sans)', color: '#64748b', marginTop: 2 }}>Keep it going!</div>
              </div>
            </div>
            <div style={{ font: '700 36px/1 var(--font-sans)', letterSpacing: '-0.02em' }}>7 <span style={{ font: '400 14px/1 var(--font-sans)', color: '#64748b' }}>days</span></div>
            <div className="streak-dots">
              {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`dot ${i < 7 ? 'dot-on' : ''}`} />)}
            </div>
          </div>
          <div className="card upgrade-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ font: '700 15px/1.2 var(--font-sans)' }}>Upgrade to Premium</div>
              <span className="badge-pro">PRO</span>
            </div>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: '#475569', margin: '0 0 14px' }}>
              Unlock unlimited AI coaching, nutritionist access, and full meal planning.
            </p>
            <button className="btn btn-primary glow">Upgrade — $19/mo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowR() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>; }
function DashIcon({ name }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'flame': return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
    case 'target': return <svg {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'drop': return <svg {...props}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
    case 'moon': return <svg {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
  }
}

window.Dashboard = Dashboard;
