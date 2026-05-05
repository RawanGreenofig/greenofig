// AI Coach — chat interface, lime accents.
function AICoach() {
  const messages = [
    { role: 'assistant', text: "Good morning, Sarah! I see you logged a great breakfast — 320 kcal Greek yogurt bowl. How are you feeling about today's plan?" },
    { role: 'user', text: "Feeling good! Lunch is the quinoa salad — should I add more protein?" },
    { role: 'assistant', text: "You're at 78g protein with the salad. Your target is 120g, so I'd add a small portion of grilled chicken (~25g) or extra chickpeas if you're plant-based. Want me to adjust the recipe?", actions: ['Add chicken', 'Add chickpeas', 'Keep as is'] },
    { role: 'user', text: "Let's add chicken." },
    { role: 'assistant', text: "Done — I've updated today's plan. Your new total is 103g protein. You're on track. 🌱" },
  ];
  return (
    <div className="page coach-page">
      <div className="coach-frame">
        <div className="coach-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="coach-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
            </div>
            <div>
              <div style={{ font: '600 15px/1.2 var(--font-sans)' }}>GreenoFig Coach</div>
              <div style={{ font: '400 12px/1.2 var(--font-sans)', color: '#16a34a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }}/>
                Online · 5 messages remaining today
              </div>
            </div>
          </div>
          <button className="link-btn">Clear chat</button>
        </div>

        <div className="coach-body">
          {messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.role}`}>
              {m.role === 'assistant' && (
                <div className="msg-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
                </div>
              )}
              <div className="msg-bubble">
                <div>{m.text}</div>
                {m.actions && (
                  <div className="msg-actions">
                    {m.actions.map((a) => <button key={a} className="msg-action">{a}</button>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="coach-input">
          <button className="ic-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></button>
          <input placeholder="Ask about nutrition, recipes, or your plan..." />
          <button className="send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
          </button>
        </div>
        <div style={{ textAlign: 'center', font: '400 11px/1 var(--font-sans)', color: '#94a3b8', marginTop: 8 }}>
          Always consult a healthcare professional for medical advice.
        </div>
      </div>
    </div>
  );
}

window.AICoach = AICoach;
