// Hero — deep-green frame, two-word Fraunces split headline,
// floating ingredient cutouts in the 4 corners.
function Hero() {
  return (
    <section className="hero-frame">
      <div className="hero-inner">
        {/* Floating glass info cards in the corners (Reference 4 style) */}
        <FloatCard pos="tl" delay={0}>
          <div className="float-icon" style={{ background: 'rgba(163,230,53,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <div style={{ font: '600 12px/1.2 var(--font-sans)', color: '#fafaf7' }}>Today's plan</div>
            <div style={{ font: '400 11px/1.3 var(--font-sans)', color: 'rgba(250,250,247,0.6)' }}>Mediterranean · 1,840 kcal</div>
          </div>
        </FloatCard>

        <FloatCard pos="tr" delay={0.4}>
          <div className="float-icon" style={{ background: 'rgba(245,158,11,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg>
          </div>
          <div>
            <div style={{ font: '600 12px/1.2 var(--font-sans)', color: '#fafaf7' }}>4.9 / 5</div>
            <div style={{ font: '400 11px/1.3 var(--font-sans)', color: 'rgba(250,250,247,0.6)' }}>50K+ users</div>
          </div>
        </FloatCard>

        <FloatCard pos="bl" delay={0.6}>
          <div className="float-icon" style={{ background: 'rgba(132,204,22,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div>
            <div style={{ font: '600 12px/1.2 var(--font-sans)', color: '#fafaf7' }}>+2.1 kg lean</div>
            <div style={{ font: '400 11px/1.3 var(--font-sans)', color: 'rgba(250,250,247,0.6)' }}>Last 30 days</div>
          </div>
        </FloatCard>

        <FloatCard pos="br" delay={0.2}>
          <div className="float-icon" style={{ background: 'rgba(14,165,233,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><path d="M12 2v6M12 22v-2M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h2M20 12h2"/></svg>
          </div>
          <div>
            <div style={{ font: '600 12px/1.2 var(--font-sans)', color: '#fafaf7' }}>2.4L</div>
            <div style={{ font: '400 11px/1.3 var(--font-sans)', color: 'rgba(250,250,247,0.6)' }}>Hydrated · 8/10</div>
          </div>
        </FloatCard>

        {/* Floating ingredient photos */}
        <Ingredient src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop&q=80" pos="ing-1" />
        <Ingredient src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop&q=80" pos="ing-2" />
        <Ingredient src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&h=400&fit=crop&q=80" pos="ing-3" />

        <div className="hero-eyebrow">Nutritionist-Led · Real Results</div>

        <h1 className="hero-headline">
          <span className="hero-word hero-word-l">Eat</span>
          <span className="hero-word hero-word-r grad">Better.</span>
        </h1>

        <p className="hero-sub">
          Personalized meal plans, weekly one-on-one consultations, and ongoing guidance from a certified nutritionist — for real, sustainable change.
        </p>

        <div className="hero-ctas">
          <button className="btn btn-primary btn-lg glow">Start 14-day Free Trial
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
          <button className="btn btn-glass btn-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            Watch Demo
          </button>
        </div>

        <div className="hero-trust">No credit card required · cancel anytime</div>
      </div>
    </section>
  );
}

function FloatCard({ pos, delay, children }) {
  return (
    <div className={`float-card float-${pos}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function Ingredient({ src, pos }) {
  return <div className={`ingredient ${pos}`} style={{ backgroundImage: `url(${src})` }} />;
}

window.Hero = Hero;
