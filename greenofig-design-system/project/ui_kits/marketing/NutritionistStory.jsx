// Two-column nutritionist story.
function NutritionistStory() {
  const lines = [
    "I've spent 14 years walking with clients through real change —",
    "not crash diets, not 'biohacks',",
    "just careful nutrition built around their lives.",
    "GreenoFig is how I work with you, every week. — Dr. Rawan"
  ];
  return (
    <section className="section section-story">
      <div className="section-inner story-grid">
        <div className="portrait-wrap">
          <div className="portrait" style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=800&fit=crop&q=80)'
          }} />
          <div className="portrait-warm" />
          <div className="portrait-sig">
            <div style={{ font: '600 14px/1.2 var(--font-sans)', color: '#fafaf7' }}>Dr. Rawan Othman, RD</div>
            <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'rgba(250,250,247,0.7)' }}>Registered Dietitian · 14 years</div>
          </div>
        </div>

        <div className="story-text">
          <div className="eyebrow">FROM THE NUTRITIONIST</div>
          <h2 className="section-title" style={{ textAlign: 'left', maxWidth: '100%' }}>
            One <span className="grad">expert.</span><br/>
            Yours, weekly.
          </h2>
          <div className="story-lines">
            {lines.map((line, i) => (
              <div key={i} className="story-line" style={{ animationDelay: `${i * 0.08}s` }}>{line}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button className="btn btn-primary glow">Book Free Consultation</button>
            <button className="btn btn-outline-dark">Read Rawan's Story</button>
          </div>
        </div>
      </div>
    </section>
  );
}

window.NutritionistStory = NutritionistStory;
