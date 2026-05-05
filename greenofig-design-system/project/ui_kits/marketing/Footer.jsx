// Footer with giant GREENOFIG wordmark reveal.
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#" className="footer-brand-link" style={{ marginBottom: 16 }}>
              <img src="../../assets/logo.png" alt="" style={{ height: 40 }} />
              <span style={{ font: '700 22px/1 var(--font-sans)', color: '#fafaf7', letterSpacing: '-0.02em' }}>
                Greeno<span className="grad">Fig</span>
              </span>
            </a>
            <p style={{ font: '400 14px/1.6 var(--font-sans)', color: 'rgba(250,250,247,0.55)', maxWidth: 260 }}>
              Personalized nutrition that works. Built around you by a real nutritionist — for real, sustainable results.
            </p>
            <div className="social-row">
              {['fb','tw','ig','in'].map((s) => <SocialIcon key={s} name={s} />)}
            </div>
          </div>
          <FootCol title="Practice" items={['Consultations','Meal Plans','Pricing','Reviews','FAQ']} />
          <FootCol title="About" items={['Meet Layla','Approach','Blog','Press','Contact']} />
          <FootCol title="Legal" items={['Terms','Privacy','Disclaimer','Refunds','Cookies']} />
        </div>

        <div className="footer-meta">
          <span>© 2026 GreenoFig — All rights reserved.</span>
          <span>Made with care in Dubai.</span>
        </div>
      </div>

      <div className="footer-wordmark-wrap" aria-hidden="true">
        <div className="footer-wordmark">GREENOFIG</div>
      </div>
    </footer>
  );
}

function FootCol({ title, items }) {
  return (
    <div className="foot-col">
      <div className="foot-col-title">{title}</div>
      <ul>
        {items.map((it) => <li key={it}><a href="#">{it}</a></li>)}
      </ul>
    </div>
  );
}

function SocialIcon({ name }) {
  const icons = {
    fb: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v6.9A10 10 0 0 0 22 12z"/></svg>,
    tw: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 3H21l-6.5 7.4L22 21h-6l-4.7-6.2L5.8 21H3l7-8L2.5 3h6.2l4.3 5.7L18.2 3z"/></svg>,
    ig: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>,
    in: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.3 18H5.7V9.7h2.6V18zM7 8.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18.3 18h-2.6v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V18h-2.6V9.7h2.5v1.1a2.7 2.7 0 0 1 2.5-1.4c2.6 0 3.1 1.7 3.1 4V18z"/></svg>,
  };
  return <a href="#" className="social-icon" aria-label={name}>{icons[name]}</a>;
}

window.Footer = Footer;
