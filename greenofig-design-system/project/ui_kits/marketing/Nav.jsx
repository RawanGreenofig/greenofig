// Top navigation. Transparent at rest, glass-effect after scroll.
function Nav({ scrolled }) {
  const items = ['Features', 'Pricing', 'Reviews', 'Blog'];
  return (
    <nav
      className={`site-nav ${scrolled ? 'glass shadow-glass' : ''}`}
      style={{ padding: scrolled ? '14px 32px' : '22px 32px' }}
    >
      <div className="site-nav-inner">
        <a href="#" className="site-nav-brand">
          <img src="../../assets/logo.png" alt="GreenoFig" style={{ height: 40, width: 'auto' }} />
          <span style={{ font: "700 20px/1 var(--font-sans)", letterSpacing: '-0.02em', color: scrolled ? 'var(--gf-ink)' : '#fafaf7' }}>
            Greeno<span className="grad">Fig</span>
          </span>
        </a>
        <div className="site-nav-links">
          {items.map((it) => (
            <a key={it} href={`#${it.toLowerCase()}`}
              style={{ font: "500 14px/1 var(--font-sans)", color: scrolled ? 'var(--fg-2)' : 'rgba(250,250,247,0.85)', transition: 'color 200ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = scrolled ? 'var(--gf-lime-500)' : '#a3e635')}
              onMouseLeave={(e) => (e.currentTarget.style.color = scrolled ? 'var(--fg-2)' : 'rgba(250,250,247,0.85)')}
            >{it}</a>
          ))}
        </div>
        <div className="site-nav-cta">
          <button className="btn-ghost-light" style={{ color: scrolled ? 'var(--fg-1)' : '#fafaf7' }}>Sign in</button>
          <button className="btn-pill-primary">Get Started
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

window.Nav = Nav;
