// Stats — count-up numbers with photographic clip-path reveal behind.
function Stats() {
  const stats = [
    { n: '2,400+', l: 'clients guided',          img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop&q=80' },
    { n: '47',    l: 'organic ingredients',      img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop&q=80' },
    { n: '0g',    l: 'artificial sugar',         img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop&q=80' },
    { n: '98%',   l: 'client satisfaction',      img: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop&q=80' },
  ];
  return (
    <section className="section section-stats">
      <div className="section-inner">
        <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>BY THE NUMBERS</div>
        <h2 className="section-title">Real outcomes.<br/>Not marketing math.</h2>

        <div className="stats-grid">
          {stats.map((s, i) => (
            <div key={s.n} className="stat" style={{ animationDelay: `${i * 0.12}s` }}>
              <div className="stat-img" style={{ backgroundImage: `url(${s.img})` }} />
              <div className="stat-overlay" />
              <div className="stat-num">{s.n}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.Stats = Stats;
