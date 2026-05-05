// Section 2 cinematic centerpiece — final-state composition.
// Real impl uses GSAP+R3F with 500vh pinned scroll; this renders the
// "all ingredients converged" look + interactive ingredient highlight.
function IngredientShowcase() {
  const ingredients = [
    { name: 'Spirulina',  tag: 'Detox & Energy',  src: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300&h=300&fit=crop&q=80', color: '#16a34a' },
    { name: 'Wild Berries',  tag: 'Antioxidants', src: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=300&h=300&fit=crop&q=80', color: '#7c3aed' },
    { name: 'Avocado',  tag: 'Healthy Fats',     src: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop&q=80', color: '#65a30d' },
    { name: 'Turmeric',  tag: 'Anti-inflammatory', src: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&h=300&fit=crop&q=80', color: '#f59e0b' },
  ];
  const [active, setActive] = React.useState(0);
  const a = ingredients[active];

  return (
    <section className="section section-showcase" style={{ '--accent': a.color }}>
      <div className="section-inner showcase-grid">
        <div className="showcase-stage">
          {/* The 3D bottle — mocked as a CSS jar */}
          <div className="bottle">
            <div className="bottle-cap" />
            <div className="bottle-body">
              <div className="bottle-label">
                <img src="../../assets/logo.png" alt="" style={{ height: 24 }} />
                <div style={{ font: '700 11px/1 var(--font-sans)', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0d1a12', marginTop: 6 }}>Daily Greens</div>
                <div style={{ font: '400 9px/1.3 var(--font-sans)', color: '#64748b', marginTop: 4 }}>30 servings · 18 organic ingredients</div>
              </div>
            </div>
            <div className="bottle-shadow" />
          </div>

          {/* Orbiting ingredients */}
          {ingredients.map((ing, i) => (
            <div
              key={ing.name}
              className={`orbit orbit-${i} ${i === active ? 'orbit-active' : ''}`}
              style={{ backgroundImage: `url(${ing.src})` }}
              onMouseEnter={() => setActive(i)}
            />
          ))}

          {/* Burst light */}
          <div className="burst" style={{ background: `radial-gradient(circle, ${a.color}40 0%, transparent 60%)` }} />
        </div>

        <div className="showcase-text">
          <div className="eyebrow" style={{ color: a.color }}>The Centerpiece</div>
          <h2 className="section-title" style={{ textAlign: 'left' }}>
            47 organic ingredients<br/>in <span style={{ color: a.color }}>one</span> daily ritual.
          </h2>
          <p className="section-sub" style={{ textAlign: 'left', margin: '16px 0 24px' }}>
            Each ingredient is sourced, third-party tested, and dosed by your nutritionist.
            Hover any element to learn what it does for you.
          </p>

          <div className="ingredient-detail" key={a.name}>
            <div className="ingredient-detail-name">{a.name}</div>
            <div className="ingredient-detail-tag" style={{ color: a.color }}>{a.tag}</div>
          </div>

          <div className="ingredient-list">
            {ingredients.map((ing, i) => (
              <button key={ing.name} className={`ing-pill ${i === active ? 'active' : ''}`}
                onClick={() => setActive(i)}
                style={i === active ? { borderColor: ing.color, color: ing.color, background: ing.color + '15' } : {}}>
                {ing.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

window.IngredientShowcase = IngredientShowcase;
