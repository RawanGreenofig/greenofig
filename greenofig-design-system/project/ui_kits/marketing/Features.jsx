// 4-up feature grid — hand-drawn natural icons (no AI bot).
function Features() {
  const features = [
    { icon: 'calendar-heart', title: 'Weekly Check-ins', body: 'A real conversation with your nutritionist every week — adjustments, encouragement, and accountability.', tint: 'lime' },
    { icon: 'leaf-bowl',      title: 'Custom Meal Plans', body: 'Plans built around your tastes, allergies, and routine. Updated as your goals evolve.', tint: 'amber' },
    { icon: 'sun-run',        title: 'Movement Routines', body: 'Workouts paired with your meal plan so nutrition and effort work together — not against each other.', tint: 'terracotta' },
    { icon: 'sprout-line',    title: 'Honest Progress', body: 'Track weight, measurements, sleep, and habits. See the picture beyond the scale.', tint: 'forest' },
  ];
  const tintMap = {
    lime:       { bg: 'rgba(132,204,22,0.12)',  fg: '#4d7c0f' },
    amber:      { bg: 'rgba(245,158,11,0.12)',  fg: '#b45309' },
    terracotta: { bg: 'rgba(234,88,12,0.10)',   fg: '#c2410c' },
    forest:     { bg: 'rgba(13,58,46,0.10)',    fg: '#0f3a2e' },
  };
  return (
    <section className="section section-features" id="features">
      <div className="section-inner">
        <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 16 }}>FEATURES</div>
        <h2 className="section-title">Everything you need to <span className="grad">eat better.</span></h2>
        <p className="section-sub">A complete wellness practice in one place — built around you.</p>

        <div className="feature-grid">
          {features.map((f, i) => (
            <div key={f.title} className="feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-icon" style={{ background: tintMap[f.tint].bg, color: tintMap[f.tint].fg }}>
                <FeatureIcon name={f.icon} />
              </div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-body">{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ name }) {
  const p = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'calendar-heart':
      // Calendar with a small leaf-heart inside — nutritionist check-in
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2.5"/>
          <path d="M3 10h18M8 3v4M16 3v4"/>
          <path d="M12 18s-3-1.7-3-3.6c0-1 .8-1.8 1.8-1.8.6 0 1 .3 1.2.7.2-.4.6-.7 1.2-.7 1 0 1.8.8 1.8 1.8 0 1.9-3 3.6-3 3.6Z"/>
        </svg>
      );
    case 'leaf-bowl':
      // Bowl with a leaf rising out — meal plan
      return (
        <svg {...p}>
          <path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8Z"/>
          <path d="M12 11c0-3 1.5-5.5 5-7-.5 4-2 6-5 7Z"/>
          <path d="M12 11c-.5-2-1.8-3.5-4-4.5"/>
        </svg>
      );
    case 'sun-run':
      // Sunrise + footprint — movement & morning routine
      return (
        <svg {...p}>
          <path d="M3 18h18"/>
          <circle cx="12" cy="13" r="4"/>
          <path d="M2 13h2M20 13h2M5.6 6.6l1.4 1.4M17 8l1.4-1.4M12 4v2"/>
        </svg>
      );
    case 'sprout-line':
      // Growing sprout above a baseline — honest progress
      return (
        <svg {...p}>
          <path d="M3 20h18"/>
          <path d="M12 20V11"/>
          <path d="M12 11c0-3 2-5 5-5-.5 3-2 5-5 5Z"/>
          <path d="M12 14c0-2-1.5-3.5-4-3.5.5 2.5 2 3.5 4 3.5Z"/>
        </svg>
      );
  }
}

window.Features = Features;
