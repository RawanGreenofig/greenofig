// FruitBackground — scroll-driven fruit-to-juice morph.
// Fixed viewport layer. As each fruit enters the scroll window, it rotates,
// falls, and its skin dissolves into a juice puddle with splash droplets.
function FruitBackground() {
  const fruits = [
    { x: 8,  pageY: 300,  hue: 'orange' },
    { x: 88, pageY: 700,  hue: 'lime'   },
    { x: 10, pageY: 1300, hue: 'red'    },
    { x: 85, pageY: 1800, hue: 'yellow' },
    { x: 12, pageY: 2500, hue: 'purple' },
    { x: 87, pageY: 3000, hue: 'green'  },
  ];

  const [scrollY, setScrollY] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div className="fruit-bg" aria-hidden="true">
      {fruits.map((f, i) => {
        const triggerStart = f.pageY - vh * 0.7;
        const triggerEnd   = f.pageY - vh * 0.05;
        const p = Math.max(0, Math.min(1, (scrollY - triggerStart) / Math.max(1, triggerEnd - triggerStart)));
        const visible = scrollY > triggerStart - 500 && scrollY < triggerEnd + 900;
        if (!visible) return null;

        const fall   = p * 200;
        const rot    = p * 480;
        const scale  = (1 - p * 0.3) * (p < 0.1 ? p * 10 : 1);

        return (
          <div key={i} className="fruit" style={{
            left: `${f.x}%`,
            top:  `${f.pageY - scrollY}px`,
            transform: `translateY(${fall}px) rotate(${rot}deg) scale(${scale})`,
            opacity: visible ? 1 : 0,
          }}>
            <FruitGlyph hue={f.hue} p={p} />
          </div>
        );
      })}
    </div>
  );
}

function FruitGlyph({ hue, p }) {
  const PAL = {
    orange: { skin:'#fb923c', hi:'#fed7aa', shadow:'#ea580c', juice:'#fdba74', stem:'#65a30d' },
    lime:   { skin:'#84cc16', hi:'#d9f99d', shadow:'#4d7c0f', juice:'#bef264', stem:'#365314' },
    red:    { skin:'#ef4444', hi:'#fecaca', shadow:'#b91c1c', juice:'#fca5a5', stem:'#65a30d' },
    yellow: { skin:'#facc15', hi:'#fef9c3', shadow:'#a16207', juice:'#fde047', stem:'#65a30d' },
    purple: { skin:'#a855f7', hi:'#e9d5ff', shadow:'#6b21a8', juice:'#d8b4fe', stem:'#65a30d' },
    green:  { skin:'#22c55e', hi:'#bbf7d0', shadow:'#15803d', juice:'#86efac', stem:'#365314' },
  }[hue];

  const skinOp  = Math.max(0, 1 - p * 1.4);
  const juiceOp = Math.max(0, (p - 0.3) / 0.7);
  const splashR = p * 46;

  return (
    <svg viewBox="0 0 100 100">
      {/* ── FRUIT SKIN ── */}
      <g style={{ opacity: skinOp }}>
        {/* body */}
        <ellipse cx="50" cy="56" rx="34" ry="36"
          fill={`url(#skin-${hue})`} />
        {/* highlight */}
        <ellipse cx="38" cy="41" rx="10" ry="13"
          fill="rgba(255,255,255,0.28)" />
        {/* stem */}
        <path d="M50 20 q-3-8-9-10" stroke={PAL.stem} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M50 20 q3-6 8-7"   stroke={PAL.stem} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="45" cy="18" rx="6" ry="3" fill={PAL.stem} transform="rotate(-18 45 18)"/>
        {/* skin gradient def */}
        <defs>
          <radialGradient id={`skin-${hue}`} cx="38%" cy="35%" r="65%">
            <stop offset="0%"   stopColor={PAL.hi}/>
            <stop offset="45%"  stopColor={PAL.skin}/>
            <stop offset="100%" stopColor={PAL.shadow}/>
          </radialGradient>
        </defs>
      </g>

      {/* ── JUICE PUDDLE ── */}
      <g style={{ opacity: juiceOp }}>
        {/* main pool */}
        <ellipse cx="50" cy="82" rx={splashR} ry={splashR * 0.36}
          fill={PAL.shadow} />
        <ellipse cx="50" cy="80" rx={splashR * 0.9} ry={splashR * 0.3}
          fill={PAL.juice} />
        {/* inner highlight */}
        <ellipse cx="44" cy="78" rx={splashR * 0.36} ry={splashR * 0.1}
          fill="rgba(255,255,255,0.5)" />

        {/* splash drops */}
        {[
          [-1.0,-0.6, 4.0], [ 1.1,-0.7, 3.6], [-0.55, 0.4, 3.0],
          [ 0.9, 0.5, 2.8], [ 0.0,-1.2, 3.4], [-1.4, 0.2, 2.6],
          [ 1.5, 0.1, 2.4], [-0.3, 0.9, 2.2],
        ].map(([dx, dy, sz], j) => (
          <ellipse key={j}
            cx={50 + dx * splashR * 0.72}
            cy={80 + dy * splashR * 0.34}
            rx={sz * p}
            ry={sz * p * 1.3}
            fill={j % 2 ? PAL.juice : PAL.shadow}
            transform={`rotate(${dx * 40} ${50 + dx * splashR * 0.72} ${80 + dy * splashR * 0.34})`}
          />
        ))}
      </g>
    </svg>
  );
}

window.FruitBackground = FruitBackground;
