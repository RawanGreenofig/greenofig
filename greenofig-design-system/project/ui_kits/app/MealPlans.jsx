// Meal plans — week + day-by-day.
function MealPlans() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const [active, setActive] = React.useState(2);
  return (
    <div className="page">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ font: '600 12px/1 var(--font-sans)', color: '#65a30d', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Active plan</div>
            <h2 style={{ font: '700 24px/1.2 var(--font-sans)', marginTop: 6 }}>Mediterranean Reset · Week 3</h2>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: '#64748b', marginTop: 4 }}>1,840 kcal · 120g protein · 3.0L water · prepared by Dr. Layla</p>
          </div>
          <button className="btn-outline-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Download
          </button>
        </div>
        <div className="day-strip">
          {days.map((d, i) => (
            <button key={d} className={`day ${i === active ? 'day-active' : ''}`} onClick={() => setActive(i)}>
              <span style={{ font: '500 11px/1 var(--font-sans)', color: i === active ? '#fff' : '#64748b' }}>{d}</span>
              <span style={{ font: '700 18px/1 var(--font-sans)', marginTop: 4 }}>{12 + i}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
        {[
          { tag: 'Breakfast', name: 'Greek Yogurt Bowl', kcal: 320, time: '15 min', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop&q=80', tags: ['High protein','Quick'] },
          { tag: 'Lunch', name: 'Quinoa Power Salad', kcal: 480, time: '20 min', img: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=300&fit=crop&q=80', tags: ['Vegetarian','Fiber'] },
          { tag: 'Snack', name: 'Apple & Almond Butter', kcal: 240, time: '2 min', img: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=300&fit=crop&q=80', tags: ['No-cook'] },
          { tag: 'Dinner', name: 'Grilled Salmon & Greens', kcal: 540, time: '25 min', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&q=80', tags: ['Omega-3','High protein'] },
        ].map((m) => (
          <div key={m.name} className="card meal-card">
            <div className="meal-img-lg" style={{ backgroundImage: `url(${m.img})` }}>
              <span className="tag-pill" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.9)' }}>{m.tag}</span>
            </div>
            <div style={{ padding: 16 }}>
              <h4 style={{ font: '600 16px/1.3 var(--font-sans)' }}>{m.name}</h4>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, font: '400 12px/1 var(--font-sans)', color: '#64748b' }}>
                <span>{m.kcal} kcal</span><span>·</span><span>{m.time}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {m.tags.map((t) => <span key={t} className="meal-mini-tag">{t}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.MealPlans = MealPlans;
