// Messages — nutritionist conversation thread.
function Messages() {
  return (
    <div className="page">
      <div className="card msg-page">
        <div className="msg-list">
          <div className="msg-list-head">Conversations</div>
          {[
            { name: 'Dr. Layla Hassan', preview: "Great work on this week's logs!", time: '2m', unread: 2, active: true },
            { name: 'Coach Maria', preview: 'New workout plan attached', time: '1h', unread: 0 },
            { name: 'Support', preview: 'Your premium starts tomorrow', time: '1d', unread: 0 },
          ].map((c, i) => (
            <div key={c.name} className={`conv ${c.active ? 'conv-active' : ''}`}>
              <div className="conv-avatar" style={{ background: ['#84cc16','#f59e0b','#0ea5e9'][i] }}>
                {c.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ font: '600 13px/1.2 var(--font-sans)' }}>{c.name}</span>
                  <span style={{ font: '400 11px/1 var(--font-sans)', color: '#94a3b8' }}>{c.time}</span>
                </div>
                <div style={{ font: '400 12px/1.4 var(--font-sans)', color: '#64748b', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</div>
              </div>
              {c.unread > 0 && <span className="conv-badge">{c.unread}</span>}
            </div>
          ))}
        </div>

        <div className="msg-thread">
          <div className="msg-thread-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="conv-avatar" style={{ background: '#84cc16' }}>LH</div>
              <div>
                <div style={{ font: '600 15px/1.2 var(--font-sans)' }}>Dr. Layla Hassan</div>
                <div style={{ font: '400 12px/1 var(--font-sans)', color: '#16a34a', marginTop: 2 }}>● Online</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="ic-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
              <button className="ic-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg></button>
            </div>
          </div>

          <div className="msg-thread-body">
            <div className="msg-day-divider"><span>Today</span></div>
            <div className="thread-msg thread-them">
              <div className="msg-bubble">Hi Sarah! I reviewed your last week's logs. You're crushing the protein targets and your sleep has improved by 40 minutes. Real progress.</div>
              <div className="msg-time">10:24 AM</div>
            </div>
            <div className="thread-msg thread-me">
              <div className="msg-bubble msg-bubble-me">Thank you! The salmon recipe was amazing. Can we add more fish dishes next week?</div>
              <div className="msg-time">10:26 AM</div>
            </div>
            <div className="thread-msg thread-them">
              <div className="msg-bubble">Absolutely. I'll plan three fish dinners and a couple of tinned-fish lunches for variety. Sending Wed's plan tonight.</div>
              <div className="msg-time">10:28 AM</div>
            </div>
          </div>

          <div className="coach-input" style={{ borderRadius: 0, borderTop: '1px solid #e2e8f0', borderBottom: 0, marginTop: 0 }}>
            <button className="ic-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
            <input placeholder="Message Dr. Layla..." />
            <button className="send-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Messages = Messages;
